export type ImageUrlResult =
  | { ok: true; image: string | null }
  | { ok: false; message: string };

export type ProfileFields = {
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  onboardedAt?: Date | null;
};

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "day",
  "friends",
  "host",
  "invite",
  "me",
  "onboarding",
  "profile",
  "signin",
  "support",
]);

export function normalizeName(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeUsername(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function normalizeBio(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateUsername(username: string) {
  if (!username) return "Elegí un username.";
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return "Usá 3 a 24 caracteres: letras minúsculas, números o guión bajo.";
  }
  if (RESERVED_USERNAMES.has(username)) return "Ese username está reservado.";
  return null;
}

export function normalizeImageUrl(raw: FormDataEntryValue | null): ImageUrlResult {
  const value = String(raw ?? "").trim();
  if (!value) return { ok: true, image: null };
  if (value.length > 500) {
    return { ok: false, message: "Usá una URL de imagen de menos de 500 caracteres." };
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, message: "Usá una URL de imagen http o https." };
    }
    return { ok: true, image: url.toString() };
  } catch {
    return { ok: false, message: "Usá una URL de imagen válida." };
  }
}

export function isOnboardingComplete(user: ProfileFields) {
  return Boolean(
    user.onboardedAt &&
      user.name?.trim() &&
      user.username?.trim() &&
      user.bio?.trim()
  );
}

export function suggestedUsername(email: string, name?: string | null) {
  const source = (name?.trim() || email.split("@")[0] || "fren").toLowerCase();
  const base = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return base.length >= 3 ? base : `${base || "fren"}123`;
}
