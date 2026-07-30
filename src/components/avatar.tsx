// Warm pastel avatar palette, matching the design mockup's people colors.
// Deliberately literal rather than themed: a person's colour is computed from
// their id, so it is identity, not decoration, and it must not shift when the
// theme does. At avatar size these all read against paper and espresso alike.
const PALETTE = [
  "oklch(0.70 0.13 40)",
  "oklch(0.80 0.12 80)",
  "oklch(0.72 0.12 135)",
  "oklch(0.66 0.13 330)",
  "oklch(0.72 0.11 200)",
  "oklch(0.68 0.13 255)",
  "oklch(0.68 0.13 20)",
  "oklch(0.74 0.12 150)",
];

function hue(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % PALETTE.length;
  return PALETTE[h];
}

export function Avatar({
  name,
  image,
  size = 32,
  ring = false,
  hosts = false,
}: {
  name: string | null;
  image: string | null;
  size?: number;
  ring?: boolean;
  /** An olive halo saying this person opens their place. See .host-ring. */
  hosts?: boolean;
}) {
  const cls = `shrink-0 rounded-full ${ring ? "ring-2 ring-surface" : ""} ${hosts ? "host-ring" : ""}`;
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? ""}
        width={size}
        height={size}
        className={`${cls} object-cover`}
      />
    );
  }
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={`${cls} flex items-center justify-center font-semibold text-avatar-ink`}
      style={{ width: size, height: size, backgroundColor: hue(name ?? "?"), fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}

export function AvatarStack({
  users,
  size = 26,
  max,
}: {
  users: { id: string; name: string | null; image: string | null }[];
  size?: number;
  /** Past this many faces the rest collapse into a +N bubble in the same row. */
  max?: number;
}) {
  const shown = max === undefined ? users : users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <Avatar key={u.id} name={u.name} image={u.image} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          className="flex shrink-0 items-center justify-center rounded-full bg-amenity font-mono text-amenity-ink ring-2 ring-surface"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
