import { describe, expect, it } from "vitest";
import {
  AMENITIES,
  AMENITY_GROUPS,
  amenitiesFor,
  amenityByKey,
  parseAmenityKeys,
} from "@/lib/amenities";

describe("the catalogue itself", () => {
  it("has no repeated keys", () => {
    const keys = AMENITIES.map((amenity) => amenity.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("files every amenity under a declared group", () => {
    const groups = new Set(AMENITY_GROUPS.map((group) => group.key));
    for (const amenity of AMENITIES) {
      expect(groups.has(amenity.group)).toBe(true);
    }
  });

  it("leaves no group empty, so the picker never shows a bare heading", () => {
    for (const group of AMENITY_GROUPS) {
      expect(AMENITIES.some((amenity) => amenity.group === group.key)).toBe(true);
    }
  });
});

describe("amenitiesFor", () => {
  it("reads in catalogue order, whatever order the column stored", () => {
    const labels = amenitiesFor(["mate", "wifi_rapido", "aire"]).map((a) => a.label);

    expect(labels).toEqual(["Internet rápido", "Aire acondicionado", "Mate"]);
  });

  it("drops keys the catalogue no longer knows instead of rendering them raw", () => {
    expect(amenitiesFor(["wifi_rapido", "jacuzzi_infinito"]).map((a) => a.key)).toEqual([
      "wifi_rapido",
    ]);
  });

  it("is empty for a place that picked nothing", () => {
    expect(amenitiesFor([])).toEqual([]);
  });
});

describe("parseAmenityKeys", () => {
  it("keeps only real keys and throws away whatever else was posted", () => {
    expect(parseAmenityKeys(["mate", "definitely-not-real", "", null])).toEqual(["mate"]);
  });

  it("collapses repeats and normalizes order", () => {
    expect(parseAmenityKeys(["mate", "wifi_rapido", "mate"])).toEqual(["wifi_rapido", "mate"]);
  });
});

describe("amenityByKey", () => {
  it("resolves a label", () => {
    expect(amenityByKey("pet_friendly")?.label).toBe("Venís con tu perro");
  });

  it("returns null for an unknown key", () => {
    expect(amenityByKey("nope")).toBeNull();
  });
});
