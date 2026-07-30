import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOnboardedUserMock = vi.hoisted(() => vi.fn());
const friendIdsOfMock = vi.hoisted(() => vi.fn());
const areFriendsMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  circle: { create: vi.fn(), findFirst: vi.fn() },
  circleMember: {
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/auth", () => ({
  requireOnboardedUser: requireOnboardedUserMock,
  requireUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/days", () => ({ materializeRules: vi.fn(), createDay: vi.fn() }));

vi.mock("@/lib/friends", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/friends")>()),
  friendIdsOf: friendIdsOfMock,
  areFriends: areFriendsMock,
}));

import { createCircle, toggleCircleMember } from "./actions";
import { CREATE_CIRCLE_INITIAL } from "./circles";

function newCircleForm(name: string, memberIds: string[]) {
  const data = new FormData();
  data.set("name", name);
  for (const id of memberIds) data.append("memberIds", id);
  return data;
}

describe("a circle is its people", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOnboardedUserMock.mockResolvedValue({ id: "me", name: "Ana", email: "ana@test.dev" });
    friendIdsOfMock.mockResolvedValue(["valen", "nico"]);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prismaMock)
    );
    prismaMock.circle.create.mockResolvedValue({ id: "circle_1" });
  });

  it("creates the name and the members in one go", async () => {
    const state = await createCircle(CREATE_CIRCLE_INITIAL, newCircleForm("los del barrio", ["valen", "nico"]));

    expect(state).toEqual({ error: null, created: true });
    expect(prismaMock.circle.create).toHaveBeenCalledWith({
      data: { ownerId: "me", name: "los del barrio" },
    });
    expect(prismaMock.circleMember.createMany).toHaveBeenCalledWith({
      data: [
        { circleId: "circle_1", userId: "valen" },
        { circleId: "circle_1", userId: "nico" },
      ],
    });
  });

  // An empty circle is an audience of nobody: it would quietly open a day to
  // no one and clutter the host picker for good.
  it("refuses to create one with nobody in it", async () => {
    const state = await createCircle(CREATE_CIRCLE_INITIAL, newCircleForm("los solos", []));

    expect(state).toEqual({ error: "Elegí al menos a una persona.", created: false });
    expect(prismaMock.circle.create).not.toHaveBeenCalled();
  });

  it("refuses to create one around someone who is not a friend", async () => {
    const state = await createCircle(
      CREATE_CIRCLE_INITIAL,
      newCircleForm("los del barrio", ["valen", "stranger"])
    );

    expect(state.error).toBe("Alguno de los elegidos ya no es amigo tuyo.");
    expect(prismaMock.circle.create).not.toHaveBeenCalled();
  });

  it("keeps the same promise when the last member is taken out", async () => {
    prismaMock.circle.findFirst.mockResolvedValue({ id: "circle_1", ownerId: "me" });
    areFriendsMock.mockResolvedValue(true);
    prismaMock.circleMember.findUnique.mockResolvedValue({ id: "member_1" });
    prismaMock.circleMember.count.mockResolvedValue(1);

    const data = new FormData();
    data.set("circleId", "circle_1");
    data.set("friendId", "valen");

    await expect(toggleCircleMember(data)).rejects.toThrow("A circle cannot be emptied");
    expect(prismaMock.circleMember.delete).not.toHaveBeenCalled();
  });

  it("still removes anyone who is not the last one", async () => {
    prismaMock.circle.findFirst.mockResolvedValue({ id: "circle_1", ownerId: "me" });
    areFriendsMock.mockResolvedValue(true);
    prismaMock.circleMember.findUnique.mockResolvedValue({ id: "member_1" });
    prismaMock.circleMember.count.mockResolvedValue(2);

    const data = new FormData();
    data.set("circleId", "circle_1");
    data.set("friendId", "valen");
    await toggleCircleMember(data);

    expect(prismaMock.circleMember.delete).toHaveBeenCalledWith({ where: { id: "member_1" } });
  });
});
