import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actionsMock = vi.hoisted(() => ({
  createCircle: vi.fn(),
  deleteCircle: vi.fn(),
  toggleCircleMember: vi.fn(),
}));

vi.mock("@/lib/actions", () => actionsMock);

import { Circles, type CircleFriend, type CircleSummary } from "./circles";

const valen: CircleFriend = { id: "valen", name: "Valentina Ruiz", image: null };
const nico: CircleFriend = { id: "nico", name: "Nicolás Pérez", image: null };
const tomi: CircleFriend = { id: "tomi", name: "Tomás Aguirre", image: null };
const friends = [valen, nico, tomi];

function circle(members: CircleFriend[]): CircleSummary {
  return { id: "circle_1", name: "Los del barrio", members };
}

describe("Circles", () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it("shows a circle as a name, a member count and its faces until you open it", () => {
    render(<Circles circles={[circle([valen, nico])]} friends={friends} />);

    expect(screen.getByText("Círculos")).toBeInTheDocument();
    expect(screen.getByText("2 personas")).toBeInTheDocument();
    // Editing is a separate mode: no toggles on the collapsed row.
    expect(screen.queryByText(/Quién está adentro/i)).not.toBeInTheDocument();
  });

  it("puts the members first once open, so who is in reads before who is not", () => {
    render(<Circles circles={[circle([tomi])]} friends={friends} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const names = screen
      .getAllByRole("button")
      .map((button) => button.textContent ?? "")
      .filter((label) => /Valentina|Nicolás|Tomás/.test(label));
    expect(names[0]).toContain("Tomás");
  });

  /**
   * The invariant createCircle enforces, said in the interface: taking out the
   * last member is a request to delete the circle, and it gets asked as one.
   */
  it("asks about deleting instead of emptying the last member out", () => {
    render(<Circles circles={[circle([valen])]} friends={friends} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: /Valentina/ }));

    expect(
      screen.getByText(/Si sacás a Valentina, el círculo queda vacío/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrar círculo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dejarlo así" })).toBeInTheDocument();
  });

  it("warns that deleting a circle switches off the days aimed at it", () => {
    render(<Circles circles={[circle([valen, nico])]} friends={friends} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(
      screen.getByText(/los días fijos que apuntaban a este círculo se desactivan/)
    ).toBeInTheDocument();
  });

  it("keeps Crear switched off until somebody is picked", () => {
    render(<Circles circles={[]} friends={friends} />);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo círculo" }));

    expect(screen.getByRole("button", { name: "Crear" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Valentina/ }));
    expect(screen.getByRole("button", { name: "Crear con 1" })).toBeEnabled();
  });

  it("offers nothing to create when there is nobody to put in a circle", () => {
    render(<Circles circles={[]} friends={[]} />);

    expect(screen.queryByRole("button", { name: "Nuevo círculo" })).not.toBeInTheDocument();
    expect(screen.getByText(/Primero sumá amigos/)).toBeInTheDocument();
  });
});
