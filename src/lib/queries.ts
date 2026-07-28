import { prisma } from "@/lib/prisma";
import { friendIdsOf } from "@/lib/friends";
import { todayBA } from "@/lib/tz";

export const dayInclude = {
  host: { select: { id: true, name: true, image: true, email: true } },
  circle: { select: { id: true, name: true } },
  place: { include: { photos: { orderBy: { sortOrder: "asc" as const } } } },
  attendances: {
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { joinedAt: "asc" as const },
  },
} satisfies object;

/** Upcoming open days the user can see: their own hosted days + days whose audience includes them. */
export async function feedDays(userId: string) {
  return prisma.coworkDay.findMany({
    where: {
      status: "open",
      date: { gte: todayBA() },
      OR: [{ hostId: userId }, { audience: { some: { userId } } }],
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: dayInclude,
  });
}

/** A single day, only if the user is allowed to see it (host or in audience). */
export async function dayForUser(dayId: string, userId: string) {
  return prisma.coworkDay.findFirst({
    where: {
      id: dayId,
      OR: [{ hostId: userId }, { audience: { some: { userId } } }],
    },
    include: {
      ...dayInclude,
      rule: { include: { circle: { select: { id: true, name: true } } } },
    },
  });
}

/**
 * Everything /host renders in one round trip: the place, the recurring rules
 * (with how many days each one currently holds open), the open days, how many
 * friends would hear about a new day, and the invite link shown when that's zero.
 */
export async function hostData(userId: string) {
  const today = todayBA();
  const [place, rules, days, friendIds, user] = await Promise.all([
    prisma.place.findUnique({
      where: { hostId: userId },
      include: { photos: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.availabilityRule.findMany({
      where: { hostId: userId },
      include: {
        circle: { select: { id: true, name: true } },
        _count: { select: { days: { where: { status: "open", date: { gte: today } } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.coworkDay.findMany({
      where: { hostId: userId, date: { gte: today }, status: "open" },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: dayInclude,
    }),
    friendIdsOf(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { inviteToken: true } }),
  ]);
  return { place, rules, days, friendCount: friendIds.length, inviteToken: user?.inviteToken ?? "" };
}

export async function circlesOf(userId: string) {
  return prisma.circle.findMany({
    where: { ownerId: userId },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}
