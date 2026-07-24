import { prisma } from "@/lib/prisma";

export const FRIEND_REQUEST_PENDING = "pending";
export const FRIEND_REQUEST_ACCEPTED = "accepted";
export const FRIEND_REQUEST_DECLINED = "declined";

export type FriendConnectionState =
  | { kind: "self" }
  | { kind: "friends" }
  | { kind: "incoming_pending"; requestId: string }
  | { kind: "outgoing_pending"; requestId: string }
  | { kind: "incoming_declined"; requestId: string }
  | { kind: "outgoing_declined"; requestId: string }
  | { kind: "none" };

type FriendStore = Pick<typeof prisma, "friendship" | "friendRequest">;

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

    return true;
  });
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

    if (request.status === FRIEND_REQUEST_DECLINED && states.get(otherId)?.kind === "none") {
      states.set(otherId, {
        kind: request.requesterId === userId ? "outgoing_declined" : "incoming_declined",
        requestId: request.id,
      });
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
            createdAt: new Date(),
          },
        })
      : await tx.friendRequest.create({
          data: { requesterId, recipientId, coworkDayId, status: FRIEND_REQUEST_PENDING },
        });

    return { outcome: "requested" as const, day, request };
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
  const include = {
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
  };

  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { recipientId: userId, status: FRIEND_REQUEST_PENDING },
      include,
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: {
        requesterId: userId,
        status: { in: [FRIEND_REQUEST_PENDING, FRIEND_REQUEST_DECLINED] },
      },
      include,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { incoming, outgoing };
}
