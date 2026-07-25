// MVP assumption: everyone is in Argentina. All dates/times are local to this zone,
// stored as plain strings ("2026-07-21", "09:00") — no UTC conversion anywhere.
export const TZ = "America/Argentina/Buenos_Aires";

const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayBA(): string {
  return ymd.format(new Date());
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
