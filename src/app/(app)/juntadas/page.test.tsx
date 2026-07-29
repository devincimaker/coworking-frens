import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const feedDaysMock = vi.hoisted(() => vi.fn());
const materializeRulesMock = vi.hoisted(() => vi.fn());
const friendHelpersMock = vi.hoisted(() => ({
  markFriendRequestsShownInJuntadas: vi.fn(),
  mutualFriends: vi.fn(),
  unseenJuntadasFriendRequests: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/queries", () => ({ feedDays: feedDaysMock }));
vi.mock("@/lib/days", () => ({ materializeRules: materializeRulesMock }));
vi.mock("@/lib/friends", () => friendHelpersMock);
vi.mock("@/lib/actions", () => ({
  acceptFriendRequest: vi.fn(),
  markJuntadasFriendRequestBatchShown: vi.fn(),
  postponeFriendRequestFromJuntadas: vi.fn(),
}));
vi.mock("@/components/day-card", () => ({
  DayCard: ({ day }: { day: { id: string } }) => <div>{day.id}</div>,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import FeedPage from "./page";

describe("Juntadas friend request batch", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "me" } });
    materializeRulesMock.mockResolvedValue(undefined);
    feedDaysMock.mockResolvedValue([]);
    friendHelpersMock.mutualFriends.mockResolvedValue(new Map());
    friendHelpersMock.unseenJuntadasFriendRequests.mockResolvedValue([]);
  });

  it("shows unseen requests once and schedules the rendered batch as seen", async () => {
    friendHelpersMock.unseenJuntadasFriendRequests.mockResolvedValue([
      {
        id: "request_1",
        requester: {
          id: "sender",
          name: "Mateo Peralta",
          username: "mateo",
          email: "mateo@example.com",
          image: null,
        },
        coworkDay: null,
      },
    ]);
    friendHelpersMock.mutualFriends.mockResolvedValue(
      new Map([
        [
          "sender",
          [
            { id: "mutual_1", name: "Meli", username: "meli", image: null },
            { id: "mutual_2", name: "Luján", username: "lujan", image: null },
          ],
        ],
      ])
    );

    render(await FeedPage());

    expect(screen.getByText("1 persona te quiere sumar")).toBeInTheDocument();
    expect(screen.getByText("Mateo Peralta")).toBeInTheDocument();
    expect(screen.getByText("2 amigos en común")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Después" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ver todos" })).toHaveAttribute(
      "href",
      "/friends"
    );

    await waitFor(() =>
      expect(friendHelpersMock.unseenJuntadasFriendRequests).toHaveBeenCalledWith("me")
    );
  });

  it("does not render or schedule an empty request batch", async () => {
    render(await FeedPage());

    expect(screen.queryByText(/te quiere sumar/)).not.toBeInTheDocument();
    expect(screen.getByText("Todavía no hay nada en la agenda.")).toBeInTheDocument();
  });
});
