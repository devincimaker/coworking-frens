import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOnboardedUserMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  coworkDay: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
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
vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));

import { cancelDay, updateDay } from "./actions";
import { todayBA } from "./tz";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function openDayRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "day_1",
    hostId: "me",
    placeId: "place_1",
    date: todayBA(),
    startTime: "09:00",
    endTime: "17:00",
    capacity: 4,
    description: "",
    ruleId: null,
    circleId: null,
    reminderSent: false,
    place: { nickname: "El Nido" },
    attendances: [],
    ...overrides,
  };
}

describe("updateDay chair count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOnboardedUserMock.mockResolvedValue({
      id: "me",
      name: "Ana Dev",
      email: "ana@example.com",
    });
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(prismaMock)
    );
  });

  const baseForm = () => ({
    dayId: "day_1",
    date: todayBA(),
    startTime: "09:00",
    endTime: "17:00",
    description: "",
  });

  it("refuses to drop below the people already coming", async () => {
    prismaMock.coworkDay.findFirst.mockResolvedValue(
      openDayRow({
        attendances: [
          { user: { email: "a@example.com" } },
          { user: { email: "b@example.com" } },
        ],
      })
    );

    const result = await updateDay(
      { status: "idle", message: "" },
      formData({ ...baseForm(), capacity: "1" })
    );

    expect(result.status).toBe("error");
    expect(result.message).toContain("sacá a alguien");
    expect(prismaMock.coworkDay.update).not.toHaveBeenCalled();
  });

  it("saves a capacity that still fits everyone", async () => {
    prismaMock.coworkDay.findFirst.mockResolvedValue(
      openDayRow({ attendances: [{ user: { email: "a@example.com" } }] })
    );

    const result = await updateDay(
      { status: "idle", message: "" },
      formData({ ...baseForm(), capacity: "6" })
    );

    expect(result.status).toBe("success");
    expect(prismaMock.coworkDay.update).toHaveBeenCalledWith({
      where: { id: "day_1" },
      data: expect.objectContaining({ capacity: 6 }),
    });
  });

  // The day detail screen edits the schedule without offering chairs at all.
  it("keeps the stored capacity when the form omits the field", async () => {
    prismaMock.coworkDay.findFirst.mockResolvedValue(openDayRow({ capacity: 3 }));

    await updateDay({ status: "idle", message: "" }, formData(baseForm()));

    expect(prismaMock.coworkDay.update).toHaveBeenCalledWith({
      where: { id: "day_1" },
      data: expect.objectContaining({ capacity: 3 }),
    });
  });
});

describe("cancelDay reason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOnboardedUserMock.mockResolvedValue({
      id: "me",
      name: "Ana Dev",
      email: "ana@example.com",
    });
    prismaMock.coworkDay.findFirst.mockResolvedValue(
      openDayRow({ attendances: [{ user: { email: "marco@example.com" } }] })
    );
  });

  it("cancels without a reason exactly as before", async () => {
    await cancelDay(formData({ dayId: "day_1" }));

    expect(prismaMock.coworkDay.update).toHaveBeenCalledWith({
      where: { id: "day_1" },
      data: { status: "cancelled", cancellationReason: null },
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["marco@example.com"],
      expect.stringContaining("Cancelada"),
      expect.not.stringContaining("Motivo:")
    );
  });

  it("stores a trimmed reason and adds it to the email", async () => {
    await cancelDay(formData({ dayId: "day_1", cancellationReason: "  Me enfermé  " }));

    expect(prismaMock.coworkDay.update).toHaveBeenCalledWith({
      where: { id: "day_1" },
      data: { status: "cancelled", cancellationReason: "Me enfermé" },
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["marco@example.com"],
      expect.stringContaining("Cancelada"),
      expect.stringContaining("Motivo: Me enfermé")
    );
  });

  it("treats a whitespace-only reason as none", async () => {
    await cancelDay(formData({ dayId: "day_1", cancellationReason: "   " }));

    expect(prismaMock.coworkDay.update).toHaveBeenCalledWith({
      where: { id: "day_1" },
      data: { status: "cancelled", cancellationReason: null },
    });
  });

  it("truncates a reason longer than 280 characters", async () => {
    await cancelDay(formData({ dayId: "day_1", cancellationReason: "x".repeat(300) }));

    const { data } = prismaMock.coworkDay.update.mock.calls[0][0];
    expect(data.cancellationReason).toHaveLength(280);
  });
});
