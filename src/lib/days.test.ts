import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  circleMember: {
    findMany: vi.fn(),
  },
  coworkDay: {
    create: vi.fn(),
  },
  place: {
    findUnique: vi.fn(),
  },
}));

const friendIdsOfMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/friends", () => ({
  friendIdsOf: friendIdsOfMock,
}));

import { createDay } from "./days";

describe("createDay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.place.findUnique.mockResolvedValue({ id: "place_1" });
    prismaMock.coworkDay.create.mockResolvedValue({ id: "day_1" });
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
        audience: { create: [{ userId: "friend_1" }] },
      }),
      include: { audience: { include: { user: true } }, host: true, place: true },
    });
  });
});
