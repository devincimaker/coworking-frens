import { prisma } from "@/lib/prisma";
import { todayBA } from "@/lib/tz";

export const FRIEND_REQUEST_PENDING = "pending";
export const FRIEND_REQUEST_ACCEPTED = "accepted";
export const FRIEND_REQUEST_DECLINED = "declined";

export type MutualFriend = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

/**
 * A request you sent and they turned down has no state of its own: it reads as
 * "none", exactly like never having asked. Being told you were rejected is a
 * small humiliation the product has no use for, and the row still exists in the
 * database, so asking again quietly reopens it. Collapsed here rather than in
 * each screen so no future screen can leak it back.
 */
export type FriendConnectionState =
  | { kind: "self" }
  | { kind: "friends" }
  | { kind: "incoming_pending"; requestId: string }
  | { kind: "outgoing_pending"; requestId: string }
  | { kind: "incoming_declined"; requestId: string }
  | { kind: "none" };

type OpenAudienceStore = Pick<typeof prisma, "coworkDay" | "dayAudience">;
type FriendStore = Pick<typeof prisma, "friendship" | "friendRequest"> & OpenAudienceStore;

const friendRequestPeopleAndDay = {
  requester: { select: { id: true, name: true, username: true, email: true, image: true } },
  recipient: { select: { id: true, name: true, username: true, email: true, image: true } },
  coworkDay: {
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      place: { select: { nickname: true } },
    },
  },
} as const;

export function friendshipPair(u1: string, u2: string): [string, string] {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

async function upsertFriendship(db: FriendStore, u1: string, u2: string) {
  const [aId, bId] = friendshipPair(u1, u2);
  await db.friendship.upsert({
    where: { aId_bId: { aId, bId } },
    update: {},
    create: { aId, bId },
  });
  await db.friendRequest.updateMany({
    where: {
      OR: [
        { requesterId: u1, recipientId: u2 },
        { requesterId: u2, recipientId: u1 },
      ],
      status: { not: FRIEND_REQUEST_ACCEPTED },
    },
    data: { status: FRIEND_REQUEST_ACCEPTED, respondedAt: new Date() },
  });
  await addOpenAllFriendsAudience(db, u1, u2);
  await addOpenAllFriendsAudience(db, u2, u1);
}

async function addOpenAllFriendsAudience(
  db: OpenAudienceStore,
  hostId: string,
  friendId: string
) {
  const days = await db.coworkDay.findMany({
    where: {
      hostId,
      circleId: null,
      status: "open",
      date: { gte: todayBA() },
    },
    select: { id: true },
  });
  if (days.length === 0) return;

  await db.dayAudience.createMany({
    data: days.map((day) => ({ dayId: day.id, userId: friendId })),
    skipDuplicates: true,
  });
}

async function removeOpenAllFriendsAudience(
  db: OpenAudienceStore,
  hostId: string,
  friendId: string
) {
  const days = await db.coworkDay.findMany({
    where: {
      hostId,
      circleId: null,
      status: "open",
      date: { gte: todayBA() },
    },
    select: { id: true },
  });
  if (days.length === 0) return;

  await db.dayAudience.deleteMany({
    where: {
      dayId: { in: days.map((day) => day.id) },
      userId: friendId,
    },
  });
}

export async function friendIdsOf(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ aId: userId }, { bId: userId }] },
    select: { aId: true, bId: true },
  });
  return rows.map((r) => (r.aId === userId ? r.bId : r.aId));
}

export async function friendsOf(userId: string) {
  const ids = await friendIdsOf(userId);
  return prisma.user.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, username: true, email: true, image: true, bio: true },
  });
}

export async function areFriends(u1: string, u2: string): Promise<boolean> {
  const [aId, bId] = friendshipPair(u1, u2);
  const row = await prisma.friendship.findUnique({ where: { aId_bId: { aId, bId } } });
  return row !== null;
}

export async function makeFriends(u1: string, u2: string) {
  if (u1 === u2) return;
  await prisma.$transaction((tx) => upsertFriendship(tx, u1, u2));
}

