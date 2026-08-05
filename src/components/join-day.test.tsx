import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const joinDayMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const leaveDayMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions", () => ({ joinDay: joinDayMock, leaveDay: leaveDayMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

import { JoinDayButton } from "@/components/join-day";

const RESULT = {
  place: "El Nido",
  when: "Jue 6 ago · 09:00–17:00",
  calendar: {
    googleHref: "https://calendar.google.com/calendar/render?action=TEMPLATE",
    icsHref: "/api/day/day_1/ics",
  },
};

function renderButton(variant: "feed" | "detail" = "detail") {
  return render(
    <JoinDayButton dayId="day_1" variant={variant} className="btn-primary">
      Sumarme
    </JoinDayButton>
  );
}

async function join() {
  fireEvent.click(screen.getByRole("button", { name: "Sumarme" }));
  await waitFor(() => expect(joinDayMock).toHaveBeenCalled());
}

const google = () => screen.queryByRole("link", { name: /Google/ });
const apple = () => screen.queryByRole("link", { name: /Apple/ });

describe("JoinDayButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    joinDayMock.mockResolvedValue(RESULT);
  });

  afterEach(cleanup);

  it("passes the day through to the action", async () => {
    renderButton();
    await join();

    const formData = joinDayMock.mock.calls[0][0] as FormData;
    expect(formData.get("dayId")).toBe("day_1");
  });

  // The point of the whole change: the offer takes the button's own place the
  // moment you commit, instead of waiting further down a page you may not scroll.
  it("puts the calendar row where the button was", async () => {
    renderButton();
    expect(google()).not.toBeInTheDocument();

    await join();

    await waitFor(() => expect(google()).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Sumarme" })).not.toBeInTheDocument();
    expect(google()).toHaveAttribute("href", RESULT.calendar.googleHref);
    expect(apple()).toHaveAttribute("href", RESULT.calendar.icsHref);
  });

  it("names the juntada it is about, on the day page", async () => {
    renderButton("detail");
    await join();

    await waitFor(() =>
      expect(screen.getByText("Jue 6 ago · 09:00–17:00 en El Nido.")).toBeInTheDocument()
    );
  });

  // The feed card's column is too narrow for the sentence; the row carries the
  // short label and the two destinations only.
  it("stays compact in the feed", async () => {
    renderButton("feed");
    await join();

    await waitFor(() => expect(screen.getByText("Al calendario")).toBeInTheDocument());
    expect(screen.queryByText(/en El Nido\./)).not.toBeInTheDocument();
    expect(google()).toBeInTheDocument();
    expect(apple()).toBeInTheDocument();
  });

  it("settles into ✓ Vas and says where the juntada went", async () => {
    renderButton("detail");
    await join();
    await waitFor(() => expect(google()).toBeInTheDocument());

    fireEvent.click(google()!);

    await waitFor(() => expect(screen.getByText(/✓ Vas/)).toBeInTheDocument());
    expect(screen.getByText("Agregada a Google Calendar")).toBeInTheDocument();
    expect(google()).not.toBeInTheDocument();
  });

  it("names the .ics when that is the one they took", async () => {
    renderButton();
    await join();
    await waitFor(() => expect(apple()).toBeInTheDocument());

    fireEvent.click(apple()!);

    await waitFor(() => expect(screen.getByText("Descargamos el .ics")).toBeInTheDocument());
  });

  it("settles quietly on 'Ahora no', with no receipt to show", async () => {
    renderButton();
    await join();
    await waitFor(() => expect(google()).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));

    await waitFor(() => expect(screen.getByText(/✓ Vas/)).toBeInTheDocument());
    expect(screen.queryByText(/Agregada a|Descargamos/)).not.toBeInTheDocument();
    expect(google()).not.toBeInTheDocument();
  });

  it("keeps the day page's longer leave label", async () => {
    renderButton("detail");
    await join();
    await waitFor(() => expect(google()).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));

    await waitFor(() =>
      expect(screen.getByText("✓ Vas — tocá para bajarte")).toBeInTheDocument()
    );
  });

  // Nothing happened, so nothing is asked — a replayed form must not reopen a
  // question that was already answered. The revalidation the action ran will
  // swap this button for the server's own "✓ Vas"; that is not this component's
  // job, so it simply stays quiet.
  it("asks nothing when the person was already going", async () => {
    joinDayMock.mockResolvedValue(null);
    renderButton();
    await join();

    expect(google()).not.toBeInTheDocument();
    expect(apple()).not.toBeInTheDocument();
    expect(screen.queryByText(/Agregada a|Descargamos/)).not.toBeInTheDocument();
  });

  it("names the fix when the join fails, and asks nothing", async () => {
    joinDayMock.mockRejectedValue(new Error("Day is full"));
    renderButton();
    await join();

    await waitFor(() =>
      expect(
        screen.getByText("No pudimos sumarte. Probá de nuevo en un ratito.")
      ).toBeInTheDocument()
    );
    expect(google()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sumarme" })).toBeInTheDocument();
  });

  it("does not fire twice while the first join is still in flight", async () => {
    let release: (value: unknown) => void = () => {};
    joinDayMock.mockReturnValue(new Promise((resolve) => (release = resolve)));

    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Sumarme" }));
    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    fireEvent.click(screen.getByRole("button"));

    expect(joinDayMock).toHaveBeenCalledTimes(1);
    release(RESULT);
  });

  it("keeps a full day from being joined at all", () => {
    render(
      <JoinDayButton dayId="day_1" variant="feed" className="btn-primary" disabled>
        Completo
      </JoinDayButton>
    );

    expect(screen.getByRole("button", { name: "Completo" })).toBeDisabled();
  });
});
