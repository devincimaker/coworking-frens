// The catalogue of what a house can have. Hosts pick from this list instead of
// typing, because nobody writes "wifi rápido" the same way twice, and a filter
// cannot read minds.
//
// The column stores keys. The label lives here — which is what lets it be
// rewritten, or translated, without touching a single row. Keys are permanent:
// renaming one orphans every place that picked it.

export type AmenityGroupKey = "trabajo" | "casa" | "cocina" | "clima";

export type Amenity = {
  key: string;
  label: string;
  group: AmenityGroupKey;
};

/** Order matters: it is the order the picker and every chip list read in. */
export const AMENITY_GROUPS: { key: AmenityGroupKey; title: string }[] = [
  { key: "trabajo", title: "Para trabajar" },
  { key: "casa", title: "La casa" },
  { key: "cocina", title: "La cocina" },
  { key: "clima", title: "El clima de la casa" },
];

export const AMENITIES: Amenity[] = [
  { key: "wifi_rapido", label: "Internet rápido", group: "trabajo" },
  { key: "monitor", label: "Monitor extra", group: "trabajo" },
  { key: "pieza_llamadas", label: "Pieza para llamadas", group: "trabajo" },
  { key: "enchufes", label: "Enchufes de sobra", group: "trabajo" },

  { key: "aire", label: "Aire acondicionado", group: "casa" },
  { key: "calefaccion", label: "Calefacción", group: "casa" },
  { key: "patio", label: "Patio o terraza", group: "casa" },
  { key: "luz_natural", label: "Mucha luz", group: "casa" },
  { key: "silencio", label: "Zona silenciosa", group: "casa" },
  { key: "pileta", label: "Pileta", group: "casa" },
  { key: "bici", label: "Lugar para la bici", group: "casa" },

  { key: "mate", label: "Mate", group: "cocina" },
  { key: "cafe", label: "Café", group: "cocina" },
  { key: "heladera", label: "Heladera libre", group: "cocina" },

  { key: "pet_friendly", label: "Venís con tu perro", group: "clima" },
  { key: "consola", label: "Consola de juegos", group: "clima" },
  { key: "bandejas", label: "Bandejas de DJ", group: "clima" },
  { key: "instrumentos", label: "Instrumentos", group: "clima" },
  { key: "ping_pong", label: "Ping pong", group: "clima" },
  { key: "gimnasio", label: "Gimnasio", group: "clima" },
];

const BY_KEY = new Map(AMENITIES.map((amenity) => [amenity.key, amenity]));

export function amenityByKey(key: string): Amenity | null {
  return BY_KEY.get(key) ?? null;
}

/**
 * The stored keys as catalogue entries — in catalogue order, not storage order,
 * so two houses with the same setup read the same way. Keys retired from the
 * catalogue simply stop showing up.
 */
export function amenitiesFor(keys: readonly string[]): Amenity[] {
  const chosen = new Set(keys);
  return AMENITIES.filter((amenity) => chosen.has(amenity.key));
}

/** Whatever the form posted, reduced to real keys, deduped, in catalogue order. */
export function parseAmenityKeys(entries: readonly unknown[]): string[] {
  const chosen = new Set(entries.map((entry) => String(entry ?? "").trim()));
  return AMENITIES.filter((amenity) => chosen.has(amenity.key)).map((amenity) => amenity.key);
}
