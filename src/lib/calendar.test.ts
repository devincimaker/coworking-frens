import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ical, { type VEvent } from "node-ical";
import { buildIcs, calendarEventFor, googleCalendarUrl, icsPath, type CalendarDay } from "./calendar";
import { baInstant } from "./tz";

const NOW = new Date("2026-08-01T18:30:00Z");

function day(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    id: "day_1",
    date: "2026-08-05",
    startTime: "09:00",
    endTime: "17:00",
    description: "",
    host: { name: "Ana Dev" },
    place: {
      nickname: "El Nido",
      address: "Gorriti 4500, Palermo",
      arrivalNotes: "",
    },
    ...overrides,
  };
}

function ics(overrides: Partial<CalendarDay> = {}) {
  return buildIcs(calendarEventFor(day(overrides)), NOW);
}

/**
 * Parse our own output with a third-party parser rather than matching substrings.
 * `expect(ics).toContain("DTSTART:…")` passes happily on a file Outlook rejects
 * for bare LF, or on one where a comma in the mood truncated DESCRIPTION.
 */
function parseEvent(source: string) {
  const parsed = ical.sync.parseICS(source);
  const events = Object.values(parsed).filter(
    (entry): entry is VEvent => entry?.type === "VEVENT"
  );
  expect(events).toHaveLength(1);
  return events[0] as VEvent;
}

/** Undo the folding the way a client does, so line-level checks stay separable. */
function unfold(source: string) {
  return source.replace(/\r\n /g, "");
}

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://frens.example");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ICS timestamps", () => {
  it("names the same instants baInstant does", () => {
    const event = parseEvent(ics());
    expect(event.start.toISOString()).toBe(baInstant("2026-08-05", "09:00").toISOString());
    expect(event.end?.toISOString()).toBe(baInstant("2026-08-05", "17:00").toISOString());
    expect(event.start.toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });

  it("survives an evening juntada that ends on the next UTC day", () => {
    const event = parseEvent(ics({ startTime: "19:00", endTime: "23:00" }));
    expect(event.start.toISOString()).toBe("2026-08-05T22:00:00.000Z");
    expect(event.end?.toISOString()).toBe("2026-08-06T02:00:00.000Z");
  });

  it("stamps DTSTAMP from the injected clock, not the wall clock", () => {
    expect(unfold(ics())).toContain("DTSTAMP:20260801T183000Z");
  });

  it("writes every stamp in UTC, with no TZID to resolve", () => {
    const text = unfold(ics());
    expect(text).toContain("DTSTART:20260805T120000Z");
    expect(text).toContain("DTEND:20260805T200000Z");
    expect(text).not.toContain("TZID");
  });
});

describe("ICS text escaping", () => {
  // Each hazard is asserted by reading the value back, not by looking for a
  // backslash — the point is that the round trip returns what went in.
  it("keeps a comma in the mood instead of truncating the field", () => {
    const mood = "Silencio hasta las 13, después mate";
    expect(parseEvent(ics({ description: mood })).description).toContain(mood);
  });

  it("keeps semicolons and backslashes", () => {
    const mood = "Foco; después calls \\ mate";
    expect(parseEvent(ics({ description: mood })).description).toContain(mood);
  });

  it("keeps a multi-line mood as real newlines", () => {
    const mood = "Mañana: silencio.\nTarde: calls en el balcón.";
    const parsed = parseEvent(ics({ description: mood })).description;
    expect(parsed).toContain("Mañana: silencio.\nTarde: calls en el balcón.");
  });

  it("keeps accents and emoji intact through the fold logic", () => {
    const nickname = "La Guarida de Ñandú 🌿 con un nombre larguísimo para forzar el plegado";
    const event = parseEvent(ics({ place: { ...day().place, nickname } }));
    expect(event.summary).toBe(`Juntada en ${nickname}`);
  });

  it("keeps a comma in the address", () => {
    expect(parseEvent(ics()).location).toBe("Gorriti 4500, Palermo");
  });
});

