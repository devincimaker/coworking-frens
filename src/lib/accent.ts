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

export function accentFor(seed: string): Accent {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return {
    hue,
    accent: `oklch(0.60 0.15 ${hue})`,
    tint: `oklch(0.93 0.05 ${hue})`,
    tintB: `oklch(0.90 0.065 ${hue})`,
    soft: `oklch(0.96 0.02 ${hue})`,
  };
}

/** Diagonal two-tone stripe used as the house-photo placeholder. */
export function stripes(a: Accent, w = 20): string {
  return `repeating-linear-gradient(135deg, ${a.tint} 0 ${w}px, ${a.tintB} ${w}px ${w * 2}px)`;
}
