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
}: {
  name: string | null;
  image: string | null;
  size?: number;
  ring?: boolean;
}) {
  const cls = `shrink-0 rounded-full ${ring ? "ring-2 ring-surface" : ""}`;
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
}: {
  users: { id: string; name: string | null; image: string | null }[];
  size?: number;
}) {
  return (
    <div className="flex -space-x-2">
      {users.map((u) => (
        <Avatar key={u.id} name={u.name} image={u.image} size={size} ring />
      ))}
    </div>
  );
}
