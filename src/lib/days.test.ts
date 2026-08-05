import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  availabilityRule: {
    findMany: vi.fn(),
  },
  circleMember: {
    findMany: vi.fn(),
  },
  coworkDay: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  dayAudience: {
    createMany: vi.fn(),
  },
  place: {
    findUnique: vi.fn(),
  },
}));

const friendIdsOfMock = vi.hoisted(() => vi.fn());
const extendedFriendIdsOfMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/friends", () => ({
  friendIdsOf: friendIdsOfMock,
  extendedFriendIdsOf: extendedFriendIdsOfMock,
}));

import { createDay, materializeRules } from "./days";

afterEach(() => {
  vi.useRealTimers();
});

describe("createDay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.place.findUnique.mockResolvedValue({ id: "place_1" });
    prismaMock.coworkDay.create.mockResolvedValue({ id: "day_1" });
    prismaMock.coworkDay.findMany.mockResolvedValue([]);
    prismaMock.dayAudience.createMany.mockResolvedValue({ count: 0 });
  });

  it("stores the selected circle on circle-scoped days", async () => {
    prismaMock.circleMember.findMany.mockResolvedValue([
      { userId: "friend_1" },
      { userId: "friend_2" },
    ]);

    await createDay({
      hostId: "host",
      date: "2026-07-28",
      startTime: "09:00",
      endTime: "17:00",
      capacity: 4,
      description: "Focus",
      circleId: "circle_1",
    });

    expect(prismaMock.circleMember.findMany).toHaveBeenCalledWith({
      where: { circleId: "circle_1", circle: { ownerId: "host" } },
      select: { userId: true },
    });
    expect(prismaMock.coworkDay.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        circleId: "circle_1",
        audience: { create: [{ userId: "friend_1" }, { userId: "friend_2" }] },
      }),
      include: { audience: { include: { user: true } }, host: true, place: true },
    });
  });

  it("stores null circle metadata for all-friends days", async () => {
    friendIdsOfMock.mockResolvedValue(["friend_1"]);

    await createDay({
      hostId: "host",
      date: "2026-07-28",
      startTime: "09:00",
      endTime: "17:00",
      capacity: 4,
      circleId: null,
    });

    expect(prismaMock.coworkDay.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        circleId: null,
        audienceKind: "friends",
        audience: { create: [{ userId: "friend_1" }] },
      }),
      include: { audience: { include: { user: true } }, host: true, place: true },
    });
  });

  it("resolves friends-of-friends days through the extended graph and stores the kind", async () => {
    extendedFriendIdsOfMock.mockResolvedValue(["friend_1", "friend_of_friend"]);

    await createDay({
      hostId: "host",
      date: "2026-07-28",
      startTime: "09:00",
      endTime: "17:00",
      capacity: 4,
      circleId: null,
      audienceKind: "friends_of_friends",
    });

    expect(extendedFriendIdsOfMock).toHaveBeenCalledWith("host");
    expect(friendIdsOfMock).not.toHaveBeenCalled();
    expect(prismaMock.coworkDay.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        circleId: null,
        audienceKind: "friends_of_friends",
        audience: { create: [{ userId: "friend_1" }, { userId: "friend_of_friend" }] },
      }),
      include: { audience: { include: { user: true } }, host: true, place: true },
    });
  });
});

describe("materializeRules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T15:00:00Z"));
    vi.clearAllMocks();
    prismaMock.place.findUnique.mockResolvedValue({ id: "place_1" });
    prismaMock.coworkDay.create.mockResolvedValue({ id: "day_1" });
    prismaMock.coworkDay.findMany.mockResolvedValue([]);
    prismaMock.dayAudience.createMany.mockResolvedValue({ count: 0 });
    prismaMock.availabilityRule.findMany.mockResolvedValue([]);
    friendIdsOfMock.mockResolvedValue(["friend_1"]);
  });

  it("creates today's recurring instance when the rule still has time left", async () => {
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        id: "rule_1",
        hostId: "host",
        weekdays: "2",
        startTime: "09:00",
        endTime: "17:00",
        capacity: 4,
        description: "",
        circleId: null,
      },
    ]);

    await materializeRules();

    expect(prismaMock.coworkDay.create.mock.calls.map((call) => call[0].data.date)).toEqual([
      "2026-07-28",
      "2026-08-04",
      "2026-08-11",
      "2026-08-18",
    ]);
  });

  it("adds current friends to already-open all-friends one-off days", async () => {
    friendIdsOfMock.mockResolvedValue(["old_friend", "new_friend"]);
    prismaMock.coworkDay.findMany.mockResolvedValue([
      {
        id: "one_off_today",
        hostId: "host",
        audience: [{ userId: "old_friend" }],
      },
    ]);

    await materializeRules();

    expect(prismaMock.coworkDay.findMany).toHaveBeenCalledWith({
      where: {
        circleId: null,
        status: "open",
        date: { gte: "2026-07-28" },
      },
      select: {
        id: true,
        hostId: true,
        audienceKind: true,
        audience: { select: { userId: true } },
      },
    });
    expect(prismaMock.dayAudience.createMany).toHaveBeenCalledWith({
      data: [{ dayId: "one_off_today", userId: "new_friend" }],
      skipDuplicates: true,
    });
  });

  it("widens already-open friends-of-friends days through the extended graph", async () => {
    friendIdsOfMock.mockResolvedValue(["direct_friend"]);
    extendedFriendIdsOfMock.mockResolvedValue(["direct_friend", "second_hop"]);
    prismaMock.coworkDay.findMany.mockResolvedValue([
      {
        id: "fof_day",
        hostId: "host",
        audienceKind: "friends_of_friends",
        audience: [{ userId: "direct_friend" }],
      },
    ]);

    await materializeRules();

    expect(extendedFriendIdsOfMock).toHaveBeenCalledWith("host");
    expect(prismaMock.dayAudience.createMany).toHaveBeenCalledWith({
      data: [{ dayId: "fof_day", userId: "second_hop" }],
      skipDuplicates: true,
    });
  });

  it("passes a rule's audience kind through to the days it materializes", async () => {
    extendedFriendIdsOfMock.mockResolvedValue(["friend_1", "second_hop"]);
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        id: "rule_1",
        hostId: "host",
        weekdays: "2",
        startTime: "09:00",
        endTime: "17:00",
        capacity: 4,
        description: "",
        circleId: null,
        audienceKind: "friends_of_friends",
      },
    ]);

    await materializeRules();

    const created = prismaMock.coworkDay.create.mock.calls.map((call) => call[0].data);
    expect(created.length).toBeGreaterThan(0);
    for (const data of created) {
      expect(data.audienceKind).toBe("friends_of_friends");
    }
  });

  it("adds newly eligible circle members to already materialized open rule days", async () => {
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        id: "rule_1",
        hostId: "host",
        weekdays: "2",
        startTime: "09:00",
        endTime: "17:00",
        capacity: 4,
        description: "",
        circleId: "circle_1",
      },
    ]);
    prismaMock.circleMember.findMany.mockResolvedValue([
      { userId: "old_friend" },
      { userId: "new_friend" },
    ]);
    prismaMock.coworkDay.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "day_today",
          date: "2026-07-28",
          status: "open",
          audience: [{ userId: "old_friend" }],
        },
      ]);

    await materializeRules();

    expect(prismaMock.dayAudience.createMany).toHaveBeenCalledWith({
      data: [{ dayId: "day_today", userId: "new_friend" }],
      skipDuplicates: true,
    });
  });
});
