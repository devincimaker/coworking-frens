import { beforeEach, describe, expect, it, vi } from "vitest";
import ical, { type VEvent } from "node-ical";

const requireOnboardedUserMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const createDayMock = vi.hoisted(() => vi.fn());
const createRuleDayMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  coworkDay: { findFirst: vi.fn() },
  attendance: { create: vi.fn() },
  availabilityRule: { create: vi.fn() },
  circle: { findFirst: vi.fn() },
  circleMember: { findMany: vi.fn() },
  place: { findUnique: vi.fn() },
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
vi.mock("@/lib/days", () => ({
  createDay: createDayMock,
  materializeRules: vi.fn(),
  openDaysForRule: createRuleDayMock,
}));
vi.mock("@/lib/friends", () => ({
  friendIdsOf: vi.fn(async () => []),
  friendsOf: vi.fn(async () => []),
}));

import { createOneOffDay, joinDay, openDay } from "./actions";
import { formatDay, todayBA } from "./tz";

const JOINER = { id: "user_1", name: "Lea Ruiz", email: "lea@example.com" };

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function joinableDay(overrides: Record<string, unknown> = {}) {
  return {
    id: "day_1",
    date: todayBA(),
    startTime: "09:00",
    endTime: "17:00",
    capacity: 4,
    description: "Mate y foco, después calls",
    attendances: [],
    host: { name: "Ana Dev", email: "ana@example.com" },
    place: {
      nickname: "El Nido",
      address: "Gorriti 4500, Palermo",
      arrivalNotes: "Timbre 3B",
    },
    ...overrides,
  };
}

/** The arguments of the send addressed to the person who just joined. */
function confirmationCall() {
  return sendEmailMock.mock.calls.find((call) => call[0]?.[0] === JOINER.email);
}

