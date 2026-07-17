const PALETTE = ["#bc4b27", "#66763a", "#a5732c", "#5b6b8c", "#7d4f70", "#3f7d6d"];

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
  const cls = `shrink-0 rounded-full ${ring ? "ring-2 ring-card" : ""}`;
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name ?? ""} width={size} height={size} className={cls} />;
  }
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={`${cls} flex items-center justify-center font-display font-semibold text-paper`}
      style={{ width: size, height: size, backgroundColor: hue(name ?? "?"), fontSize: size * 0.45 }}
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
