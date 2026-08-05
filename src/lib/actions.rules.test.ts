import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOnboardedUserMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const materializeRulesMock = vi.hoisted(() => vi.fn());
const friendsOfMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  availabilityRule: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  circle: {
    findFirst: vi.fn(),
  },
  circleMember: {
    findMany: vi.fn(),
  },
  coworkDay: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  place: {
    findUnique: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/auth", () => ({
  requireOnboardedUser: requireOnboardedUserMock,
  requireUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));
vi.mock("@/lib/friends", () => ({
  friendsOf: friendsOfMock,
  friendIdsOf: vi.fn(),
}));
vi.mock("@/lib/days", () => ({
  materializeRules: materializeRulesMock,
  createDay: vi.fn(),
}));

import { createRule, deleteRule, toggleRule } from "./actions";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("pausing a recurring rule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOnboardedUserMock.mockResolvedValue({
      id: "me",
      name: "Ana Dev",
      email: "ana@example.com",
    });
    prismaMock.coworkDay.findMany.mockResolvedValue([]);
  });

  /**
   * materializeRules never revisits a date it has already touched, cancelled ones
   * included — so a pause that cancelled could not be undone by resuming.
   */
  it("leaves the days it already opened standing, and tells nobody", async () => {
    prismaMock.availabilityRule.findFirst.mockResolvedValue({
      id: "rule_1",
      hostId: "me",
      active: true,
    });

    await toggleRule(formData({ ruleId: "rule_1" }));

    expect(prismaMock.availabilityRule.update).toHaveBeenCalledWith({
      where: { id: "rule_1" },
      data: { active: false },
    });
    expect(prismaMock.coworkDay.update).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("refills the horizon when it is switched back on", async () => {
    prismaMock.availabilityRule.findFirst.mockResolvedValue({
      id: "rule_1",
      hostId: "me",
      active: false,
    });

    await toggleRule(formData({ ruleId: "rule_1" }));

    expect(prismaMock.availabilityRule.update).toHaveBeenCalledWith({
      where: { id: "rule_1" },
      data: { active: true },
    });
    expect(materializeRulesMock).toHaveBeenCalled();
  });

  // Deleting is the one that clears the calendar — the rule is not coming back.
  it("still cancels and notifies when the rule is deleted", async () => {
    prismaMock.availabilityRule.findFirst.mockResolvedValue({
      id: "rule_1",
      hostId: "me",
      active: true,
    });
    prismaMock.coworkDay.findMany.mockResolvedValue([
      {
        id: "day_1",
        date: "2099-01-01",
        place: { nickname: "El Nido" },
        attendances: [{ user: { email: "marco@example.com" } }],
      },
    ]);

    await deleteRule(formData({ ruleId: "rule_1" }));

    expect(prismaMock.coworkDay.update).toHaveBeenCalledWith({
      where: { id: "day_1" },
      data: { status: "cancelled" },
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["marco@example.com"],
      expect.stringContaining("Cancelada"),
      expect.stringContaining("El Nido")
    );
    expect(prismaMock.availabilityRule.delete).toHaveBeenCalledWith({ where: { id: "rule_1" } });
  });
});

describe("createRule audience selection", () => {
  const baseForm = () => ({
    weekdays: "2",
    startTime: "09:00",
    endTime: "17:00",
    capacity: "4",
    description: "",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    requireOnboardedUserMock.mockResolvedValue({
      id: "me",
      name: "Ana Dev",
      email: "ana@example.com",
    });
    prismaMock.place.findUnique.mockResolvedValue({ id: "place_1", nickname: "El Nido" });
    prismaMock.availabilityRule.create.mockResolvedValue({
      id: "rule_1",
      weekdays: "2",
      description: "",
    });
    friendsOfMock.mockResolvedValue([{ email: "amiga@example.com" }]);
  });

  it("stores the friends-of-friends kind and still announces to direct friends only", async () => {
    const result = await createRule(
      { status: "idle", message: "" },
      formData({ ...baseForm(), audience: "friends_of_friends" })
    );

    expect(result.status).toBe("success");
    expect(prismaMock.availabilityRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        circleId: null,
        audienceKind: "friends_of_friends",
      }),
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["amiga@example.com"],
      expect.any(String),
      expect.any(String)
    );
  });

  it("keeps circle selections on the friends kind", async () => {
    prismaMock.circle.findFirst.mockResolvedValue({ id: "circle_1" });
    prismaMock.circleMember.findMany.mockResolvedValue([
      { user: { email: "member@example.com" } },
    ]);

    const result = await createRule(
      { status: "idle", message: "" },
      formData({ ...baseForm(), audience: "circle_1" })
    );

    expect(result.status).toBe("success");
    expect(prismaMock.availabilityRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        circleId: "circle_1",
        audienceKind: "friends",
      }),
    });
  });

  it("rejects a circle the user does not own", async () => {
    prismaMock.circle.findFirst.mockResolvedValue(null);

    const result = await createRule(
      { status: "idle", message: "" },
      formData({ ...baseForm(), audience: "someone_elses_circle" })
    );

    expect(result).toEqual({ status: "error", message: "Ese círculo no está disponible." });
    expect(prismaMock.availabilityRule.create).not.toHaveBeenCalled();
  });
});
