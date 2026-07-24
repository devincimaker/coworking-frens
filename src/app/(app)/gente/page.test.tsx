import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const friendConnectionStatesMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
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
  sendFriendRequestFromGente: vi.fn(),
}));

import GentePage from "./page";

describe("GentePage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "me" } });
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "ana",
        name: "Ana Dev",
        username: "ana",
        image: null,
        bio: "Diseño, producto y mate.",
      },
      {
        id: "emi",
        name: "Emi Torres",
        username: "emi",
        image: null,
        bio: "Deep work por la mañana.",
      },
      {
        id: "fran",
        name: "Fran Ruiz",
        username: "fran",
        image: null,
        bio: "Frontend y café.",
      },
    ]);
  });

  it("renders public profile cards with state-aware friend controls", async () => {
    friendConnectionStatesMock.mockResolvedValue(
      new Map([
        ["ana", { kind: "none" }],
        ["emi", { kind: "incoming_pending", requestId: "request_1" }],
        ["fran", { kind: "outgoing_pending", requestId: "request_2" }],
      ])
    );

    render(await GentePage());

    expect(screen.getByRole("heading", { name: "Gente" })).toBeInTheDocument();
    expect(screen.getByText("3 perfiles")).toBeInTheDocument();
    expect(screen.getByText("Ana Dev")).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("Diseño, producto y mate.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sumar amigo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeInTheDocument();
    expect(screen.getByText("pedido enviado")).toBeInTheDocument();
  });
});
