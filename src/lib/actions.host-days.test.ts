import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOnboardedUserMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const createDayMock = vi.hoisted(() => vi.fn());
const friendIdsOfMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  circle: {
    findFirst: vi.fn(),
  },
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
vi.mock("@/lib/friends", () => ({
  friendIdsOf: friendIdsOfMock,
}));
vi.mock("@/lib/days", () => ({
  createDay: createDayMock,
  materializeRules: vi.fn(),
}));

import { cancelDay, createOneOffDay, updateDay } from "./actions";
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

describe("createOneOffDay audience selection", () => {
  const baseForm = () => ({
    date: todayBA(),
    startTime: "09:00",
    endTime: "17:00",
    capacity: "4",
    description: "",
  });

  function createdDay(audience: { userId: string; email: string }[]) {
    return {
      id: "day_1",
      description: "",
      place: { nickname: "El Nido" },
      audience: audience.map(({ userId, email }) => ({ userId, user: { email } })),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    requireOnboardedUserMock.mockResolvedValue({
      id: "me",
      name: "Ana Dev",
      email: "ana@example.com",
    });
    createDayMock.mockResolvedValue(createdDay([]));
  });

  it("passes the friends-of-friends kind through and mails direct friends only", async () => {
    createDayMock.mockResolvedValue(
      createdDay([
        { userId: "friend_1", email: "amiga@example.com" },
        { userId: "second_hop", email: "stranger@example.com" },
      ])
    );
    friendIdsOfMock.mockResolvedValue(["friend_1"]);

    const result = await createOneOffDay(
      { status: "idle", message: "" },
      formData({ ...baseForm(), audience: "friends_of_friends" })
    );

    expect(result.status).toBe("success");
    expect(createDayMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: "me",
        circleId: null,
        audienceKind: "friends_of_friends",
      })
    );
    // The one-hop stranger discovers the day in the feed, not by mail.
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["amiga@example.com"],
      expect.any(String),
      expect.any(String)
    );
  });

  it("defaults to the all-friends audience and mails everyone in it", async () => {
    createDayMock.mockResolvedValue(
      createdDay([
        { userId: "friend_1", email: "amiga@example.com" },
        { userId: "friend_2", email: "amigo@example.com" },
      ])
    );

    const result = await createOneOffDay(
      { status: "idle", message: "" },
      formData(baseForm())
    );

    expect(result.status).toBe("success");
    expect(createDayMock).toHaveBeenCalledWith(
      expect.objectContaining({ circleId: null, audienceKind: "friends" })
    );
    expect(friendIdsOfMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["amiga@example.com", "amigo@example.com"],
      expect.any(String),
      expect.any(String)
    );
  });

  it("still rejects circles the user does not own", async () => {
    prismaMock.circle.findFirst.mockResolvedValue(null);

    const result = await createOneOffDay(
      { status: "idle", message: "" },
      formData({ ...baseForm(), audience: "someone_elses_circle" })
    );

    expect(result).toEqual({ status: "error", message: "Ese círculo no está disponible." });
    expect(createDayMock).not.toHaveBeenCalled();
  });
});
