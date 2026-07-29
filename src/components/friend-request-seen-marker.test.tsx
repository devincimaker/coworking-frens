import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const markSeenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions", () => ({ markFriendRequestBadgeSeen: markSeenMock }));

import { FriendRequestSeenMarker } from "./friend-request-seen-marker";

describe("FriendRequestSeenMarker", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    markSeenMock.mockResolvedValue(undefined);
  });

  it("marks the rendered incoming requests after Amigos mounts", async () => {
    render(<FriendRequestSeenMarker requestIds={["request_1", "request_2"]} />);

    await waitFor(() =>
      expect(markSeenMock).toHaveBeenCalledWith(["request_1", "request_2"])
    );
  });

  it("does nothing when there are no new requests", () => {
    render(<FriendRequestSeenMarker requestIds={[]} />);

    expect(markSeenMock).not.toHaveBeenCalled();
  });

  it("fails safely so an unsuccessful update can leave the badge unseen", async () => {
    markSeenMock.mockRejectedValue(new Error("network"));

    render(<FriendRequestSeenMarker requestIds={["request_1"]} />);

    await waitFor(() => expect(markSeenMock).toHaveBeenCalledWith(["request_1"]));
  });
});
