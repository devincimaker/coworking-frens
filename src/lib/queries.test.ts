import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  coworkDay: { groupBy: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/friends", () => ({ friendIdsOf: vi.fn() }));
vi.mock("@/lib/tz", () => ({
  todayBA: () => "2026-07-30",
  currentTimeBA: () => "14:00",
}));

import { hostedJuntadasFor } from "./queries";
import { pastDayWhere } from "./day-window";

describe("hostedJuntadasFor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts each person's juntadas", async () => {
    prismaMock.coworkDay.groupBy.mockResolvedValue([
      { hostId: "valen", _count: { _all: 12 } },
      { hostId: "tomi", _count: { _all: 1 } },
    ]);

    const counts = await hostedJuntadasFor(["valen", "tomi", "nico"]);

    expect(counts.get("valen")).toBe(12);
    expect(counts.get("tomi")).toBe(1);
    expect(counts.get("nico")).toBeUndefined();
  });

  /**
   * A cancelled day was never received and one still to come has not been
   * either, so neither may inflate the number. "Still to come" is decided by
   * the end time, not the date: today's juntada that finished at 13:00 counts
   * from 13:00, without waiting for midnight.
   */
  it("only counts days that already ended and were not cancelled", async () => {
    prismaMock.coworkDay.groupBy.mockResolvedValue([]);

    await hostedJuntadasFor(["valen"]);

    const where = prismaMock.coworkDay.groupBy.mock.calls[0][0].where;
    expect(where.status).toBe("open");
    expect(where.OR).toEqual(pastDayWhere().OR);
  });

  /**
   * Otherwise anyone could run the number up by opening days on a calendar. The
   * host is never in `attendances` (joinDay refuses them their own day), so this
   * is strictly "somebody else said they were coming".
   */
  it("does not count a day nobody said they were going to", async () => {
    prismaMock.coworkDay.groupBy.mockResolvedValue([]);

    await hostedJuntadasFor(["valen"]);

    expect(prismaMock.coworkDay.groupBy.mock.calls[0][0].where.attendances).toEqual({ some: {} });
  });

  /**
   * Aggregate only. Anything narrower — which day, whose circle, when — would
   * expose a juntada that may have been opened to a private circle.
   */
  it("asks for nothing but a count per host", async () => {
    prismaMock.coworkDay.groupBy.mockResolvedValue([]);

    await hostedJuntadasFor(["valen"]);

    const args = prismaMock.coworkDay.groupBy.mock.calls[0][0];
    expect(args.by).toEqual(["hostId"]);
    expect(args._count).toEqual({ _all: true });
    expect(args.select).toBeUndefined();
  });

  it("asks the database nothing when there is nobody to ask about", async () => {
    const counts = await hostedJuntadasFor([]);

    expect(counts.size).toBe(0);
    expect(prismaMock.coworkDay.groupBy).not.toHaveBeenCalled();
  });
});
