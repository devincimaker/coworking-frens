import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AmenitiesField } from "@/components/host/amenities-field";
import { AmenityIcon } from "@/components/amenity-icon";
import { AMENITIES, AMENITY_GROUPS } from "@/lib/amenities";

afterEach(cleanup);

describe("AmenitiesField", () => {
  it("offers the whole catalogue as one field, so the action can read getAll", () => {
    const { container } = render(<AmenitiesField selected={[]} />);
    const boxes = container.querySelectorAll<HTMLInputElement>('input[name="amenityKeys"]');

    expect(boxes).toHaveLength(AMENITIES.length);
    expect([...boxes].every((box) => box.type === "checkbox")).toBe(true);
  });

  it("checks what the place already picked and nothing else", () => {
    const { container } = render(<AmenitiesField selected={["mate", "pet_friendly"]} />);
    const checked = [...container.querySelectorAll<HTMLInputElement>("input:checked")].map(
      (box) => box.value
    );

    expect(checked.sort()).toEqual(["mate", "pet_friendly"]);
  });

  it("ignores a key the catalogue has since dropped", () => {
    const { container } = render(<AmenitiesField selected={["hay_perro"]} />);

    expect(container.querySelectorAll("input:checked")).toHaveLength(0);
  });

  it("takes no free text — the catalogue is the whole vocabulary", () => {
    const { container } = render(<AmenitiesField selected={[]} />);

    expect(container.querySelector('input[type="text"], textarea')).toBeNull();
    expect(container.querySelector('input[name="amenityNote"]')).toBeNull();
  });

  it("shows a label for every option, exactly once", () => {
    render(<AmenitiesField selected={["mate"]} />);

    for (const amenity of AMENITIES) {
      expect(screen.getByText(amenity.label)).toBeInTheDocument();
    }
  });
});

describe("AmenitiesField folding", () => {
  it("starts with every group shut, so the field is four rows on a phone", () => {
    render(<AmenitiesField selected={["mate"]} />);

    for (const group of AMENITY_GROUPS) {
      expect(screen.getByRole("button", { name: new RegExp(group.title) })).toHaveAttribute(
        "aria-expanded",
        "false"
      );
    }
  });

  it("opens a group without shutting the one already open", () => {
    render(<AmenitiesField selected={[]} />);
    const cocina = screen.getByRole("button", { name: /La cocina/ });
    const casa = screen.getByRole("button", { name: /La casa/ });

    fireEvent.click(cocina);
    fireEvent.click(casa);

    expect(cocina).toHaveAttribute("aria-expanded", "true");
    expect(casa).toHaveAttribute("aria-expanded", "true");
  });

  it("counts each group against its own size", () => {
    render(<AmenitiesField selected={["mate", "cafe"]} />);

    expect(screen.getByRole("button", { name: /La cocina/ })).toHaveTextContent("2/3");
    expect(screen.getByRole("button", { name: /Para trabajar/ })).toHaveTextContent("0/4");
  });

  it("keeps a shut group's picks in the form — a hidden input still submits", () => {
    const { container } = render(<AmenitiesField selected={["mate", "pileta"]} />);
    const checked = [...container.querySelectorAll<HTMLInputElement>("input:checked")].map(
      (box) => box.value
    );

    expect(checked.sort()).toEqual(["mate", "pileta"]);
  });

  it("moves the running total as things are picked", () => {
    const { container } = render(<AmenitiesField selected={["mate"]} />);
    expect(screen.getByText(`El setup · 1 de ${AMENITIES.length}`)).toBeInTheDocument();

    fireEvent.click(container.querySelector('input[value="cafe"]')!);

    expect(container.querySelectorAll("input:checked")).toHaveLength(2);
    expect(screen.getByText(`El setup · 2 de ${AMENITIES.length}`)).toBeInTheDocument();
  });
});

describe("AmenityIcon", () => {
  it("draws a glyph for every catalogue key", () => {
    for (const amenity of AMENITIES) {
      const { container } = render(<AmenityIcon amenityKey={amenity.key} />);
      expect(container.querySelector("svg"), `no glyph for ${amenity.key}`).not.toBeNull();
      cleanup();
    }
  });

  it("draws nothing rather than an empty box for an unknown key", () => {
    const { container } = render(<AmenityIcon amenityKey="jacuzzi_infinito" />);

    expect(container.querySelector("svg")).toBeNull();
  });
});
