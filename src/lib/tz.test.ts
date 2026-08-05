import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baInstant, formatDayPhrase, formatDayShort, joinedPhrase } from "./tz";

// Tuesday 28 July 2026, mid-morning in Buenos Aires (UTC-3).
const NOW = new Date("2026-07-28T13:00:00Z");

describe("host-facing date labels", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("names today and tomorrow instead of dating them", () => {
    expect(formatDayShort("2026-07-28")).toBe("Hoy");
    expect(formatDayShort("2026-07-29")).toBe("Mañana");
    expect(formatDayPhrase("2026-07-28")).toBe("hoy");
    expect(formatDayPhrase("2026-07-29")).toBe("mañana");
  });

  it("falls back to weekday and day-of-month further out", () => {
    expect(formatDayShort("2026-07-30")).toBe("Jue 30");
    expect(formatDayPhrase("2026-07-30")).toBe("el jueves 30");
    expect(formatDayPhrase("2026-08-02")).toBe("el domingo 2");
  });

  it("describes when someone joined, in Buenos Aires time", () => {
    expect(joinedPhrase(new Date("2026-07-28T11:00:00Z"))).toBe("se sumó hoy");
    expect(joinedPhrase(new Date("2026-07-27T15:00:00Z"))).toBe("se sumó ayer");
    expect(joinedPhrase(new Date("2026-07-24T15:00:00Z"))).toBe("se sumó el vie");
    expect(joinedPhrase(new Date("2026-07-03T15:00:00Z"))).toBe("se sumó el 3 jul");
  });

  it("reads 21:00 in Buenos Aires as the same day, not the UTC next one", () => {
    // 2026-07-29T00:30Z is still the 28th at 21:30 in Buenos Aires.
    expect(joinedPhrase(new Date("2026-07-29T00:30:00Z"))).toBe("se sumó hoy");
  });
});

// A juntada is stored as wall-clock strings, but a calendar file has to name a
// real moment. An hour lost here surfaces days later, inside a calendar app we
// never see, so every boundary gets pinned.
describe("baInstant", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("reads a morning start as Buenos Aires time, three hours behind UTC", () => {
    expect(baInstant("2026-08-05", "09:00").toISOString()).toBe("2026-08-05T12:00:00.000Z");
    expect(baInstant("2026-08-05", "17:00").toISOString()).toBe("2026-08-05T20:00:00.000Z");
  });

  it("rolls an evening start into the next UTC day without moving the local time", () => {
    expect(baInstant("2026-08-05", "21:00").toISOString()).toBe("2026-08-06T00:00:00.000Z");
    expect(baInstant("2026-08-05", "23:30").toISOString()).toBe("2026-08-06T02:30:00.000Z");
  });

  it("keeps midnight on its own date rather than the previous one", () => {
    expect(baInstant("2026-08-05", "00:00").toISOString()).toBe("2026-08-05T03:00:00.000Z");
  });

  it("holds the same offset in January and July — Argentina keeps no DST", () => {
    expect(baInstant("2026-01-15", "09:00").toISOString()).toBe("2026-01-15T12:00:00.000Z");
    expect(baInstant("2026-07-15", "09:00").toISOString()).toBe("2026-07-15T12:00:00.000Z");
  });

  // The zone comes from the formatters, not from the process. Without this, a
  // laptop set to Buenos Aires would pass while CI in UTC shipped the bug.
  it.each(["UTC", "America/Los_Angeles", "Asia/Tokyo", "America/Argentina/Buenos_Aires"])(
    "ignores the machine's own zone (%s)",
    (zone) => {
      vi.stubEnv("TZ", zone);
      expect(baInstant("2026-08-05", "09:00").toISOString()).toBe("2026-08-05T12:00:00.000Z");
      vi.unstubAllEnvs();
    }
  );

  it("is unaffected by the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-03-03T05:00:00Z"));
    expect(baInstant("2026-08-05", "09:00").toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });
});
