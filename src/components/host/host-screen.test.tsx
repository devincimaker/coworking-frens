import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HostDayData, HostPlaceData } from "@/components/host/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/actions", () => ({
  cancelDay: vi.fn(),
  deleteRule: vi.fn(),
  openDay: vi.fn(),
  removeAttendee: vi.fn(),
  savePlace: vi.fn(),
  toggleRule: vi.fn(),
  updateDay: vi.fn(),
}));

// The address picker reaches for the Google Maps SDK on mount.
vi.mock("@/components/google-address-picker", () => ({
  GoogleAddressPicker: () => null,
}));

import { HostScreen } from "@/components/host/host-screen";

const place: HostPlaceData = {
  nickname: "El Nido",
  address: "Gorriti 4380, Palermo",
  googlePlaceId: null,
  latitude: null,
  longitude: null,
  addressLine1: null,
  addressNeighborhood: "Palermo",
  addressCity: null,
  addressRegion: null,
  addressCountry: null,
  addressPostalCode: null,
  arrivalNotes: "",
  amenityKeys: ["wifi_rapido", "mate"],
  defaultCapacity: 4,
  photos: [{ id: "photo_1", url: "https://example.com/nido.jpg" }],
};

const fullDay: HostDayData = {
  id: "day_1",
  date: "2026-07-30",
  startTime: "09:00",
  endTime: "17:00",
  capacity: 2,
  description: "",
  circleName: null,
  audienceKind: "friends",
  attendees: [
    { id: "u1", name: "Marco Gilardi", image: null, joinedLabel: "se sumó ayer" },
    { id: "u2", name: "Lea Ruiz", image: null, joinedLabel: "se sumó hoy" },
  ],
};

function renderHost(overrides: Partial<React.ComponentProps<typeof HostScreen>> = {}) {
  return render(
    <HostScreen
      hostId="me"
      today="2026-07-28"
      googleMapsApiKey=""
      friendCount={10}
      inviteUrl="https://frens.test/invite/tok"
      place={place}
      days={[]}
      rules={[]}
      circles={[]}
      {...overrides}
    />
  );
}

afterEach(cleanup);

describe("the invite block", () => {
  it("explains how to reach people when the host has no friends yet", () => {
    renderHost({ friendCount: 0 });

    expect(screen.getByRole("heading", { name: "Cómo invitar gente" })).toBeInTheDocument();
    expect(screen.getByText("https://frens.test/invite/tok")).toBeInTheDocument();
  });

  it("stays out of the way once there is somebody to tell", () => {
    renderHost({ friendCount: 10 });

    expect(screen.queryByText("Cómo invitar gente")).not.toBeInTheDocument();
    expect(screen.queryByText("https://frens.test/invite/tok")).not.toBeInTheDocument();
  });
});

describe("the composer's audience select", () => {
  it("offers friends of friends between all-friends and the circles", () => {
    renderHost({ circles: [{ id: "circle_1", name: "deep work" }] });

    const select = screen.getByLabelText("Quién puede venir");
    const labels = Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent
    );
    expect(labels).toEqual(["Todos mis amigos", "Amigos de amigos", "Solo “deep work”"]);
    expect(screen.getByRole("option", { name: "Amigos de amigos" })).toHaveValue(
      "friends_of_friends"
    );
  });
});

describe("a day with every chair taken", () => {
  it("says so, and points at the way to make room", () => {
    renderHost({ days: [fullDay] });

    expect(screen.getByText("Completo")).toBeInTheDocument();
    expect(screen.getByText(/Sumá una silla desde el lápiz/)).toBeInTheDocument();
    for (const [name, href] of [
      ["Marco", "/u/u1"],
      ["Lea", "/u/u2"],
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveClass("profile-link");
      expect(link.querySelector("[data-profile-label]")).toHaveTextContent(name);
    }
    expect(screen.getByRole("link", { name: "Marco" }).parentElement?.parentElement).toHaveTextContent(
      "Marco y Lea vienen"
    );
    expect(screen.getByText("2 sillas tomadas de 2")).toBeInTheDocument();
  });

  it("counts the free chairs while any are left", () => {
    renderHost({ days: [{ ...fullDay, capacity: 4 }] });

    expect(screen.getByText("2 lugares")).toBeInTheDocument();
    expect(screen.queryByText("Completo")).not.toBeInTheDocument();
    expect(screen.queryByText(/Sumá una silla desde el lápiz/)).not.toBeInTheDocument();
  });
});
