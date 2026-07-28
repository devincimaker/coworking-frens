import { prisma } from "@/lib/prisma";
import { friendIdsOf } from "@/lib/friends";
import { addDays, currentTimeBA, todayBA, weekdayOf } from "@/lib/tz";

export const MATERIALIZE_HORIZON_DAYS = 21; // 3 weeks, per spec

/** Audience rows are materialized for fast visibility checks, then kept in sync while days are open. */
async function resolveAudience(hostId: string, circleId: string | null): Promise<string[]> {
  if (circleId) {
    const members = await prisma.circleMember.findMany({
      where: { circleId, circle: { ownerId: hostId } },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
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
  ruleId?: string;
}) {
  const place = await prisma.place.findUnique({ where: { hostId: opts.hostId } });
  if (!place) throw new Error("Set up your place first");
  const audience = await resolveAudience(opts.hostId, opts.circleId);
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

/** Keep open all-friends days aligned with the host's current friend list. */
export async function syncOpenAllFriendsDayAudiences() {
  const days = await prisma.coworkDay.findMany({
    where: {
      circleId: null,
      status: "open",
      date: { gte: todayBA() },
    },
    select: {
      id: true,
      hostId: true,
      audience: { select: { userId: true } },
    },
  });
  const audienceByHost = new Map<string, string[]>();
  for (const day of days) {
    let audience = audienceByHost.get(day.hostId);
    if (!audience) {
      audience = await friendIdsOf(day.hostId);
      audienceByHost.set(day.hostId, audience);
    }
    await addMissingAudienceRows([day], audience);
  }
}

/** Create missing CoworkDay instances for the next 3 weeks for all active rules (idempotent). */
export async function materializeRules() {
  await syncOpenAllFriendsDayAudiences();

  const rules = await prisma.availabilityRule.findMany({
    where: { active: true, host: { place: { isNot: null } } },
  });
  const today = todayBA();
  const nowTime = currentTimeBA();
  for (const rule of rules) {
    const weekdays = new Set(rule.weekdays.split(",").map(Number));
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
      await addMissingAudienceRows(existing, await resolveAudience(rule.hostId, rule.circleId));
    }

    for (let i = 0; i <= MATERIALIZE_HORIZON_DAYS; i++) {
      const date = addDays(today, i);
      if (date === today && rule.endTime <= nowTime) continue;
      if (!weekdays.has(weekdayOf(date)) || have.has(date)) continue;
      await createDay({
        hostId: rule.hostId,
        date,
        startTime: rule.startTime,
        endTime: rule.endTime,
        capacity: rule.capacity,
        description: rule.description,
        circleId: rule.circleId,
        ruleId: rule.id,
      });
      have.add(date);
    }
  }
}
