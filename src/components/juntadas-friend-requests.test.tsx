import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actionsMock = vi.hoisted(() => ({
  acceptFriendRequest: vi.fn(),
  markJuntadasFriendRequestBatchShown: vi.fn(),
  postponeFriendRequestFromJuntadas: vi.fn(),
}));

vi.mock("@/lib/actions", () => actionsMock);
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import {
  JuntadasFriendRequests,
  type JuntadasFriendRequest,
} from "./juntadas-friend-requests";

const requests: JuntadasFriendRequest[] = [
  {
    id: "request_1",
    profileHref: "/u/mateo",
    requester: { name: "Mateo Peralta", image: null, fallbackName: "mateo" },
    signal: "2 amigos en común",
  },
  {
    id: "request_2",
    profileHref: "/u/lucia",
    requester: { name: "Lucía Cabrera", image: null, fallbackName: "lucia" },
    signal: "Casa Villa Crespo · vie 24 jul",
  },
];

describe("JuntadasFriendRequests", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    actionsMock.acceptFriendRequest.mockResolvedValue(undefined);
    actionsMock.markJuntadasFriendRequestBatchShown.mockResolvedValue(undefined);
    actionsMock.postponeFriendRequestFromJuntadas.mockResolvedValue(undefined);
  });

  it("marks the batch only after the client has mounted it", async () => {
    render(<JuntadasFriendRequests initialRequests={requests} />);

    await waitFor(() =>
      expect(actionsMock.markJuntadasFriendRequestBatchShown).toHaveBeenCalledWith([
        "request_1",
        "request_2",
      ])
    );
  });

  it("keeps the rest of the mounted batch visible after accepting one request", async () => {
    render(<JuntadasFriendRequests initialRequests={requests} />);

    const acceptButtons = screen.getAllByRole("button", { name: "Aceptar" });
    fireEvent.click(acceptButtons[0]);

    await waitFor(() => expect(screen.queryByText("Mateo Peralta")).not.toBeInTheDocument());
    expect(screen.getByText("Lucía Cabrera")).toBeInTheDocument();
    expect(screen.getByText("1 persona te quiere sumar")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Lucía Cabrera").closest('[tabindex="-1"]')).toHaveFocus()
    );
    expect(actionsMock.acceptFriendRequest).toHaveBeenCalledWith(expect.any(FormData));
  });

  it("removes a postponed row without declining it", async () => {
    render(<JuntadasFriendRequests initialRequests={requests.slice(0, 1)} />);

    fireEvent.click(screen.getByRole("button", { name: "Después" }));

    await waitFor(() => expect(screen.queryByText("Mateo Peralta")).not.toBeInTheDocument());
    expect(actionsMock.postponeFriendRequestFromJuntadas).toHaveBeenCalledWith(
      expect.any(FormData)
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pedido de Mateo Peralta guardado para después."
    );
  });

  it("keeps a failed row available and explains how to recover", async () => {
    actionsMock.acceptFriendRequest.mockRejectedValue(new Error("network"));
    render(<JuntadasFriendRequests initialRequests={requests.slice(0, 1)} />);

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar eso. Probá de nuevo."
    );
    expect(screen.getByText("Mateo Peralta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeEnabled();
  });
});
