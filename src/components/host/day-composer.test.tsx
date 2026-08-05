import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openDayMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions", () => ({ openDay: openDayMock }));

import { DayComposer } from "@/components/host/day-composer";

const CALENDAR = {
  googleHref: "https://calendar.google.com/calendar/render?action=TEMPLATE",
  icsHref: "/api/day/day_9/ics",
};

function openComposer() {
  render(
    <DayComposer
      today="2026-07-28"
      openDates={[]}
      circles={[]}
      friendCount={3}
      defaultCapacity={4}
      defaultStartTime="09:00"
      defaultEndTime="17:00"
      isFirstDay={false}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Abrir un día/ }));
}

async function submit() {
  fireEvent.click(screen.getByRole("button", { name: /^Abrir (el|los|hoy|mañana)/ }));
  await waitFor(() => expect(openDayMock).toHaveBeenCalled());
}

describe("DayComposer calendar offer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("offers the new day to the host's own calendar once it opens", async () => {
    openDayMock.mockResolvedValue({
      status: "success",
      message: "Listo, nueva juntada abierta.",
      calendar: CALENDAR,
    });

    openComposer();
    await submit();

    await waitFor(() => {
      expect(screen.getAllByText("Listo, nueva juntada abierta.").length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("link", { name: /Google Calendar/ })).toHaveAttribute(
      "href",
      CALENDAR.googleHref
    );
    expect(screen.getByRole("link", { name: /Apple/ })).toHaveAttribute(
      "href",
      CALENDAR.icsHref
    );
  });

  // A rule has no single date to hand a calendar, so the banner says its piece
  // and stops. The instances get the offer from their own day pages.
  it("says its piece and nothing more for a recurring rule", async () => {
    openDayMock.mockResolvedValue({
      status: "success",
      message: "Listo, ahora abrís todos los martes.",
    });

    openComposer();
    await submit();

    await waitFor(() => {
      expect(screen.getAllByText("Listo, ahora abrís todos los martes.").length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("link", { name: /Google Calendar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Apple/ })).not.toBeInTheDocument();
  });

  it("offers nothing when the day could not be opened", async () => {
    openDayMock.mockResolvedValue({
      status: "error",
      message: "Elegí una fecha válida.",
    });

    openComposer();
    await submit();

    await waitFor(() => {
      expect(screen.getAllByText("Elegí una fecha válida.").length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole("link", { name: /Google Calendar/ })).not.toBeInTheDocument();
  });
});
