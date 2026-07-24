import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));
const friendsMock = vi.hoisted(() => ({
  FRIEND_REQUEST_DECLINED: "declined",
  friendRequestsForUser: vi.fn(),
  friendsOf: vi.fn(),
}));
const circlesOfMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/friends", () => friendsMock);

vi.mock("@/lib/queries", () => ({
  circlesOf: circlesOfMock,
}));

vi.mock("@/lib/url", () => ({
  appUrl: () => "https://frens.test",
}));

vi.mock("@/lib/actions", () => ({
  acceptFriendRequest: vi.fn(),
  createCircle: vi.fn(),
  declineFriendRequest: vi.fn(),
  deleteCircle: vi.fn(),
  toggleCircleMember: vi.fn(),
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

import FriendsPage from "./page";

const coworkDay = {
  id: "day_1",
  date: "2026-07-28",
  startTime: "09:00",
  endTime: "17:00",
  place: { nickname: "Casa Thames" },
};

describe("FriendsPage friend request lifecycle", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "me" } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "me",
      inviteToken: "invite_1",
    });
    friendsMock.friendsOf.mockResolvedValue([
      {
        id: "friend",
        name: "Fran",
        username: "fran",
        email: "fran@example.com",
        image: null,
        bio: "",
      },
    ]);
    circlesOfMock.mockResolvedValue([]);
  });

  it("renders incoming actions and outgoing pending/declined states", async () => {
    friendsMock.friendRequestsForUser.mockResolvedValue({
      incoming: [
        {
          id: "incoming_1",
          requester: {
            id: "sender",
            name: "Sender",
            username: "sender",
            email: "sender@example.com",
            image: null,
          },
          recipient: {
            id: "me",
            name: "Ana",
            username: "ana",
            email: "ana@example.com",
            image: null,
          },
          coworkDay,
          status: "pending",
        },
      ],
      outgoing: [
        {
          id: "outgoing_1",
          requester: {
            id: "me",
            name: "Ana",
            username: "ana",
            email: "ana@example.com",
            image: null,
          },
          recipient: {
            id: "pending",
            name: "Pending",
            username: "pending",
            email: "pending@example.com",
            image: null,
          },
          coworkDay,
          status: "pending",
        },
        {
          id: "outgoing_2",
          requester: {
            id: "me",
            name: "Ana",
            username: "ana",
            email: "ana@example.com",
            image: null,
          },
          recipient: {
            id: "declined",
            name: "Declined",
            username: "declined",
            email: "declined@example.com",
            image: null,
          },
          coworkDay,
          status: "declined",
        },
      ],
    });

    render(await FriendsPage());

    expect(screen.getByText("Pedidos (3)")).toBeInTheDocument();
    expect(screen.getByText("Aceptar")).toBeInTheDocument();
    expect(screen.getByText("Rechazar")).toBeInTheDocument();
    expect(screen.getByText("pendiente")).toBeInTheDocument();
    expect(screen.getByText("rechazado")).toBeInTheDocument();
    expect(screen.getByText("Todos (1)")).toBeInTheDocument();
  });
});
