import type { ReactNode } from "react";

// One glyph per catalogue key. Stroke-only in a 24-box, like the host screen's
// icons, so they hold up at chip size (13px) without turning into mud. They are
// always drawn next to their label — never alone — so they stay aria-hidden.

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const GLYPHS: Record<string, ReactNode> = {
  wifi_rapido: (
    <>
      <path d="M4.5 10.5a11 11 0 0 1 15 0" />
      <path d="M8 14a6.5 6.5 0 0 1 8 0" />
      <path d="M12 17.5h.01" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M12 16v4" />
      <path d="M8 20h8" />
    </>
  ),
  pieza_llamadas: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="1.5" />
      <path d="M14 12h.01" />
    </>
  ),
  enchufes: (
    <>
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0z" />
      <path d="M12 17v4" />
    </>
  ),
  aire: (
    <>
      <path d="M12 3v18" />
      <path d="m4.2 7.5 15.6 9" />
      <path d="m19.8 7.5-15.6 9" />
    </>
  ),
  calefaccion: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  patio: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-3.3 2.2-5.5 5.5-5.5C17.5 10.8 15.3 13 12 13z" />
      <path d="M12 16c0-2.8-1.9-4.7-4.7-4.7C7.3 14.1 9.2 16 12 16z" />
      <path d="M8 21h8" />
    </>
  ),
  luz_natural: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="m19.1 4.9-1.4 1.4" />
      <path d="m6.3 17.7-1.4 1.4" />
    </>
  ),
  silencio: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="m22 9-6 6" />
      <path d="m16 9 6 6" />
    </>
  ),
  pileta: (
    <>
      <path d="M2 17c2.2 0 2.2 2 4.4 2s2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.8-2" />
      <path d="M2 12c2.2 0 2.2 2 4.4 2s2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.8-2" />
      <path d="M7 13V5a2.5 2.5 0 0 1 5 0" />
      <path d="M7 9h5" />
    </>
  ),
  // A gourd with a bombilla in it. The earlier draw was a circle plus a diagonal
  // ending in a corner — which is the ♂ glyph, not a drink. The bowl has to read
  // as a vessel and the straw has to cross the rim to land as mate.
  mate: (
    <>
      <path d="M4 9.5h11" />
      <path d="M4.8 9.5c0 5.9 2.2 9.4 4.7 9.4s4.7-3.5 4.7-9.4" />
      <path d="M10 14.3 19 5" />
      <circle cx="19.8" cy="4.2" r="1.2" />
    </>
  ),
  cafe: (
    <>
      <path d="M3 8h13v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 2v3" />
      <path d="M11.5 2v3" />
    </>
  ),
  heladera: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M6 10h12" />
      <path d="M9.5 6v1.5" />
      <path d="M9.5 12.5v2" />
    </>
  ),
  pet_friendly: (
    <>
      <circle cx="7.5" cy="8" r="1.8" />
      <circle cx="15" cy="7" r="1.8" />
      <circle cx="19.2" cy="12.2" r="1.6" />
      <circle cx="4.6" cy="12.8" r="1.6" />
      <path d="M12 12.5c3 0 5.5 2.6 5.5 5.2A3.3 3.3 0 0 1 14.2 21c-1 0-1.5-.5-2.2-.5s-1.2.5-2.2.5a3.3 3.3 0 0 1-3.3-3.3c0-2.6 2.5-5.2 5.5-5.2z" />
    </>
  ),
  consola: (
    <>
      <path d="M6.5 7.5h11a4.5 4.5 0 0 1 4.5 4.5v1.8a3 3 0 0 1-5.4 1.8L15.2 14H8.8l-1.4 1.6A3 3 0 0 1 2 13.8V12a4.5 4.5 0 0 1 4.5-4.5z" />
      <path d="M6.5 11.5h2.2" />
      <path d="M7.6 10.4v2.2" />
      <path d="M15.6 11h.01" />
      <path d="M17.8 12.5h.01" />
    </>
  ),
  bandejas: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="1.8" />
      <path d="m19 6-4.2 4.6" />
      <path d="m13.2 9.2 3 2.7" />
    </>
  ),
  instrumentos: (
    <>
      <path d="M9 18.5V5l11-2.5V16" />
      <circle cx="6" cy="18.5" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  ping_pong: (
    <>
      <circle cx="10.5" cy="9" r="6.5" />
      <path d="m8 14.8-2 6.2" />
      <circle cx="19.5" cy="5.5" r="1.7" />
    </>
  ),
  gimnasio: (
    <>
      <path d="M3.5 9v6" />
      <path d="M7 5.5v13" />
      <path d="M17 5.5v13" />
      <path d="M20.5 9v6" />
      <path d="M7 12h10" />
    </>
  ),
  bici: (
    <>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M5.5 17.5H11l4-10 3.5 10" />
      <path d="M12.5 7.5h4.5" />
    </>
  ),
};

export function AmenityIcon({ amenityKey, size = 13 }: { amenityKey: string; size?: number }) {
  const glyph = GLYPHS[amenityKey];
  if (!glyph) return null;
  return (
    <svg aria-hidden="true" width={size} height={size} className="shrink-0" {...base}>
      {glyph}
    </svg>
  );
}