export async function removeFriendForUser(userId: string, friendId: string) {
  if (userId === friendId) throw new Error("Cannot remove yourself");
  const [aId, bId] = friendshipPair(userId, friendId);

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.friendship.deleteMany({ where: { aId, bId } });
    if (deleted.count === 0) return false;

    await tx.circleMember.deleteMany({
      where: {
        OR: [
          { circle: { ownerId: userId }, userId: friendId },
          { circle: { ownerId: friendId }, userId },
        ],
      },
    });
    await tx.friendRequest.deleteMany({
      where: {
        OR: [
          { requesterId: userId, recipientId: friendId },
          { requesterId: friendId, recipientId: userId },
        ],
      },
    });
    await removeOpenAllFriendsAudience(tx, userId, friendId);
    await removeOpenAllFriendsAudience(tx, friendId, userId);

    return true;
  });
}

// The intersection of the viewer's friends with each other person's — never that
// person's own list, which is not the viewer's to see. Batched alongside
// friendConnectionStates: callers resolve a list of people at once.
export async function mutualFriends(
  userId: string,
  otherIds: string[]
): Promise<Map<string, MutualFriend[]>> {
  const peerIds = Array.from(new Set(otherIds)).filter((id) => id !== userId);
  const mutuals = new Map<string, MutualFriend[]>(peerIds.map((id) => [id, []]));
  if (peerIds.length === 0) return mutuals;

  const viewerFriendIds = await friendIdsOf(userId);
  if (viewerFriendIds.length === 0) return mutuals;

  const rows = await prisma.friendship.findMany({
    where: {
      OR: [
        { aId: { in: peerIds }, bId: { in: viewerFriendIds } },
        { bId: { in: peerIds }, aId: { in: viewerFriendIds } },
      ],
    },
    select: { aId: true, bId: true },
  });

  const peerIdSet = new Set(peerIds);
  const viewerFriendIdSet = new Set(viewerFriendIds);
  const peersByMutual = new Map<string, string[]>();
  const credit = (mutualId: string, peerId: string) => {
    const peers = peersByMutual.get(mutualId);
    if (peers) peers.push(peerId);
    else peersByMutual.set(mutualId, [peerId]);
  };

  for (const row of rows) {
    // A single row satisfies both sides when two of the requested people are
    // friends with each other and with the viewer, so each side is credited apart.
    if (peerIdSet.has(row.aId) && viewerFriendIdSet.has(row.bId)) credit(row.bId, row.aId);
    if (peerIdSet.has(row.bId) && viewerFriendIdSet.has(row.aId)) credit(row.aId, row.bId);
  }
  if (peersByMutual.size === 0) return mutuals;

  const people = await prisma.user.findMany({
    where: { id: { in: Array.from(peersByMutual.keys()) } },
    orderBy: [{ name: "asc" }, { username: "asc" }],
    select: { id: true, name: true, username: true, image: true },
  });

  // Walking the sorted rows once leaves every per-person list sorted too.
  for (const person of people) {
    for (const peerId of peersByMutual.get(person.id) ?? []) {
      mutuals.get(peerId)?.push(person);
    }
  }

  return mutuals;
}

export async function friendConnectionStates(
  userId: string,
  otherIds: string[]
): Promise<Map<string, FriendConnectionState>> {
  const ids = Array.from(new Set(otherIds));
  const states = new Map<string, FriendConnectionState>(
    ids.map((id) => [id, id === userId ? { kind: "self" } : { kind: "none" }])
  );
  const peerIds = ids.filter((id) => id !== userId);
  if (peerIds.length === 0) return states;

  const [friendships, requests] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        OR: [
          { aId: userId, bId: { in: peerIds } },
          { bId: userId, aId: { in: peerIds } },
        ],
      },
      select: { aId: true, bId: true },
    }),
    prisma.friendRequest.findMany({
      where: {
        OR: [
          { requesterId: userId, recipientId: { in: peerIds } },
          { recipientId: userId, requesterId: { in: peerIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, requesterId: true, recipientId: true, status: true },
    }),
  ]);

  for (const friendship of friendships) {
    states.set(friendship.aId === userId ? friendship.bId : friendship.aId, { kind: "friends" });
  }

  for (const request of requests) {
    const otherId = request.requesterId === userId ? request.recipientId : request.requesterId;
    if (states.get(otherId)?.kind === "friends") continue;

    if (request.status === FRIEND_REQUEST_ACCEPTED) {
      states.set(otherId, { kind: "friends" });
      continue;
    }

    if (request.status === FRIEND_REQUEST_PENDING) {
      states.set(otherId, {
        kind: request.requesterId === userId ? "outgoing_pending" : "incoming_pending",
        requestId: request.id,
      });
      continue;
    }

    // Only the side that did the declining hears about it. The one who asked is
    // left at "none" — see FriendConnectionState.
    if (
      request.status === FRIEND_REQUEST_DECLINED &&
      request.recipientId === userId &&
      states.get(otherId)?.kind === "none"
    ) {
      states.set(otherId, { kind: "incoming_declined", requestId: request.id });
    }
  }

  return states;
}

