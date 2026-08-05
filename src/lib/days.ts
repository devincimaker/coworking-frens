import { prisma } from "@/lib/prisma";
import { extendedFriendIdsOf, friendIdsOf } from "@/lib/friends";
import { AUDIENCE_FRIENDS, AUDIENCE_FRIENDS_OF_FRIENDS } from "@/lib/audience";
import { addDays, currentTimeBA, todayBA, weekdayOf } from "@/lib/tz";
import { hasEnded, upcomingDayWhere } from "@/lib/day-window";

export const MATERIALIZE_HORIZON_DAYS = 21; // 3 weeks, per spec

/** Audience rows are materialized for fast visibility checks, then kept in sync while days are open. */
async function resolveAudience(
  hostId: string,
  audienceKind: string,
  circleId: string | null
): Promise<string[]> {
  if (circleId) {
    const members = await prisma.circleMember.findMany({
      where: { circleId, circle: { ownerId: hostId } },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
  if (audienceKind === AUDIENCE_FRIENDS_OF_FRIENDS) return extendedFriendIdsOf(hostId);
  return friendIdsOf(hostId);
}

export async function createDay(opts: {
  hostId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  description?: string;
  circleId: string | null;
  audienceKind?: string;
  ruleId?: string;
}) {
  const place = await prisma.place.findUnique({ where: { hostId: opts.hostId } });
  if (!place) throw new Error("Set up your place first");
  const audienceKind = opts.audienceKind ?? AUDIENCE_FRIENDS;
  const audience = await resolveAudience(opts.hostId, audienceKind, opts.circleId);
  return prisma.coworkDay.create({
    data: {
      hostId: opts.hostId,
      placeId: place.id,
      date: opts.date,
      startTime: opts.startTime,
      endTime: opts.endTime,
      capacity: opts.capacity,
      description: opts.description ?? "",
      ruleId: opts.ruleId,
      circleId: opts.circleId,
      audienceKind,
      audience: { create: audience.map((userId) => ({ userId })) },
    },
    include: { audience: { include: { user: true } }, host: true, place: true },
  });
}

type AudienceDay = {
  id: string;
  hostId?: string;
  status?: string;
  audience: { userId: string }[];
};

async function addMissingAudienceRows(days: AudienceDay[], audience: string[]) {
  for (const day of days) {
    if (day.status && day.status !== "open") continue;
    const currentAudience = new Set(day.audience.map((a) => a.userId));
    const missing = audience.filter((userId) => !currentAudience.has(userId));
    if (missing.length === 0) continue;
    await prisma.dayAudience.createMany({
      data: missing.map((userId) => ({ dayId: day.id, userId })),
      skipDuplicates: true,
    });
  }
}

/** Keep open non-circle days aligned with the host's current reach (friends, or friends of friends). */
export async function syncOpenDayAudiences() {
  const days = await prisma.coworkDay.findMany({
    where: {
      circleId: null,
      status: "open",
      ...upcomingDayWhere(),
    },
    select: {
      id: true,
      hostId: true,
      audienceKind: true,
      audience: { select: { userId: true } },
    },
  });
  const audienceByHostKind = new Map<string, string[]>();
  for (const day of days) {
    const cacheKey = `${day.hostId}:${day.audienceKind}`;
    let audience = audienceByHostKind.get(cacheKey);
    if (!audience) {
      audience = await resolveAudience(day.hostId, day.audienceKind, null);
      audienceByHostKind.set(cacheKey, audience);
    }
    await addMissingAudienceRows([day], audience);
  }
}

/** Create missing CoworkDay instances for the next 3 weeks for all active rules (idempotent). */
export async function materializeRules() {
  await syncOpenDayAudiences();

  const rules = await prisma.availabilityRule.findMany({
    where: { active: true, host: { place: { isNot: null } } },
  });
  const today = todayBA();
  const nowTime = currentTimeBA();
  for (const rule of rules) {
    const weekdays = new Set(rule.weekdays.split(",").map(Number));
    // Deliberately by date alone, not upcomingDayWhere: this asks which
    // instances already exist so the loop below does not duplicate them, which
    // includes today's even after it has ended. Narrowing it to upcoming days
    // would drop today's out of `have` and invite a duplicate.
    const existing = await prisma.coworkDay.findMany({
      where: { ruleId: rule.id, date: { gte: today } },
      select: {
        id: true,
        date: true,
        status: true,
        audience: { select: { userId: true } },
      },
    });
    const have = new Set(existing.map((d) => d.date));

    if (rule.circleId) {
      await addMissingAudienceRows(
        existing,
        await resolveAudience(rule.hostId, rule.audienceKind, rule.circleId)
      );
    }

    for (let i = 0; i <= MATERIALIZE_HORIZON_DAYS; i++) {
      const date = addDays(today, i);
      if (hasEnded(date, rule.endTime, today, nowTime)) continue;
      if (!weekdays.has(weekdayOf(date)) || have.has(date)) continue;
      await createDay({
        hostId: rule.hostId,
        date,
        startTime: rule.startTime,
        endTime: rule.endTime,
        capacity: rule.capacity,
        description: rule.description,
        circleId: rule.circleId,
        audienceKind: rule.audienceKind,
        ruleId: rule.id,
      });
      have.add(date);
    }
  }
}
