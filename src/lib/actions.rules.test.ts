import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOnboardedUserMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const materializeRulesMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  availabilityRule: {
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  coworkDay: {
    findMany: vi.fn(),
    update: vi.fn(),
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
vi.mock("@/lib/days", () => ({
  materializeRules: materializeRulesMock,
  createDay: vi.fn(),
}));

import { deleteRule, toggleRule } from "./actions";

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
