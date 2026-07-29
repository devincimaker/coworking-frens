// What a place shows publicly before anyone has joined: the area, never the street.
// The exact address only ever reaches people who took a spot.

/** One table only holds so many laptops. Shared by the steppers and the actions. */
export const MAX_DAY_CAPACITY = 20;

type PlaceArea = {
  address?: string;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressRegion?: string | null;
};

/** Fallback for older manually-entered addresses, never the full street. */
function areaFromAddress(address?: string) {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

export function areaLabel(place: PlaceArea) {
  if (place.addressNeighborhood) return place.addressNeighborhood;
  if (place.addressCity && place.addressCity !== "Capital") return place.addressCity;
  if (place.addressRegion) return place.addressRegion;
  return areaFromAddress(place.address);
}
