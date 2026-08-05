import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const dayForUserMock = vi.hoisted(() => vi.fn());
const hostedJuntadasForMock = vi.hoisted(() => vi.fn(async () => new Map<string, number>()));
const friendConnectionStatesMock = vi.hoisted(() => vi.fn());
const mutualFriendsMock = vi.hoisted(() => vi.fn(async () => new Map()));

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

vi.mock("@/lib/queries", () => ({
  dayForUser: dayForUserMock,
  hostedJuntadasFor: hostedJuntadasForMock,
}));

vi.mock("@/lib/friends", () => ({
  friendConnectionStates: friendConnectionStatesMock,
  mutualFriends: mutualFriendsMock,
}));

vi.mock("@/lib/actions", () => ({
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  joinDay: vi.fn(),
  leaveDay: vi.fn(),
  removeAttendee: vi.fn(),
  sendFriendRequestFromDay: vi.fn(),
}));

vi.mock("@/components/edit-day-form", () => ({
  DayOwnerControls: () => null,
}));

import DayPage from "./page";

function attendee(id: string, name: string) {
  return { user: { id, name, image: null } };
}

function dayWithAttendees(
  attendees: ReturnType<typeof attendee>[],
  overrides: Record<string, unknown> = {}
) {
  return {
    id: "day_1",
    hostId: "host",
    status: "open",
    capacity: 8,
    date: "2026-07-28",
    startTime: "09:00",
    endTime: "17:00",
    description: "",
    host: { id: "host", name: "Host Person", image: null, email: "host@example.com" },
    place: {
      nickname: "Casa Thames",
      address: "Thames 123",
      googlePlaceId: null,
      latitude: null,
      longitude: null,
      amenityKeys: [],
      arrivalNotes: "",
      photos: [],
    },
    attendances: attendees,
    circle: null,
    rule: null,
    audienceKind: "friends",
    ...overrides,
  };
}

describe("DayPage friend request controls", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    authMock.mockReset();
    dayForUserMock.mockReset();
    friendConnectionStatesMock.mockReset();
    mutualFriendsMock.mockReset();
    mutualFriendsMock.mockResolvedValue(new Map());
    authMock.mockResolvedValue({ user: { id: "me" } });
  });

  it("renders shared-day friend request lifecycle controls for attendees", async () => {
    dayForUserMock.mockResolvedValue(
      dayWithAttendees([
        attendee("me", "Ana"),
        attendee("none", "Noe"),
        attendee("friend", "Fran"),
        attendee("outgoing", "Olga"),
        attendee("incoming", "Ivo"),
        attendee("they_said_no", "Dina"),
      ])
    );
    friendConnectionStatesMock.mockResolvedValue(
      new Map([
        ["me", { kind: "self" }],
        ["none", { kind: "none" }],
        ["friend", { kind: "friends" }],
        ["outgoing", { kind: "outgoing_pending", requestId: "request_out" }],
        ["incoming", { kind: "incoming_pending", requestId: "request_in" }],
        // Dina turned Ana down; Ana is shown the plain "sumar amigo" she would
        // see for a stranger.
        ["they_said_no", { kind: "none" }],
      ])
    );

    render(await DayPage({ params: Promise.resolve({ id: "day_1" }) }));

    expect(friendConnectionStatesMock).toHaveBeenCalledWith("me", [
      "host",
      "me",
      "none",
      "friend",
      "outgoing",
      "incoming",
      "they_said_no",
    ]);
    expect(screen.getAllByText("sumar amigo")).toHaveLength(2);
    expect(screen.getByText("amigo")).toBeInTheDocument();
    expect(screen.getByText("pedido enviado")).toBeInTheDocument();
    expect(screen.getByText("aceptar")).toBeInTheDocument();
    expect(screen.getByText("rechazar")).toBeInTheDocument();
    expect(screen.queryByText("pedir otra vez")).not.toBeInTheDocument();
  });

  it("does not render request controls before the current user joins the day", async () => {
    dayForUserMock.mockResolvedValue(dayWithAttendees([attendee("other", "Other")]));

    render(await DayPage({ params: Promise.resolve({ id: "day_1" }) }));

    expect(friendConnectionStatesMock).not.toHaveBeenCalled();
    expect(screen.queryByText("sumar amigo")).not.toBeInTheDocument();
    expect(screen.getByText("Sumarme")).toBeInTheDocument();
  });

  it("shows the cancellation reason on a cancelled day", async () => {
    dayForUserMock.mockResolvedValue(
      dayWithAttendees([attendee("other", "Other")], {
        status: "cancelled",
        cancellationReason: "Me enfermé",
      })
    );

    render(await DayPage({ params: Promise.resolve({ id: "day_1" }) }));

    expect(screen.getByText("Esta juntada fue cancelada.")).toBeInTheDocument();
    expect(screen.getByText("“Me enfermé”")).toBeInTheDocument();
    expect(screen.queryByText("Sumarme")).not.toBeInTheDocument();
  });

  it("shows the selected circle to the host", async () => {
    dayForUserMock.mockResolvedValue(
      dayWithAttendees([attendee("guest", "Guest")], {
        hostId: "me",
        circle: { id: "circle_1", name: "deep work" },
      })
    );

    render(await DayPage({ params: Promise.resolve({ id: "day_1" }) }));

    expect(screen.getByText("Para “deep work”")).toBeInTheDocument();
  });

  it("tells the host a friends-of-friends day is open that wide", async () => {
    dayForUserMock.mockResolvedValue(
      dayWithAttendees([], { hostId: "me", audienceKind: "friends_of_friends" })
    );

    render(await DayPage({ params: Promise.resolve({ id: "day_1" }) }));

    expect(screen.getByText("Para amigos de amigos")).toBeInTheDocument();
    expect(mutualFriendsMock).not.toHaveBeenCalled();
  });

  it("explains a friends-of-friends day to guests through the mutual connection", async () => {
    dayForUserMock.mockResolvedValue(
      dayWithAttendees([attendee("stranger", "Sole Paz")], {
        audienceKind: "friends_of_friends",
      })
    );
    friendConnectionStatesMock.mockResolvedValue(
      new Map([
        ["host", { kind: "none" }],
        ["stranger", { kind: "none" }],
      ])
    );
    mutualFriendsMock.mockResolvedValue(
      new Map([
        ["host", [{ id: "marco", name: "Marco Rey", username: "marco", image: null }]],
        ["stranger", []],
      ])
    );

    render(await DayPage({ params: Promise.resolve({ id: "day_1" }) }));

    expect(mutualFriendsMock).toHaveBeenCalledWith("me", ["host", "stranger"]);
    expect(screen.getByText("Abierta a amigos de amigos")).toBeInTheDocument();
    // The host row names the path; the attendee with no shared friend gets no line.
    expect(screen.getByText(/amigo de Marco/)).toBeInTheDocument();
    // Not attending yet, so the request controls stay hidden.
    expect(screen.queryByText("sumar amigo")).not.toBeInTheDocument();
  });

  it("keeps friends-of-friends copy off ordinary all-friends days", async () => {
    dayForUserMock.mockResolvedValue(dayWithAttendees([attendee("other", "Other")]));

    render(await DayPage({ params: Promise.resolve({ id: "day_1" }) }));

    expect(screen.queryByText(/amigos de amigos/)).not.toBeInTheDocument();
    expect(mutualFriendsMock).not.toHaveBeenCalled();
  });
});
