import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  attendance: {
    findMany: vi.fn(),
  },
  circleMember: {
    deleteMany: vi.fn(),
  },
  coworkDay: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  dayAudience: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  friendRequest: {
    count: vi.fn(),
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
    findFirst: vi.fn(),
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
  markFriendRequestsShownInFriends,
  markFriendRequestsShownInJuntadas,
  makeFriends,
  mutualFriends,
  postponeFriendRequestForUser,
  removeFriendForUser,
  requestFriendGlobally,
  requestFriendFromSharedDay,
  unseenIncomingFriendRequestCount,
  unseenJuntadasFriendRequests,
} from "./friends";

const sharedDay = {
  id: "day_1",
  date: "2026-07-28",
  startTime: "09:00",
  endTime: "17:00",
  place: { nickname: "Casa Thames" },
};

afterEach(() => {
  vi.useRealTimers();
});

describe("friend request helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (work) =>
      typeof work === "function" ? work(prismaMock) : Promise.all(work)
    );
    prismaMock.coworkDay.findMany.mockResolvedValue([]);
    prismaMock.dayAudience.createMany.mockResolvedValue({ count: 0 });
    prismaMock.dayAudience.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("normalizes friendship pairs lexicographically", () => {
    expect(friendshipPair("u_z", "u_a")).toEqual(["u_a", "u_z"]);
  });

  it("counts only unseen pending incoming requests for the navigation badge", async () => {
    prismaMock.friendRequest.count.mockResolvedValue(3);

    await expect(unseenIncomingFriendRequestCount("me")).resolves.toBe(3);
    expect(prismaMock.friendRequest.count).toHaveBeenCalledWith({
      where: {
        recipientId: "me",
        status: FRIEND_REQUEST_PENDING,
        friendsShownAt: null,
      },
    });
  });

  it("marks incoming requests as seen in Amigos without answering them", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T13:00:00Z"));

    await markFriendRequestsShownInFriends(["request_1", "request_2"], "me");

    expect(prismaMock.friendRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["request_1", "request_2"] },
        recipientId: "me",
        status: FRIEND_REQUEST_PENDING,
        friendsShownAt: null,
      },
      data: { friendsShownAt: new Date("2026-07-29T13:00:00Z") },
    });
  });

  it("postpones a request by acknowledging it in both Juntadas and Amigos", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T20:00:00Z"));

    await postponeFriendRequestForUser("request_1", "me");

    expect(prismaMock.friendRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: "request_1",
        recipientId: "me",
        status: FRIEND_REQUEST_PENDING,
      },
      data: {
        juntadasShownAt: new Date("2026-07-29T20:00:00Z"),
        friendsShownAt: new Date("2026-07-29T20:00:00Z"),
      },
    });
  });

  it("loads only pending requests not yet shown in Juntadas", async () => {
    prismaMock.friendRequest.findMany.mockResolvedValue([{ id: "request_1" }]);

    await expect(unseenJuntadasFriendRequests("me")).resolves.toEqual([
      { id: "request_1" },
    ]);
    expect(prismaMock.friendRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          recipientId: "me",
          status: FRIEND_REQUEST_PENDING,
          juntadasShownAt: null,
        },
        orderBy: { createdAt: "desc" },
        take: 2,
      })
    );
  });

  it("marks a shown batch without touching answered or already-shown requests", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    await markFriendRequestsShownInJuntadas(["request_1", "request_2"], "me");

    expect(prismaMock.friendRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["request_1", "request_2"] },
        recipientId: "me",
        status: FRIEND_REQUEST_PENDING,
        juntadasShownAt: null,
      },
      data: { juntadasShownAt: new Date("2026-07-29T12:00:00Z") },
    });
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

  it("adds each new friend to the other's open all-friends day audiences", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T15:00:00Z"));
    prismaMock.coworkDay.findMany
      .mockResolvedValueOnce([{ id: "my_today_day" }])
      .mockResolvedValueOnce([{ id: "their_today_day" }]);

    await makeFriends("me", "friend");

    expect(prismaMock.coworkDay.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        hostId: "me",
        circleId: null,
        status: "open",
        date: { gte: "2026-07-28" },
      },
      select: { id: true },
    });
    expect(prismaMock.coworkDay.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        hostId: "friend",
        circleId: null,
        status: "open",
        date: { gte: "2026-07-28" },
      },
      select: { id: true },
    });
    expect(prismaMock.dayAudience.createMany).toHaveBeenNthCalledWith(1, {
      data: [{ dayId: "my_today_day", userId: "friend" }],
      skipDuplicates: true,
    });
    expect(prismaMock.dayAudience.createMany).toHaveBeenNthCalledWith(2, {
      data: [{ dayId: "their_today_day", userId: "me" }],
      skipDuplicates: true,
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

  it("intersects the viewer's friends with the other person's, and never more", async () => {
    prismaMock.friendship.findMany
      .mockResolvedValueOnce([
        { aId: "me", bId: "meli" },
        { aId: "lujan", bId: "me" },
        { aId: "me", bId: "solo" },
      ])
      .mockResolvedValueOnce([
        { aId: "meli", bId: "other" },
        { aId: "lujan", bId: "other" },
      ]);
    prismaMock.user.findMany.mockResolvedValue([
      { id: "lujan", name: "Luján", username: "lujan", image: null },
      { id: "meli", name: "Meli", username: "meli", image: null },
    ]);

    const mutuals = await mutualFriends("me", ["other", "me"]);

    // "solo" is a friend of the viewer only, so it is not in the intersection.
    expect(mutuals.get("other")?.map((person) => person.id)).toEqual(["lujan", "meli"]);
    expect(mutuals.has("me")).toBe(false);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["meli", "lujan"] } },
      orderBy: [{ name: "asc" }, { username: "asc" }],
      select: { id: true, name: true, username: true, image: true },
    });
  });

  it("credits both people when two of the requested ids are friends of each other", async () => {
    prismaMock.friendship.findMany
      .mockResolvedValueOnce([
        { aId: "me", bId: "ana" },
        { aId: "beto", bId: "me" },
      ])
      .mockResolvedValueOnce([{ aId: "ana", bId: "beto" }]);
    prismaMock.user.findMany.mockResolvedValue([
      { id: "ana", name: "Ana", username: "ana", image: null },
      { id: "beto", name: "Beto", username: "beto", image: null },
    ]);

    const mutuals = await mutualFriends("me", ["ana", "beto"]);

    expect(mutuals.get("ana")?.map((person) => person.id)).toEqual(["beto"]);
    expect(mutuals.get("beto")?.map((person) => person.id)).toEqual(["ana"]);
  });

  it("never counts the viewer as their own mutual, even when the two are friends", async () => {
    prismaMock.friendship.findMany
      .mockResolvedValueOnce([
        { aId: "me", bId: "other" },
        { aId: "me", bId: "meli" },
      ])
      .mockResolvedValueOnce([{ aId: "meli", bId: "other" }]);
    prismaMock.user.findMany.mockResolvedValue([
      { id: "meli", name: "Meli", username: "meli", image: null },
    ]);

    const mutuals = await mutualFriends("me", ["other"]);

    expect(mutuals.get("other")?.map((person) => person.id)).toEqual(["meli"]);
  });

  it("returns empty sets without a second query when the viewer has no friends", async () => {
    prismaMock.friendship.findMany.mockResolvedValueOnce([]);

    const mutuals = await mutualFriends("me", ["other"]);

    expect(mutuals.get("other")).toEqual([]);
    expect(prismaMock.friendship.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
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

  it("creates a generic pending request without day context", async () => {
    const createdRequest = {
      id: "request_1",
      requesterId: "me",
      recipientId: "other",
      coworkDayId: null,
      status: FRIEND_REQUEST_PENDING,
    };
    prismaMock.user.findFirst.mockResolvedValue({
      id: "other",
      name: "Other",
      email: "other@example.com",
    });
    prismaMock.friendship.findUnique.mockResolvedValue(null);
    prismaMock.friendRequest.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prismaMock.friendRequest.create.mockResolvedValue(createdRequest);

    const result = await requestFriendGlobally({
      requesterId: "me",
      recipientId: "other",
    });

    expect(result).toEqual({
      outcome: "requested",
      recipient: { id: "other", name: "Other", email: "other@example.com" },
      request: createdRequest,
    });
    expect(prismaMock.friendRequest.create).toHaveBeenCalledWith({
      data: {
        requesterId: "me",
        recipientId: "other",
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
        juntadasShownAt: null,
        friendsShownAt: null,
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
