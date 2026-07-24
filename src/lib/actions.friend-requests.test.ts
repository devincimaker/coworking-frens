import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());
const requireOnboardedUserMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));
const friendHelpersMock = vi.hoisted(() => ({
  acceptFriendRequestForUser: vi.fn(),
  areFriends: vi.fn(),
  declineFriendRequestForUser: vi.fn(),
  friendsOf: vi.fn(),
  makeFriends: vi.fn(),
  removeFriendForUser: vi.fn(),
  requestFriendFromSharedDay: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/auth", () => ({
  requireOnboardedUser: requireOnboardedUserMock,
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/friends", () => friendHelpersMock);

import {
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequestFromDay,
} from "./actions";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("friend request server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOnboardedUserMock.mockResolvedValue({
      id: "me",
      name: "Ana Dev",
      email: "ana@example.com",
    });
  });

  it("sends a request from a shared day and notifies the recipient", async () => {
    friendHelpersMock.requestFriendFromSharedDay.mockResolvedValue({
      outcome: "requested",
      day: {
        id: "day_1",
        date: "2026-07-28",
        startTime: "09:00",
        endTime: "17:00",
        place: { nickname: "Casa Thames" },
      },
    });
    prismaMock.user.findUnique.mockResolvedValue({ email: "recipient@example.com" });

    await sendFriendRequestFromDay(
      formData({ dayId: "day_1", recipientId: "recipient", profileUserId: "recipient" })
    );

    expect(friendHelpersMock.requestFriendFromSharedDay).toHaveBeenCalledWith({
      requesterId: "me",
      recipientId: "recipient",
      coworkDayId: "day_1",
    });
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["recipient@example.com"],
      "Ana te mandó pedido de amistad",
      expect.stringContaining("Casa Thames")
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/friends");
    expect(revalidatePathMock).toHaveBeenCalledWith("/day/[id]", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/day/day_1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/u/recipient");
  });

  it("does not send duplicate notification emails for already-pending requests", async () => {
    friendHelpersMock.requestFriendFromSharedDay.mockResolvedValue({
      outcome: "pending",
      day: {
        id: "day_1",
        date: "2026-07-28",
        startTime: "09:00",
        endTime: "17:00",
        place: { nickname: "Casa Thames" },
      },
    });

    await sendFriendRequestFromDay(
      formData({ dayId: "day_1", recipientId: "recipient" })
    );

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/day/day_1");
  });

  it("accepts a request, notifies the requester, and revalidates friendship surfaces", async () => {
    friendHelpersMock.acceptFriendRequestForUser.mockResolvedValue({
      id: "request_1",
      requester: { email: "sender@example.com" },
      recipient: { name: "Ana Dev" },
    });

    await acceptFriendRequest(formData({ requestId: "request_1" }));

    expect(friendHelpersMock.acceptFriendRequestForUser).toHaveBeenCalledWith(
      "request_1",
      "me"
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      ["sender@example.com"],
      "Ana aceptó tu pedido",
      expect.stringContaining("Ya pueden ver las juntadas del otro")
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/friends");
    expect(revalidatePathMock).toHaveBeenCalledWith("/day/[id]", "page");
  });

  it("declines a request without notifying the requester", async () => {
    await declineFriendRequest(formData({ requestId: "request_1" }));

    expect(friendHelpersMock.declineFriendRequestForUser).toHaveBeenCalledWith(
      "request_1",
      "me"
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/friends");
    expect(revalidatePathMock).toHaveBeenCalledWith("/day/[id]", "page");
  });

  it("removes a friend and revalidates both profiles", async () => {
    await removeFriend(formData({ friendId: "friend" }));

    expect(friendHelpersMock.removeFriendForUser).toHaveBeenCalledWith("me", "friend");
    expect(revalidatePathMock).toHaveBeenCalledWith("/friends");
    expect(revalidatePathMock).toHaveBeenCalledWith("/u/me");
    expect(revalidatePathMock).toHaveBeenCalledWith("/u/friend");
  });
});
