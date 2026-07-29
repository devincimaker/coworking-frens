import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/actions", () => ({
  joinDay: vi.fn(),
  leaveDay: vi.fn(),
}));

import { DayCard } from "./day-card";

const day = {
  id: "day_1",
  hostId: "host",
  date: "2026-07-28",
  startTime: "09:00",
  endTime: "17:00",
  capacity: 4,
  description: "",
  host: { id: "host", name: "Ana Suarez", image: null },
  circle: { id: "circle_1", name: "deep work" },
  place: {
    nickname: "El Nido",
    address: "Gorriti 4380, Palermo",
    addressNeighborhood: "Palermo",
    addressCity: "Buenos Aires",
    addressRegion: "CABA",
    amenityKeys: [],
    photos: [],
  },
  attendances: [],
};

describe("DayCard audience label", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the selected circle when the viewer is the host", () => {
    render(<DayCard day={day} userId="host" />);

    expect(screen.getByText("para “deep work”")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lo hosteás vos/ })).toHaveAttribute(
      "href",
      "/profile"
    );
  });

  it("does not show the host-only audience label to guests", () => {
    render(<DayCard day={day} userId="guest" />);

    expect(screen.queryByText("para “deep work”")).not.toBeInTheDocument();
    expect(screen.getByText("anfitrión")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lo hostea Ana/ })).toHaveAttribute(
      "href",
      "/u/host"
    );
  });
});

describe("DayCard setup chips", () => {
  afterEach(() => {
    cleanup();
  });

  it("labels each amenity from the catalogue, in catalogue order", () => {
    const place = { ...day.place, amenityKeys: ["mate", "wifi_rapido"] };
    render(<DayCard day={{ ...day, place }} userId="guest" />);

    const chips = screen.getAllByText(/Internet rápido|Mate/);
    expect(chips.map((chip) => chip.textContent)).toEqual(["Internet rápido", "Mate"]);
  });

  it("counts what does not fit rather than dropping it silently", () => {
    const place = {
      ...day.place,
      amenityKeys: ["mate", "wifi_rapido", "monitor", "aire", "pileta", "consola"],
    };
    render(<DayCard day={{ ...day, place }} userId="guest" />);

    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.queryByText("Consola de juegos")).not.toBeInTheDocument();
  });

  it("shows nothing at all when the host has picked nothing", () => {
    const { container } = render(<DayCard day={day} userId="guest" />);

    expect(container.querySelector("svg")).toBeNull();
  });
});
