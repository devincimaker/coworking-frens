"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { joinDay, leaveDay, type JoinResult } from "@/lib/actions";

type Joined = NonNullable<JoinResult>;

/**
 * Joining, and the calendar offer that follows it, in the button's own place.
 *
 * Three states, one footprint:
 *   open    — "Sumarme"
 *   asking  — the calendar row, exactly where the button was
 *   settled — "✓ Vas", plus a line naming where the juntada went
 *
 * The offer replaces rather than covers. A modal would carry the same weight
 * but arrives as a layer you have to dismiss before you can look at anything
 * else; this asks in the place you were already looking, and "Ahora no" costs
 * one tap. It also means the feed gets the offer at all — joining from the list
 * used to hand back nothing but a changed button.
 *
 * The `asking` state is deliberately not persisted. It belongs to the moment,
 * so a reload lands on the day page's own permanent "Agregar al calendario"
 * instead of re-asking a question that was already answered.
 */
export function JoinDayButton({
  dayId,
  variant,
  className,
  style,
  children,
  disabled,
}: {
  dayId: string;
  /** `feed` is the card's narrow column; `detail` is the day page's full width. */
  variant: "feed" | "detail";
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [joined, setJoined] = useState<Joined | null>(null);
  const [chose, setChose] = useState<"google" | "ics" | null>(null);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState("");

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(refreshTimer.current ?? undefined), []);

  /**
   * joinDay leaves revalidation to us, because revalidating mid-question would
   * replace this button — and the row standing in its place — with the server's
   * "✓ Vas". Now that the question is answered, pull the rest of the app back in
   * line: the attendee list, the count of free seats, the host's own view.
   *
   * The pause is for the receipt. Refreshing swaps this whole subtree for the
   * server's version, which cannot know which calendar was picked, so an
   * immediate refresh erases the one line saying where the juntada went before
   * it can be read. Nothing was picked on "Ahora no", so nothing needs reading.
   */
  function settle(which: "google" | "ics" | null) {
    setChose(which);
    setSettled(true);
    if (which) refreshTimer.current = setTimeout(() => router.refresh(), 3500);
    else router.refresh();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const data = new FormData();
      data.set("dayId", dayId);
      try {
        // Null means nothing happened — already going — so nothing is asked, and
        // the revalidation that just ran swaps this button for "✓ Vas" anyway.
        const result = await joinDay(data);
        if (result) setJoined(result);
      } catch {
        setError("No pudimos sumarte. Probá de nuevo en un ratito.");
      }
    });
  }

  // Before the join, and after the revalidation has swapped this whole subtree
  // for the "✓ Vas" form the server renders.
  if (!joined) {
    return (
      <>
        <form onSubmit={submit}>
          <button className={className} style={style} disabled={disabled || pending}>
            {pending ? "Sumándote..." : children}
          </button>
        </form>
        {error && (
          <p aria-live="polite" className="mt-1.5 text-[13px] font-semibold text-clay">
            {error}
          </p>
        )}
      </>
    );
  }

  if (settled) {
    return (
      <Settled
        dayId={dayId}
        variant={variant}
        chose={chose}
        className={className}
        style={style}
      />
    );
  }

  return (
    <CalendarRow
      variant={variant}
      joined={joined}
      onPick={settle}
      onDismiss={() => settle(null)}
    />
  );
}

/**
 * "✓ Vas" in the outline the app already uses for it, plus one mono line saying
 * where the juntada went. The line is the whole receipt: without it, tapping
 * "Google Calendar" opens a tab and the page you left behind looks unchanged.
 *
 * This is the real leave control, not a picture of one. The server renders an
 * identical form a few seconds later; between the two, a button that says "tocá
 * para bajarte" has to actually let you get off.
 */
function Settled({
  dayId,
  variant,
  chose,
  className,
  style,
}: {
  dayId: string;
  variant: "feed" | "detail";
  chose: "google" | "ics" | null;
  className: string;
  style?: React.CSSProperties;
}) {
  const accent = style?.backgroundColor;

  return (
    <div>
      <form action={leaveDay}>
        <input type="hidden" name="dayId" value={dayId} />
        <button
          className={`${className} text-center`}
          style={{
            ...style,
            backgroundColor: "transparent",
            color: accent,
            boxShadow: accent ? `inset 0 0 0 1.5px ${accent}` : undefined,
          }}
        >
          {variant === "detail" ? "✓ Vas — tocá para bajarte" : "✓ Vas"}
        </button>
      </form>
      {chose && (
        <p
          aria-live="polite"
          className={`mt-2 text-center font-mono text-olive ${
            variant === "detail" ? "text-[12px]" : "text-[11px]"
          }`}
        >
          {chose === "google" ? "Agregada a Google Calendar" : "Descargamos el .ics"}
        </p>
      )}
    </div>
  );
}

function CalendarRow({
  variant,
  joined,
  onPick,
  onDismiss,
}: {
  variant: "feed" | "detail";
  joined: Joined;
  onPick: (which: "google" | "ics") => void;
  onDismiss: () => void;
}) {
  const eyebrow = (
    <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wide uppercase">
      <CalendarIcon />
      {variant === "detail" ? "Agregar al calendario" : "Al calendario"}
    </div>
  );

  if (variant === "feed") {
    return (
      // The tinted panel keeps the row inside the card it belongs to rather than
      // stacking another white surface on a white surface.
      <div className="calendar-row rounded-2xl bg-amenity p-3 text-amenity-ink">
        {eyebrow}
        <div className="mt-2.5 flex gap-2">
          <a
            href={joined.calendar.googleHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => onPick("google")}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[13px] bg-clay text-sm font-semibold text-on-action"
          >
            Google
          </a>
          <a
            href={joined.calendar.icsHref}
            download
            onClick={() => onPick("ics")}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[13px] border border-rule-strong bg-surface text-sm font-semibold text-ink"
          >
            Apple
          </a>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-1 min-h-9 w-full cursor-pointer font-mono text-[11px] text-faded transition-colors hover:text-clay"
        >
          Ahora no
        </button>
      </div>
    );
  }

  return (
    <div className="calendar-row card p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1 text-faded">
          {eyebrow}
          <p className="mt-1.5 text-[15px] leading-relaxed text-pretty text-ink">
            {joined.when} en {joined.place}.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <a
            href={joined.calendar.googleHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => onPick("google")}
            className="btn-primary min-h-11 rounded-[14px] px-4 text-sm"
          >
            Google Calendar
          </a>
          <a
            href={joined.calendar.icsHref}
            download
            onClick={() => onPick("ics")}
            className="btn-ghost min-h-11 rounded-[14px] border-rule-strong px-4 text-sm"
          >
            Apple Calendar
          </a>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 cursor-pointer rounded-[14px] px-3 text-sm font-semibold text-faded transition-colors hover:text-clay"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 9.5h16" />
      <path d="M8.5 3v4M15.5 3v4" />
    </svg>
  );
}
