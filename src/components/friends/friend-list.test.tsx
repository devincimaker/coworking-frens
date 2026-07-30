import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { FriendList, type ListedFriend } from "./friend-list";

function friend(overrides: Partial<ListedFriend> & { id: string }): ListedFriend {
  return {
    name: overrides.id,
    username: overrides.id,
    email: `${overrides.id}@test.dev`,
    image: null,
    hosted: 0,
    ...overrides,
  };
}

const many = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    friend({ id: `p${index}`, name: `Persona ${index}`, username: `p${index}` })
  );

describe("FriendList", () => {
  afterEach(cleanup);

  it("tags whoever hosts, and says nothing about whoever does not", () => {
    render(
      <FriendList
        friends={[
          friend({ id: "valen", name: "Valentina Ruiz", username: "valen", hosted: 12 }),
          friend({ id: "nico", name: "Nicolás Pérez", username: "nico" }),
        ]}
      />
    );

    expect(screen.getByText("recibió 12 juntadas")).toBeInTheDocument();
    expect(screen.getByText("@valen")).toBeInTheDocument();
    expect(screen.getByText("@nico")).toBeInTheDocument();
    expect(screen.queryByText(/recibió 0/)).not.toBeInTheDocument();
  });

  // Names are spelled with accents and typed without them.
  it("finds Tomás when you type tomas", () => {
    render(<FriendList friends={[...many(9), friend({ id: "t", name: "Tomás Aguirre", username: "tomi" })]} />);

    fireEvent.change(screen.getByLabelText("Buscá un amigo"), { target: { value: "tomas" } });

    expect(screen.getByText("Tomás Aguirre")).toBeInTheDocument();
    expect(screen.queryByText("Persona 0")).not.toBeInTheDocument();
  });

  it("says so rather than showing an empty grid when nothing matches", () => {
    render(<FriendList friends={many(9)} />);

    fireEvent.change(screen.getByLabelText("Buscá un amigo"), { target: { value: "zzz" } });

    expect(screen.getByText(/Ninguno de tus amigos se llama/)).toBeInTheDocument();
  });

  // A search field over three people costs more than it saves.
  it("does not offer a search until the list is long enough to need one", () => {
    render(<FriendList friends={many(4)} />);
    expect(screen.queryByLabelText("Buscá un amigo")).not.toBeInTheDocument();
  });

  it("points at the invite button when there is nobody yet", () => {
    render(<FriendList friends={[]} />);
    expect(screen.getByText(/mandá tu link con el botón Invitar/)).toBeInTheDocument();
  });
});
