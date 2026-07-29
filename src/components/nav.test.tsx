import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/juntadas"));

vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { BottomNav, Sidebar } from "./nav";

describe("friend request navigation badge", () => {
  afterEach(() => {
    cleanup();
    pathnameMock.mockReturnValue("/juntadas");
  });

  it("shows the persistent incoming count in the desktop menu", () => {
    render(
      <Sidebar
        user={{ name: "Ana", username: "ana", image: null }}
        signOutAction={vi.fn()}
        unseenFriendRequestCount={2}
      />
    );

    expect(screen.getByLabelText("2 pedidos de amistad nuevos")).toHaveTextContent("2");
  });

  it("uses a compact capped count in the mobile tab bar", () => {
    render(<BottomNav unseenFriendRequestCount={12} />);

    expect(screen.getByLabelText("12 pedidos de amistad nuevos")).toHaveTextContent("9+");
  });

  it("does not show a badge without incoming requests", () => {
    render(<BottomNav unseenFriendRequestCount={0} />);

    expect(screen.queryByLabelText(/pedidos de amistad nuevos/)).not.toBeInTheDocument();
  });

  it("hides the badge immediately while Amigos is open", () => {
    pathnameMock.mockReturnValue("/friends");

    render(<BottomNav unseenFriendRequestCount={2} />);

    expect(screen.queryByLabelText(/pedidos de amistad nuevos/)).not.toBeInTheDocument();
  });
});
