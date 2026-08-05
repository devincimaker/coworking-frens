/**
 * Two links, both one tap. No dropdown: with exactly two destinations a menu
 * costs a tap and buys nothing. Nothing can write into someone's calendar from
 * the browser — Google opens a prefilled event to save, and the .ics is handed
 * to whatever Apple Calendar, Outlook or Fantastical does with it. Neither
 * alone covers everyone, which is why it is both.
 *
 * `lg` is the version that has to carry a moment: it appears in the dialog the
 * instant someone joins, so Google takes the clay fill and both targets meet
 * the 48px the system asks of a primary CTA. The default is the quiet one that
 * lives on the day page afterwards, for the visit where you already knew.
 */
export function AddToCalendar({
  googleHref,
  icsHref,
  className = "",
  size = "sm",
}: {
  googleHref: string;
  icsHref: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  const large = size === "lg";
  const shared = large
    ? "min-h-12 flex-1 justify-center px-4 text-[15px]"
    : "px-3.5 py-2 text-[13px]";

  return (
    <div className={className}>
      <p className="label">Agregar al calendario</p>
      <div className={`flex gap-2 ${large ? "flex-col sm:flex-row" : "flex-wrap"}`}>
        <a
          href={googleHref}
          target="_blank"
          rel="noreferrer"
          className={`${large ? "btn-primary" : "btn-ghost"} ${shared}`}
        >
          <CalendarIcon size={large ? 17 : 15} />
          Google Calendar
        </a>
        <a href={icsHref} download className={`btn-ghost ${shared}`}>
          <DownloadIcon size={large ? 17 : 15} />
          Apple · Outlook
        </a>
      </div>
    </div>
  );
}

function CalendarIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function DownloadIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />
    </svg>
  );
}
