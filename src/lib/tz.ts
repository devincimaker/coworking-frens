// MVP assumption: everyone is in Argentina. All dates/times are local to this zone,
// stored as plain strings ("2026-07-21", "09:00") — no UTC conversion anywhere.
export const TZ = "America/Argentina/Buenos_Aires";

const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hm = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  hourCycle: "h23",
});

export function todayBA(): string {
  return ymd.format(new Date());
}

export function currentTimeBA(): string {
  return hm.format(new Date());
}

/** What the Buenos Aires wall clock reads at `instant`, re-read as if it were UTC. */
function baWallClockAsUtc(instant: Date): number {
  return Date.parse(`${ymd.format(instant)}T${hm.format(instant)}:00Z`);
}

/**
 * "2026-08-05" + "09:00" in Buenos Aires → the UTC instant it names. The rest of
 * the app never needs this — a day is a pair of wall-clock strings and stays that
 * way — but a calendar file has to pin an actual moment.
 *
 * The offset is read out of ICU rather than hardcoded to −03:00: Argentina has had
 * no DST since 2009, but that is the zone's history, not a promise. The second
 * pass only earns its keep on a day the offset moves, where the first guess can
 * land on the far side of the shift and read the wrong one.
 */
export function baInstant(date: string, time: string): Date {
  const wall = Date.parse(`${date}T${time}:00Z`); // the reading, parsed as if UTC
  const guess = wall - (baWallClockAsUtc(new Date(wall)) - wall);
  return new Date(wall - (baWallClockAsUtc(new Date(guess)) - guess));
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`); // noon UTC avoids any day-boundary drift
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay(); // 0=Sun .. 6=Sat
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function formatDay(date: string): string {
  const today = todayBA();
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAY_LABELS[weekdayOf(date)]} ${d} ${MONTHS[m - 1]}`;
}

export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** "jueves" — for sentences like "Abrir el jueves 30". */
export const WEEKDAY_FULL = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** "jueves" / "sábados" — for "Repetir todos los jueves". */
export const WEEKDAY_PLURAL = [
  "domingos",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábados",
];

/** "Hoy" / "Mañana" / "Mié 29" — the compact label the date pills wear. */
export function formatDayShort(date: string): string {
  const today = todayBA();
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  const [, , d] = date.split("-").map(Number);
  return `${WEEKDAY_LABELS[weekdayOf(date)]} ${d}`;
}

/** "hoy" / "mañana" / "el jueves 30" — reads inside a button label. */
export function formatDayPhrase(date: string): string {
  const today = todayBA();
  if (date === today) return "hoy";
  if (date === addDays(today, 1)) return "mañana";
  const [, , d] = date.split("-").map(Number);
  return `el ${WEEKDAY_FULL[weekdayOf(date)]} ${d}`;
}

/** "se sumó hoy" / "se sumó ayer" / "se sumó el jue" / "se sumó el 3 jul". */
export function joinedPhrase(joinedAt: Date): string {
  const date = ymd.format(joinedAt);
  const today = todayBA();
  if (date >= today) return "se sumó hoy";
  if (date === addDays(today, -1)) return "se sumó ayer";
  const [, m, d] = date.split("-").map(Number);
  if (date >= addDays(today, -6)) return `se sumó el ${WEEKDAY_LABELS[weekdayOf(date)].toLowerCase()}`;
  return `se sumó el ${d} ${MONTHS[m - 1]}`;
}

const timestampFormat = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "25/07/2026 17:36" — Argentina-local, for stored timestamps like terms acceptance. */
export function formatTimestamp(date: Date): string {
  return timestampFormat.format(date).replace(", ", " ");
}
