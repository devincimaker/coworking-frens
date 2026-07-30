// Each place/day gets a stable, warm accent derived from a seed (usually the host id),
// used for the striped "foto" placeholder, the join button, and count labels — mirroring
// the design mockup where every juntada carries its own hue.

export type Accent = {
  hue: number;
  accent: string; // strong: buttons, count labels
  tint: string; // light stripe A
  tintB: string; // light stripe B
  soft: string; // very light fill (joined button bg)
};

const HUES = [40, 80, 135, 200, 255, 330, 20, 150];

/**
 * Only the hue is decided here. Lightness and chroma are read from CSS at paint
 * time, so the theme can move them — because these values reach the DOM as
 * inline styles, which no stylesheet can override, and a 0.93-lightness stripe
 * that was a pastel wash on cream burns a hole through an espresso card.
 *
 * The hue is the part that must not move: it is derived from a person's id, so
 * it is their identity rather than decoration. See --accent-* in globals.css.
 */
export function accentFor(seed: string): Accent {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return {
    hue,
    accent: `oklch(var(--accent-l) var(--accent-c) ${hue})`,
    tint: `oklch(var(--accent-tint-l) var(--accent-tint-c) ${hue})`,
    tintB: `oklch(var(--accent-tint-b-l) var(--accent-tint-b-c) ${hue})`,
    soft: `oklch(var(--accent-soft-l) var(--accent-soft-c) ${hue})`,
  };
}

/** Diagonal two-tone stripe used as the house-photo placeholder. */
export function stripes(a: Accent, w = 20): string {
  return `repeating-linear-gradient(135deg, ${a.tint} 0 ${w}px, ${a.tintB} ${w}px ${w * 2}px)`;
}
