import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const friendConnectionStatesMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  coworkDay: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

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

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/friends", () => ({
  friendConnectionStates: friendConnectionStatesMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/actions", () => ({
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  sendFriendRequestFromDay: vi.fn(),
  sendFriendRequestFromGente: vi.fn(),
}));

import UserProfilePage from "./page";

describe("UserProfilePage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "viewer" } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "profile",
      name: "Emi Torres",
      username: "emi",
      image: null,
      bio: "Diseño y mate.",
      createdAt: new Date("2026-07-20T00:00:00Z"),
    });
    friendConnectionStatesMock.mockResolvedValue(new Map([["profile", { kind: "none" }]]));
    prismaMock.coworkDay.findFirst.mockResolvedValue({
      id: "shared_day",
      date: "2026-07-27",
      place: { nickname: "Casa Compartida" },
    });
    prismaMock.coworkDay.findMany.mockResolvedValue([
      {
        id: "day_1",
        date: "2026-07-28",
        startTime: "10:00",
        endTime: "17:00",
        capacity: 4,
        attendances: [{ user: { id: "viewer", name: "Mauer", image: null } }],
        place: { nickname: "Casa Test" },
      },
    ]);
  });

  it("renders a minimal public profile with visible hosted days", async () => {
    render(await UserProfilePage({ params: Promise.resolve({ id: "profile" }) }));

    expect(screen.getByRole("heading", { name: "Emi Torres" })).toBeInTheDocument();
    expect(screen.getByText("@emi")).toBeInTheDocument();
    expect(screen.getByText("Diseño y mate.")).toBeInTheDocument();
    expect(screen.getByText("Coincidieron en una juntada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sumar amigo" })).toBeInTheDocument();
    expect(screen.getByText("contexto: Casa Compartida · Lun 27 jul")).toHaveAttribute(
      "href",
      "/day/shared_day"
    );
    expect(screen.getByText("Casa Test")).toBeInTheDocument();
  });

  it("links the viewer's own profile to profile editing", async () => {
    authMock.mockResolvedValue({ user: { id: "profile" } });

    render(await UserProfilePage({ params: Promise.resolve({ id: "profile" }) }));

    expect(screen.getByText("Tu perfil")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar perfil" })).toHaveAttribute(
      "href",
      "/profile"
    );
  });

  it("renders incoming request actions", async () => {
    friendConnectionStatesMock.mockResolvedValue(
      new Map([["profile", { kind: "incoming_pending", requestId: "request_1" }]])
    );

    render(await UserProfilePage({ params: Promise.resolve({ id: "profile" }) }));

    expect(screen.getByText("Pedido pendiente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptar pedido" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeInTheDocument();
  });

  it("lets people send a request without shared-day context", async () => {
    prismaMock.coworkDay.findFirst.mockResolvedValue(null);
    prismaMock.coworkDay.findMany.mockResolvedValue([]);

    render(await UserProfilePage({ params: Promise.resolve({ id: "profile" }) }));

    expect(screen.getByText("En Frens")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sumar amigo" })).toBeInTheDocument();
    expect(screen.queryByText(/contexto:/)).not.toBeInTheDocument();
  });

  it("renders the remove friend action for friends", async () => {
    friendConnectionStatesMock.mockResolvedValue(
      new Map([["profile", { kind: "friends" }]])
    );

    render(await UserProfilePage({ params: Promise.resolve({ id: "profile" }) }));

    expect(screen.getByText("Amigo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar amigo" })).toBeInTheDocument();
    expect(screen.queryByText(/contexto:/)).not.toBeInTheDocument();
  });
});