describe("joinDay confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "https://frens.example");
    requireOnboardedUserMock.mockResolvedValue(JOINER);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(prismaMock)
    );
    prismaMock.coworkDay.findFirst.mockResolvedValue(joinableDay());
  });

  it("tells the host and confirms to the person who joined", async () => {
    await joinDay(formData({ dayId: "day_1" }));

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["ana@example.com"],
      expect.stringContaining("Lea se suma"),
      expect.any(String)
    );
    expect(confirmationCall()?.[1]).toContain("Ya estás anotado");
  });

  it("attaches an .ics naming the same juntada", async () => {
    await joinDay(formData({ dayId: "day_1" }));

    const attachments = confirmationCall()?.[3]?.attachments;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe(`juntada-${todayBA()}.ics`);

    const parsed = ical.sync.parseICS(attachments[0].content);
    const events = Object.values(parsed).filter(
      (entry): entry is VEvent => entry?.type === "VEVENT"
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.summary).toBe("Juntada en El Nido");
    expect(events[0]?.location).toBe("Gorriti 4500, Palermo");
    expect(events[0]?.url).toBe("https://frens.example/day/day_1");
  });

  it("offers Google Calendar and the day page in the body", async () => {
    await joinDay(formData({ dayId: "day_1" }));

    const body = confirmationCall()?.[2] as string;
    expect(body).toContain("https://calendar.google.com/calendar/render");
    expect(body).toContain("ctz=America%2FArgentina%2FBuenos_Aires");
    expect(body).toContain("https://frens.example/day/day_1");
    expect(body).toContain("Gorriti 4500, Palermo");
    expect(body).toContain("Timbre 3B");
  });

  // A double tap on "Sumarme", or a replayed form, is not a second arrival.
  it("sends nothing at all when the person is already going", async () => {
    prismaMock.coworkDay.findFirst.mockResolvedValue(
      joinableDay({ attendances: [{ userId: JOINER.id }] })
    );

    await joinDay(formData({ dayId: "day_1" }));

    expect(prismaMock.attendance.create).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  // The seat is the thing that matters. sendEmail swallows its own failures, but
  // assembling the event is new work that could throw on data we did not foresee,
  // and nobody should lose their place over a calendar file. The host notice goes
  // out first, so the failure is aimed at the second call — the confirmation.
  it("keeps the seat when the confirmation cannot be built or sent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendEmailMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("smtp down"));

    const result = await joinDay(formData({ dayId: "day_1" }));

    expect(prismaMock.attendance.create).toHaveBeenCalledWith({
      data: { dayId: "day_1", userId: JOINER.id },
    });
    // And the confirmation still reaches the screen, which is now the only copy
    // of the calendar links they are going to get.
    expect(result?.calendar.icsHref).toBe("/api/day/day_1/ics");
    expect(console.error).toHaveBeenCalledWith("join confirmation failed", "smtp down");
    vi.mocked(console.error).mockRestore();
  });

  it("hands back the place, the time and both links to confirm on screen", async () => {
    const result = await joinDay(formData({ dayId: "day_1" }));

    expect(result?.place).toBe("El Nido");
    expect(result?.when).toBe(`${formatDay(todayBA())} · 09:00–17:00`);
    expect(result?.calendar.icsHref).toBe("/api/day/day_1/ics");
    expect(new URL(result?.calendar.googleHref ?? "").host).toBe("calendar.google.com");
  });

  // Null is what keeps the dialog from opening a second time on a replayed form.
  it("hands back nothing when the person was already going", async () => {
    prismaMock.coworkDay.findFirst.mockResolvedValue(
      joinableDay({ attendances: [{ userId: JOINER.id }] })
    );

    await expect(joinDay(formData({ dayId: "day_1" }))).resolves.toBeNull();
  });

  it("still refuses a full day", async () => {
    prismaMock.coworkDay.findFirst.mockResolvedValue(
      joinableDay({ capacity: 1, attendances: [{ userId: "someone_else" }] })
    );

    await expect(joinDay(formData({ dayId: "day_1" }))).rejects.toThrow("Day is full");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("host composer calendar offer", () => {
  const baseForm = () => ({
    date: todayBA(),
    startTime: "09:00",
    endTime: "17:00",
    capacity: "4",
    description: "",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "https://frens.example");
    requireOnboardedUserMock.mockResolvedValue({
      id: "me",
      name: "Ana Dev",
      email: "ana@example.com",
    });
    createDayMock.mockResolvedValue({
      id: "day_9",
      date: todayBA(),
      startTime: "09:00",
      endTime: "17:00",
      description: "",
      host: { name: "Ana Dev" },
      place: { nickname: "El Nido", address: "Gorriti 4500", arrivalNotes: "" },
      audience: [],
    });
  });

  it("hands the host both destinations for a single dated day", async () => {
    const result = await createOneOffDay({ status: "idle", message: "" }, formData(baseForm()));

    expect(result.status).toBe("success");
    expect(result.calendar?.icsHref).toBe("/api/day/day_9/ics");
    const google = new URL(result.calendar?.googleHref ?? "");
    expect(google.host).toBe("calendar.google.com");
    expect(google.searchParams.get("text")).toBe("Juntada en El Nido");
    expect(google.searchParams.get("ctz")).toBe("America/Argentina/Buenos_Aires");
  });

  // An .ics for a rule would carry an open-ended RRULE and keep painting a
  // calendar long after the host switched the rule off. The instances still get
  // the offer one at a time from their own day page.
  it("offers nothing for a recurring rule", async () => {
    prismaMock.place.findUnique.mockResolvedValue({ id: "place_1", nickname: "El Nido" });
    prismaMock.availabilityRule.create.mockResolvedValue({
      id: "rule_1",
      weekdays: String(new Date(`${todayBA()}T12:00:00Z`).getUTCDay()),
      description: "",
    });

    const result = await openDay(
      { status: "idle", message: "" },
      formData({ ...baseForm(), repeat: "on" })
    );

    expect(result.status).toBe("success");
    expect(result.calendar).toBeUndefined();
    expect(createDayMock).not.toHaveBeenCalled();
  });
});
