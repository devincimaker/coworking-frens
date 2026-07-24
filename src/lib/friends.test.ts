import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  attendance: {
    findMany: vi.fn(),
  },
  circleMember: {
    deleteMany: vi.fn(),
  },
  coworkDay: {
    findUnique: vi.fn(),
  },
  friendRequest: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  friendship: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  FRIEND_REQUEST_ACCEPTED,
  FRIEND_REQUEST_DECLINED,
  FRIEND_REQUEST_PENDING,
  acceptFriendRequestForUser,
  declineFriendRequestForUser,
  friendConnectionStates,
  friendshipPair,
  removeFriendForUser,
  requestFriendFromSharedDay,
} from "./friends";

const sharedDay = {
  id: "day_1",
  date: "2026-07-28",
  startTime: "09:00",
  endTime: "17:00",
  place: { nickname: "Casa Thames" },
};

describe("friend request helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (work) =>
      typeof work === "function" ? work(prismaMock) : Promise.all(work)
    );
  });

  it("normalizes friendship pairs lexicographically", () => {
    expect(friendshipPair("u_z", "u_a")).toEqual(["u_a", "u_z"]);
  });

  it("removes an existing friendship and private circle memberships", async () => {
    prismaMock.friendship.deleteMany.mockResolvedValue({ count: 1 });

    await expect(removeFriendForUser("me", "friend")).resolves.toBe(true);

    expect(prismaMock.friendship.deleteMany).toHaveBeenCalledWith({
      where: { aId: "friend", bId: "me" },
    });
    expect(prismaMock.circleMember.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { circle: { ownerId: "me" }, userId: "friend" },
          { circle: { ownerId: "friend" }, userId: "me" },
        ],
      },
    });
    expect(prismaMock.friendRequest.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { requesterId: "me", recipientId: "friend" },
          { requesterId: "friend", recipientId: "me" },
        ],
      },
    });
  });

  it("maps friend request states relative to the current user", async () => {
    prismaMock.friendship.findMany.mockResolvedValue([{ aId: "me", bId: "friend" }]);
    prismaMock.friendRequest.findMany.mockResolvedValue([
      { id: "accepted_1", requesterId: "accepted", recipientId: "me", status: FRIEND_REQUEST_ACCEPTED },
      { id: "incoming_1", requesterId: "incoming", recipientId: "me", status: FRIEND_REQUEST_PENDING },
      { id: "outgoing_1", requesterId: "me", recipientId: "outgoing", status: FRIEND_REQUEST_PENDING },
      { id: "declined_1", requesterId: "me", recipientId: "declined", status: FRIEND_REQUEST_DECLINED },
    ]);

    const states = await friendConnectionStates("me", [
      "me",
      "friend",
      "accepted",
      "incoming",
      "outgoing",
      "declined",
      "none",
    ]);

    expect(states.get("me")).toEqual({ kind: "self" });
    expect(states.get("friend")).toEqual({ kind: "friends" });
    expect(states.get("accepted")).toEqual({ kind: "friends" });
    expect(states.get("incoming")).toEqual({ kind: "incoming_pending", requestId: "incoming_1" });
    expect(states.get("outgoing")).toEqual({ kind: "outgoing_pending", requestId: "outgoing_1" });
    expect(states.get("declined")).toEqual({ kind: "outgoing_declined", requestId: "declined_1" });
    expect(states.get("none")).toEqual({ kind: "none" });
  });

  it("rejects friend requests when users do not share the coworking day", async () => {
    prismaMock.coworkDay.findUnique.mockResolvedValue(sharedDay);
    prismaMock.attendance.findMany.mockResolvedValue([{ userId: "me" }]);

    await expect(
      requestFriendFromSharedDay({
        requesterId: "me",
        recipientId: "other",
        coworkDayId: "day_1",
      })
    ).rejects.toThrow("Users do not share this day");

    expect(prismaMock.friendRequest.create).not.toHaveBeenCalled();
  });

  it("creates a pending request from a shared coworking day", async () => {
    const createdRequest = {
      id: "request_1",
      requesterId: "me",
      recipientId: "other",
      coworkDayId: "day_1",
      status: FRIEND_REQUEST_PENDING,
    };
    prismaMock.coworkDay.findUnique.mockResolvedValue(sharedDay);
    prismaMock.attendance.findMany.mockResolvedValue([{ userId: "me" }, { userId: "other" }]);
    prismaMock.friendship.findUnique.mockResolvedValue(null);
    prismaMock.friendRequest.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prismaMock.friendRequest.create.mockResolvedValue(createdRequest);

    const result = await requestFriendFromSharedDay({
      requesterId: "me",
      recipientId: "other",
      coworkDayId: "day_1",
    });

    expect(result).toEqual({ outcome: "requested", day: sharedDay, request: createdRequest });
    expect(prismaMock.friendRequest.create).toHaveBeenCalledWith({
      data: {
        requesterId: "me",
        recipientId: "other",
        coworkDayId: "day_1",
        status: FRIEND_REQUEST_PENDING,
      },
    });
  });

  it("reopens a declined outgoing request instead of creating a duplicate", async () => {
    const declinedRequest = {
      id: "request_1",
      requesterId: "me",
      recipientId: "other",
      coworkDayId: "day_old",
      status: FRIEND_REQUEST_DECLINED,
    };
    prismaMock.coworkDay.findUnique.mockResolvedValue(sharedDay);
    prismaMock.attendance.findMany.mockResolvedValue([{ userId: "me" }, { userId: "other" }]);
    prismaMock.friendship.findUnique.mockResolvedValue(null);
    prismaMock.friendRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(declinedRequest);
    prismaMock.friendRequest.update.mockResolvedValue({
      ...declinedRequest,
      coworkDayId: "day_1",
      status: FRIEND_REQUEST_PENDING,
      respondedAt: null,
    });

    const result = await requestFriendFromSharedDay({
      requesterId: "me",
      recipientId: "other",
      coworkDayId: "day_1",
    });

    expect(result.outcome).toBe("requested");
    expect(prismaMock.friendRequest.create).not.toHaveBeenCalled();
    expect(prismaMock.friendRequest.update).toHaveBeenCalledWith({
      where: { id: "request_1" },
      data: {
        status: FRIEND_REQUEST_PENDING,
        coworkDayId: "day_1",
        respondedAt: null,
        createdAt: expect.any(Date),
      },
    });
  });

  it("repairs the friendship when an outgoing request was already accepted", async () => {
    const acceptedRequest = {
      id: "request_1",
      requesterId: "me",
      recipientId: "other",
      coworkDayId: "day_old",
      status: FRIEND_REQUEST_ACCEPTED,
    };
    prismaMock.coworkDay.findUnique.mockResolvedValue(sharedDay);
    prismaMock.attendance.findMany.mockResolvedValue([{ userId: "me" }, { userId: "other" }]);
    prismaMock.friendship.findUnique.mockResolvedValue(null);
    prismaMock.friendRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(acceptedRequest);

    const result = await requestFriendFromSharedDay({
      requesterId: "me",
      recipientId: "other",
      coworkDayId: "day_1",
    });

    expect(result).toEqual({ outcome: "already_friends", day: sharedDay, request: acceptedRequest });
    expect(prismaMock.friendRequest.update).not.toHaveBeenCalled();
    expect(prismaMock.friendship.upsert).toHaveBeenCalledWith({
      where: { aId_bId: { aId: "me", bId: "other" } },
      update: {},
      create: { aId: "me", bId: "other" },
    });
  });

  it("accepts a pending request by creating the mutual friendship", async () => {
    prismaMock.friendRequest.findFirst.mockResolvedValue({
      id: "request_1",
      requesterId: "sender",
      recipientId: "me",
      requester: { id: "sender", name: "Sender", email: "sender@example.com" },
      recipient: { id: "me", name: "Me", email: "me@example.com" },
    });
    prismaMock.friendRequest.update.mockResolvedValue({
      id: "request_1",
      requesterId: "sender",
      recipientId: "me",
      status: FRIEND_REQUEST_ACCEPTED,
      requester: { id: "sender", name: "Sender", email: "sender@example.com" },
      recipient: { id: "me", name: "Me", email: "me@example.com" },
    });

    const accepted = await acceptFriendRequestForUser("request_1", "me");

    expect(accepted.status).toBe(FRIEND_REQUEST_ACCEPTED);
    expect(prismaMock.friendship.upsert).toHaveBeenCalledWith({
      where: { aId_bId: { aId: "me", bId: "sender" } },
      update: {},
      create: { aId: "me", bId: "sender" },
    });
    expect(prismaMock.friendRequest.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { requesterId: "sender", recipientId: "me" },
          { requesterId: "me", recipientId: "sender" },
        ],
        status: { not: FRIEND_REQUEST_ACCEPTED },
      },
      data: { status: FRIEND_REQUEST_ACCEPTED, respondedAt: expect.any(Date) },
    });
  });

  it("declines only pending requests addressed to the current user", async () => {
    prismaMock.friendRequest.findFirst.mockResolvedValue({ id: "request_1" });

    await declineFriendRequestForUser("request_1", "me");

    expect(prismaMock.friendRequest.findFirst).toHaveBeenCalledWith({
      where: { id: "request_1", recipientId: "me", status: FRIEND_REQUEST_PENDING },
      select: { id: true },
    });
    expect(prismaMock.friendRequest.update).toHaveBeenCalledWith({
      where: { id: "request_1" },
      data: { status: FRIEND_REQUEST_DECLINED, respondedAt: expect.any(Date) },
    });
  });
});
