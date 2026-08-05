import { prisma } from "@/lib/prisma";
import { friendIdsOf } from "@/lib/friends";
import { pastDayWhere, upcomingDayWhere } from "@/lib/day-window";

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
      ...upcomingDayWhere(),
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
  const upcoming = upcomingDayWhere();
  const [place, rules, days, friendIds, user] = await Promise.all([
    prisma.place.findUnique({
      where: { hostId: userId },
      include: { photos: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.availabilityRule.findMany({
      where: { hostId: userId },
      include: {
        circle: { select: { id: true, name: true } },
        _count: { select: { days: { where: { status: "open", ...upcoming } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.coworkDay.findMany({
      where: { hostId: userId, status: "open", ...upcoming },
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

/**
 * How many juntadas each of these people has already held.
 *
 * A count and nothing else — no dates, no places, no who-was-there — which is
 * why it is safe to show about somebody you are not friends with yet, and why
 * it is the number on a request card: "this person actually hosts" is the whole
 * question when you are deciding whether to let them in. Anything sharper than
 * an aggregate (that they have a day open on Friday) would leak a juntada that
 * may well have been opened to one private circle, so it is deliberately absent.
 *
 * A juntada counts as received only if it actually happened *and* somebody
 * turned up for it: a day nobody claimed a spot on was an open door into an
 * empty room, and counting it would let anyone inflate the number by opening
 * days on a calendar. joinDay refuses the host their own day, so every row in
 * `attendances` is a guest — `some: {}` is exactly "alguien dijo que iba".
 *
 * Past and not cancelled, for the same reason: neither a cancelled day nor one
 * still to come has received anyone.
 */
export async function hostedJuntadasFor(personIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (personIds.length === 0) return counts;

  const rows = await prisma.coworkDay.groupBy({
    by: ["hostId"],
    where: {
      hostId: { in: personIds },
      status: "open",
      ...pastDayWhere(),
      attendances: { some: {} },
    },
    _count: { _all: true },
  });
  for (const row of rows) counts.set(row.hostId, row._count._all);
  return counts;
}
