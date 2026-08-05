import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hasEnded, pastDayWhere, upcomingDayWhere } from "./day-window";

// 2026-07-28T15:00:00Z is 12:00 in Buenos Aires (UTC-3, no DST).
const TODAY = "2026-07-28";
const NOW = "12:00";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-28T15:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("hasEnded", () => {
  it("is over the minute the juntada ends, not at midnight", () => {
    expect(hasEnded(TODAY, "11:59")).toBe(true);
    expect(hasEnded(TODAY, "12:01")).toBe(false);
  });

  /**
   * The whole point of the issue: at 12:00 a juntada that ran until 09:00 is
   * past, even though its date is still today and midnight is hours away.
   */
  it("does not wait for the date to roll", () => {
    expect(hasEnded(TODAY, "09:00")).toBe(true);
    expect(hasEnded(TODAY, "17:00")).toBe(false);
  });

  /** endTime === now is over: a juntada ending at 12:00 is done at 12:00. */
  it("treats the end minute itself as ended", () => {
    expect(hasEnded(TODAY, NOW)).toBe(true);
  });

  it("ignores the time on any other date", () => {
    expect(hasEnded("2026-07-27", "23:59")).toBe(true);
    expect(hasEnded("2026-07-29", "00:01")).toBe(false);
  });

  it("accepts an injected clock so callers can share one reading", () => {
    expect(hasEnded(TODAY, "13:00", TODAY, "14:00")).toBe(true);
    expect(hasEnded(TODAY, "13:00", TODAY, "10:00")).toBe(false);
  });
});

describe("pastDayWhere / upcomingDayWhere", () => {
  it("splits on the end time, in a shape Postgres can answer", () => {
    expect(pastDayWhere()).toEqual({
      OR: [{ date: { lt: TODAY } }, { date: TODAY, endTime: { lte: NOW } }],
    });
  });

  /**
   * Complementarity is what keeps a juntada from landing in both lists (counted
   * twice) or neither (vanishing) in the minute it ends. Asserting the negation
   * rather than a second hand-written expression is the point: there is only one
   * boundary to get wrong.
   */
  it("defines upcoming as exactly the negation of past", () => {
    expect(upcomingDayWhere()).toEqual({ NOT: pastDayWhere() });
  });

  /**
   * The `OR` key must stay free. Most day queries carry their own `OR` for the
   * audience check, and a builder owning that key would be silently dropped by
   * a spread — valid TypeScript that quietly restores the bug this module fixes.
   */
  it("leaves the OR key free so it composes with a caller's own OR", () => {
    const where = { status: "open", ...upcomingDayWhere(), OR: [{ hostId: "me" }] };

    expect(where.NOT).toEqual(pastDayWhere());
    expect(where.OR).toEqual([{ hostId: "me" }]);
  });
});
