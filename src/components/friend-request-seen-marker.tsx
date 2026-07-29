"use client";

import { useEffect } from "react";
import { markFriendRequestBadgeSeen } from "@/lib/actions";

export function FriendRequestSeenMarker({ requestIds }: { requestIds: string[] }) {
  // Mark only after Amigos has mounted in the browser. A prefetched route must not
  // consume the badge before the person actually visits the screen.
  useEffect(() => {
    if (requestIds.length === 0) return;
    // Failure is safe: the requests stay unseen and the badge can reappear later.
    void markFriendRequestBadgeSeen(requestIds).catch(() => undefined);
  }, [requestIds]);

  return null;
}
