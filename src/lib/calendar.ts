import { TZ, baInstant } from "@/lib/tz";
import { appUrl } from "@/lib/url";

/**
 * A juntada, as a calendar sees it. Two calendars, two shapes: Google takes the
 * wall clock plus a zone, an .ics takes an instant — so both live here rather
 * than being re-derived at each call site.
 */
export type CalendarEvent = {
  /** Stable across rebuilds, so re-importing updates the event instead of cloning it. */
  uid: string;
  title: string;
  start: Date;
  end: Date;
  /** "20260805T090000" — local reading, for providers that take a zone alongside. */
  startLocal: string;
  endLocal: string;
  /** Bare address, so a map app can parse it. Empty when the host left it blank. */
  location: string;
  description: string;
  url: string;
};

/** The slice of a day the calendar needs — matches what `dayForUser` and `createDay` both return. */
export type CalendarDay = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  host: { name: string | null };
  place: { nickname: string; address: string; arrivalNotes: string };
};

/** The pair of destinations the UI offers. One shape, so the two call sites cannot drift. */
export type CalendarLinks = {
  googleHref: string;
  icsHref: string;
};

/** Where the .ics for a day is served. One definition, so page and email agree. */
export function icsPath(dayId: string): string {
  return `/api/day/${dayId}/ics`;
}

function localStamp(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

function uidHost(): string {
  try {
    return new URL(appUrl()).host;
  } catch {
    return "frens";
  }
}

export function calendarEventFor(day: CalendarDay): CalendarEvent {
  const base = appUrl();
  const url = `${base}/day/${day.id}`;
  const host = day.host.name?.trim();

  // Arrival notes belong here, not in LOCATION: "tocá el timbre de abajo" is not
  // an address, and a map app handed it would fail to find anything.
  const description = [
    host ? `Anfitrión: ${host}` : "",
    day.description.trim(),
    day.place.arrivalNotes.trim() ? `Cómo llegar: ${day.place.arrivalNotes.trim()}` : "",
    url,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    uid: `day-${day.id}@${uidHost()}`,
    title: `Juntada en ${day.place.nickname}`,
    start: baInstant(day.date, day.startTime),
    end: baInstant(day.date, day.endTime),
    startLocal: localStamp(day.date, day.startTime),
    endLocal: localStamp(day.date, day.endTime),
    location: day.place.address.trim(),
    description,
    url,
  };
}

/**
 * Google's prefilled "new event" page. Deliberately the local reading plus `ctz`
 * rather than UTC: that way the event reads as 09:00 Buenos Aires for someone
 * whose own calendar sits in another zone, instead of 09:00 wherever they are.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${event.startLocal}/${event.endLocal}`,
    ctz: TZ,
    details: event.description,
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Both destinations for one day, ready to hand to `AddToCalendar`. */
export function calendarLinksFor(day: CalendarDay): CalendarLinks {
  return {
    googleHref: googleCalendarUrl(calendarEventFor(day)),
    icsHref: icsPath(day.id),
  };
}

/** RFC 5545 TEXT escaping. A mood with a comma silently truncates the field without this. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Fold at 75 octets, per RFC 5545. Octets, not characters — which is why this
 * walks bytes and backs off continuation bytes rather than slicing the string:
 * an "ñ" split down the middle is a corrupt file, and Outlook says so.
 */
function fold(line: string): string {
  const bytes = encoder.encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(decoder.decode(bytes.subarray(start, end)));
    start = end;
    limit = 74; // every continuation line spends an octet on its leading space
  }
  return parts.join("\r\n ");
}

/** `now` is passed in rather than read, so DTSTAMP is something a test can pin. */
export function buildIcs(event: CalendarEvent, now: Date): string {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Coworking Frens//Juntadas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(now)}`,
    // UTC stamps rather than TZID: unambiguous everywhere, and no VTIMEZONE block
    // to hand-maintain against a zone database we do not own.
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // CRLF throughout, trailing break included — the strict clients reject bare LF.
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
