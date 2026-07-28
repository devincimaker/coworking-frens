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

/** Create missing CoworkDay instances for the next 3 weeks for all active rules (idempotent). */
export async function materializeRules() {
  const rules = await prisma.availabilityRule.findMany({
    where: { active: true, host: { place: { isNot: null } } },
  });
  const today = todayBA();
  const nowTime = currentTimeBA();
  for (const rule of rules) {
    const weekdays = new Set(rule.weekdays.split(",").map(Number));
    const audience = await resolveAudience(rule.hostId, rule.circleId);
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

    for (const day of existing) {
      if (day.status !== "open") continue;
      const currentAudience = new Set(day.audience.map((a) => a.userId));
      const missing = audience.filter((userId) => !currentAudience.has(userId));
      if (missing.length === 0) continue;
      await prisma.dayAudience.createMany({
        data: missing.map((userId) => ({ dayId: day.id, userId })),
        skipDuplicates: true,
      });
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
