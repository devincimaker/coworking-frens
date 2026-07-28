import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDayPhrase, formatDayShort, joinedPhrase } from "./tz";

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