describe("ICS line discipline", () => {
  const longMood =
    "Arrancamos tranquilos con mate y música baja, después del mediodía se abren las " +
    "calls en el balcón y a la tarde volvemos al silencio hasta que alguien proponga " +
    "una cerveza en la terraza, que suele pasar cerca de las siete.";

  it("folds every line to 75 octets or fewer", () => {
    const lines = ics({ description: longMood }).split("\r\n").filter(Boolean);
    const tooLong = lines.filter((line) => new TextEncoder().encode(line).length > 75);
    expect(tooLong).toEqual([]);
  });

  it("folds without changing the value a client reads back", () => {
    expect(parseEvent(ics({ description: longMood })).description).toContain(longMood);
  });

  // Note a fold that lands on a word boundary produces a line starting with two
  // spaces — one from the fold, one from the text. That is correct: unfolding
  // strips exactly one, and the round-trip above proves the value comes back.
  // So the check is structural: a line is either a continuation or a property.
  it("folds with a leading space and never mid-property-name", () => {
    const lines = ics({ description: longMood }).split("\r\n").filter(Boolean);
    for (const line of lines) {
      expect(line.startsWith(" ") || /^[A-Z][A-Z-]*[:;]/.test(line)).toBe(true);
    }
    expect(lines.some((line) => line.startsWith(" "))).toBe(true);
  });

  it("uses CRLF everywhere, trailing break included, and never a bare LF", () => {
    const raw = ics({ description: longMood });
    expect(raw.endsWith("\r\n")).toBe(true);
    expect(raw.replace(/\r\n/g, "")).not.toContain("\n");
    expect(raw.replace(/\r\n/g, "")).not.toContain("\r");
  });
});

describe("ICS identity and structure", () => {
  it("keeps one UID across rebuilds so a re-import updates rather than clones", () => {
    expect(parseEvent(ics()).uid).toBe(parseEvent(ics()).uid);
    expect(parseEvent(ics()).uid).not.toBe(parseEvent(ics({ id: "day_2" })).uid);
  });

  it("anchors the UID to the deployment host", () => {
    expect(parseEvent(ics()).uid).toBe("day-day_1@frens.example");
  });

  it("carries exactly one balanced VEVENT inside a versioned VCALENDAR", () => {
    const raw = ics();
    expect(raw.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(raw.match(/END:VEVENT/g)).toHaveLength(1);
    expect(raw.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(raw.match(/END:VCALENDAR/g)).toHaveLength(1);
    expect(raw).toContain("VERSION:2.0");
    expect(raw).toContain("PRODID:");
  });

  it("links back to the day page, in URL and in the body", () => {
    const event = parseEvent(ics());
    expect(event.url).toBe("https://frens.example/day/day_1");
    expect(event.description).toContain("https://frens.example/day/day_1");
  });

  it("names the host and the arrival notes in the description", () => {
    const event = parseEvent(
      ics({ place: { ...day().place, arrivalNotes: "Timbre 3B, portón negro" } })
    );
    expect(event.description).toContain("Anfitrión: Ana Dev");
    expect(event.description).toContain("Cómo llegar: Timbre 3B, portón negro");
  });
});

describe("ICS with sparse data", () => {
  it("leaves no dangling separators when mood and arrival notes are empty", () => {
    const event = parseEvent(ics());
    expect(event.description).toBe("Anfitrión: Ana Dev\n\nhttps://frens.example/day/day_1");
  });

  it("omits LOCATION rather than emitting an empty one when the address is blank", () => {
    const raw = ics({ place: { ...day().place, address: "" } });
    expect(raw).not.toContain("LOCATION");
    expect(parseEvent(raw).start).toBeInstanceOf(Date);
  });

  it("drops the host line when the host has no name", () => {
    const event = parseEvent(ics({ host: { name: null } }));
    expect(event.description).toBe("https://frens.example/day/day_1");
  });
});

describe("Google Calendar link", () => {
  const url = () => new URL(googleCalendarUrl(calendarEventFor(day())));

  it("points at Google's template form", () => {
    expect(url().host).toBe("calendar.google.com");
    expect(url().pathname).toBe("/calendar/render");
    expect(url().searchParams.get("action")).toBe("TEMPLATE");
  });

  // The local reading plus ctz, never UTC — swapping the two silently shifts the
  // event three hours for anyone whose calendar sits in another zone.
  it("sends the local reading alongside the Buenos Aires zone", () => {
    expect(url().searchParams.get("dates")).toBe("20260805T090000/20260805T170000");
    expect(url().searchParams.get("ctz")).toBe("America/Argentina/Buenos_Aires");
  });

  it("encodes an accented title and a comma in the address", () => {
    const link = new URL(
      googleCalendarUrl(
        calendarEventFor(
          day({
            place: {
              nickname: "La Guarida de Ñandú",
              address: "Gorriti 4500, Palermo",
              arrivalNotes: "",
            },
          })
        )
      )
    );
    expect(link.searchParams.get("text")).toBe("Juntada en La Guarida de Ñandú");
    expect(link.searchParams.get("location")).toBe("Gorriti 4500, Palermo");
  });

  it("omits location when the host left the address blank", () => {
    const link = new URL(
      googleCalendarUrl(calendarEventFor(day({ place: { ...day().place, address: "" } })))
    );
    expect(link.searchParams.has("location")).toBe(false);
  });
});

describe("icsPath", () => {
  it("is the one definition the page and the email both use", () => {
    expect(icsPath("day_1")).toBe("/api/day/day_1/ics");
  });
});