export async function requestFriendFromSharedDay({
  requesterId,
  recipientId,
  coworkDayId,
}: {
  requesterId: string;
  recipientId: string;
  coworkDayId: string;
}) {
  if (requesterId === recipientId) throw new Error("Cannot request yourself");

  return prisma.$transaction(async (tx) => {
    const day = await tx.coworkDay.findUnique({
      where: { id: coworkDayId },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        place: { select: { nickname: true } },
      },
    });
    if (!day) throw new Error("Day not found");

    const attendanceRows = await tx.attendance.findMany({
      where: { dayId: coworkDayId, userId: { in: [requesterId, recipientId] } },
      select: { userId: true },
    });
    if (new Set(attendanceRows.map((row) => row.userId)).size !== 2) {
      throw new Error("Users do not share this day");
    }

    const [aId, bId] = friendshipPair(requesterId, recipientId);
    const friendship = await tx.friendship.findUnique({ where: { aId_bId: { aId, bId } } });
    if (friendship) return { outcome: "already_friends" as const, day, request: null };

    const incoming = await tx.friendRequest.findUnique({
      where: { requesterId_recipientId: { requesterId: recipientId, recipientId: requesterId } },
    });
    if (incoming?.status === FRIEND_REQUEST_PENDING) {
      return { outcome: "incoming_pending" as const, day, request: incoming };
    }
    if (incoming?.status === FRIEND_REQUEST_ACCEPTED) {
      await upsertFriendship(tx, requesterId, recipientId);
      return { outcome: "already_friends" as const, day, request: incoming };
    }

    const outgoing = await tx.friendRequest.findUnique({
      where: { requesterId_recipientId: { requesterId, recipientId } },
    });

    if (outgoing?.status === FRIEND_REQUEST_PENDING) {
      return { outcome: "pending" as const, day, request: outgoing };
    }
    if (outgoing?.status === FRIEND_REQUEST_ACCEPTED) {
      await upsertFriendship(tx, requesterId, recipientId);
      return { outcome: "already_friends" as const, day, request: outgoing };
    }

    const request = outgoing
      ? await tx.friendRequest.update({
          where: { id: outgoing.id },
          data: {
            status: FRIEND_REQUEST_PENDING,
            coworkDayId,
            respondedAt: null,
            juntadasShownAt: null,
            friendsShownAt: null,
            createdAt: new Date(),
          },
        })
      : await tx.friendRequest.create({
          data: { requesterId, recipientId, coworkDayId, status: FRIEND_REQUEST_PENDING },
        });

    return { outcome: "requested" as const, day, request };
  });
}

export async function requestFriendGlobally({
  requesterId,
  recipientId,
}: {
  requesterId: string;
  recipientId: string;
}) {
  if (requesterId === recipientId) throw new Error("Cannot request yourself");

  return prisma.$transaction(async (tx) => {
    const recipient = await tx.user.findFirst({
      where: { id: recipientId, onboardedAt: { not: null } },
      select: { id: true, name: true, email: true },
    });
    if (!recipient) throw new Error("User not found");

    const [aId, bId] = friendshipPair(requesterId, recipientId);
    const friendship = await tx.friendship.findUnique({ where: { aId_bId: { aId, bId } } });
    if (friendship) return { outcome: "already_friends" as const, recipient, request: null };

    const incoming = await tx.friendRequest.findUnique({
      where: { requesterId_recipientId: { requesterId: recipientId, recipientId: requesterId } },
    });
    if (incoming?.status === FRIEND_REQUEST_PENDING) {
      return { outcome: "incoming_pending" as const, recipient, request: incoming };
    }
    if (incoming?.status === FRIEND_REQUEST_ACCEPTED) {
      await upsertFriendship(tx, requesterId, recipientId);
      return { outcome: "already_friends" as const, recipient, request: incoming };
    }

    const outgoing = await tx.friendRequest.findUnique({
      where: { requesterId_recipientId: { requesterId, recipientId } },
    });

    if (outgoing?.status === FRIEND_REQUEST_PENDING) {
      return { outcome: "pending" as const, recipient, request: outgoing };
    }
    if (outgoing?.status === FRIEND_REQUEST_ACCEPTED) {
      await upsertFriendship(tx, requesterId, recipientId);
      return { outcome: "already_friends" as const, recipient, request: outgoing };
    }

    const request = outgoing
      ? await tx.friendRequest.update({
          where: { id: outgoing.id },
          data: {
            status: FRIEND_REQUEST_PENDING,
            coworkDayId: null,
            respondedAt: null,
            juntadasShownAt: null,
            friendsShownAt: null,
            createdAt: new Date(),
          },
        })
      : await tx.friendRequest.create({
          data: { requesterId, recipientId, status: FRIEND_REQUEST_PENDING },
        });

    return { outcome: "requested" as const, recipient, request };
  });
}

