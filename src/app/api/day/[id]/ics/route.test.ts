import { beforeEach, describe, expect, it, vi } from "vitest";
import ical, { type VEvent } from "node-ical";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  dayForUser: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/queries", () => ({ dayForUser: mocks.dayForUser }));

import { GET } from "@/app/api/day/[id]/ics/route";

function dayRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "day_1",
    date: "2026-08-05",
    startTime: "09:00",
    endTime: "17:00",
    status: "open",
    description: "",
    host: { name: "Ana Dev" },
    place: { nickname: "El Nido", address: "Gorriti 4500, Palermo", arrivalNotes: "" },
    ...overrides,
  };
}

function get(id = "day_1") {
  return GET(new Request(`http://localhost/api/day/${id}/ics`) as never, {
    params: Promise.resolve({ id }),
  } as never);
}

describe("GET /api/day/[id]/ics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "https://frens.example");
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } });
    mocks.dayForUser.mockResolvedValue(dayRow());
  });

  it("serves the file to someone allowed to see the day", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");

    const parsed = ical.sync.parseICS(await response.text());
    const events = Object.values(parsed).filter(
      (entry): entry is VEvent => entry?.type === "VEVENT"
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.start.toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });

  it("scopes to the signed-in user, so the query cannot be pointed elsewhere", async () => {
    await get("day_9");
    expect(mocks.dayForUser).toHaveBeenCalledWith("day_9", "user_1");
  });

  it("refuses a signed-out request without touching the database", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
    expect(mocks.dayForUser).not.toHaveBeenCalled();
  });

  // Not 403: "you may not" and "it does not exist" have to look identical, or the
  // route becomes a way to confirm a juntada exists from outside its audience.
  it("answers 404 for a day outside the viewer's audience", async () => {
    mocks.dayForUser.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("BEGIN:VCALENDAR");
  });

  it("answers 404 for a cancelled day even to someone who was going", async () => {
    mocks.dayForUser.mockResolvedValue(dayRow({ status: "cancelled" }));
    expect((await get()).status).toBe(404);
  });

  it("offers the file as a download named for the day", async () => {
    const disposition = (await get()).headers.get("content-disposition");
    expect(disposition).toBe('attachment; filename="juntada-2026-08-05.ics"');
  });

  it("keeps the response out of shared caches", async () => {
    expect((await get()).headers.get("cache-control")).toBe("no-store");
  });
});
