import { currentTimeBA, todayBA } from "@/lib/tz";

/**
 * When a juntada stops being upcoming and starts being past.
 *
 * The answer is its end time, not midnight: a juntada that ended at 19:30 is
 * over at 19:31, and everything keyed on "it happened" — history, attendance,
 * the hosted count that badges hang off — should agree with the clock rather
 * than wait for the date to roll.
 *
 * `date` is "YYYY-MM-DD" and `endTime` is "HH:MM", both zero-padded, so
 * lexicographic order is chronological order. That is what lets one predicate
 * be a plain string comparison in memory and an ordinary `where` in SQL, with
 * no schema change and nothing computed per row.
 */
export function hasEnded(
  date: string,
  endTime: string,
  today = todayBA(),
  now = currentTimeBA()
): boolean {
  return date < today || (date === today && endTime <= now);
}

/** Days already over: yesterday and earlier, plus today's whose end time has gone by. */
export function pastDayWhere() {
  const today = todayBA();
  return { OR: [{ date: { lt: today } }, { date: today, endTime: { lte: currentTimeBA() } }] };
}

/**
 * Days still to come. Defined as the negation of `pastDayWhere` so the two stay
 * exact complements by construction — written out separately they would be two
 * expressions to keep in step, and a day could land in both lists or neither in
 * the minute it ends. Both columns are NOT NULL, so there is no three-valued
 * gap between them.
 *
 * `NOT` also leaves the top-level `OR` key free, which matters more than it
 * looks: most day queries carry their own `OR` for the audience check, and a
 * builder that owned `OR` would be silently dropped by `{ ...upcomingDayWhere(),
 * OR: [...] }` — valid TypeScript that quietly restores the bug this module
 * exists to fix. Postgres pushes the negation through with De Morgan and still
 * answers it from `@@index([date])`.
 */
export function upcomingDayWhere() {
  return { NOT: pastDayWhere() };
}