export async function acceptFriendRequestForUser(requestId: string, recipientId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.friendRequest.findFirst({
      where: { id: requestId, recipientId, status: FRIEND_REQUEST_PENDING },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
      },
    });
    if (!request) throw new Error("Friend request not found");

    await upsertFriendship(tx, request.requesterId, request.recipientId);
    const accepted = await tx.friendRequest.update({
      where: { id: request.id },
      data: { status: FRIEND_REQUEST_ACCEPTED, respondedAt: new Date() },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
      },
    });

    return accepted;
  });
}

export async function declineFriendRequestForUser(requestId: string, recipientId: string) {
  const request = await prisma.friendRequest.findFirst({
    where: { id: requestId, recipientId, status: FRIEND_REQUEST_PENDING },
    select: { id: true },
  });
  if (!request) throw new Error("Friend request not found");

  await prisma.friendRequest.update({
    where: { id: request.id },
    data: { status: FRIEND_REQUEST_DECLINED, respondedAt: new Date() },
  });
}

export async function friendRequestsForUser(userId: string) {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { recipientId: userId, status: FRIEND_REQUEST_PENDING },
      include: friendRequestPeopleAndDay,
      orderBy: { createdAt: "desc" },
    }),
    // Pending only: a request they turned down is not something you are still
    // waiting on, and naming it would only tell you that you were rejected.
    prisma.friendRequest.findMany({
      where: { requesterId: userId, status: FRIEND_REQUEST_PENDING },
      include: friendRequestPeopleAndDay,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { incoming, outgoing };
}

export async function unseenIncomingFriendRequestCount(userId: string) {
  return prisma.friendRequest.count({
    where: {
      recipientId: userId,
      status: FRIEND_REQUEST_PENDING,
      friendsShownAt: null,
    },
  });
}

export async function markFriendRequestsShownInFriends(requestIds: string[], recipientId: string) {
  if (requestIds.length === 0) return;

  await prisma.friendRequest.updateMany({
    where: {
      id: { in: requestIds },
      recipientId,
      status: FRIEND_REQUEST_PENDING,
      friendsShownAt: null,
    },
    data: { friendsShownAt: new Date() },
  });
}

export async function postponeFriendRequestForUser(requestId: string, recipientId: string) {
  const postponedAt = new Date();

  await prisma.friendRequest.updateMany({
    where: {
      id: requestId,
      recipientId,
      status: FRIEND_REQUEST_PENDING,
    },
    data: {
      juntadasShownAt: postponedAt,
      friendsShownAt: postponedAt,
    },
  });
}

export async function unseenJuntadasFriendRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: {
      recipientId: userId,
      status: FRIEND_REQUEST_PENDING,
      juntadasShownAt: null,
    },
    include: friendRequestPeopleAndDay,
    orderBy: { createdAt: "desc" },
    take: 2,
  });
}

export async function markFriendRequestsShownInJuntadas(requestIds: string[], recipientId: string) {
  if (requestIds.length === 0) return;

  await prisma.friendRequest.updateMany({
    where: {
      id: { in: requestIds },
      recipientId,
      status: FRIEND_REQUEST_PENDING,
      juntadasShownAt: null,
    },
    data: { juntadasShownAt: new Date() },
  });
}
