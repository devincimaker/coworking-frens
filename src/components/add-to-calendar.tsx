/**
 * Two links, both one tap. No dropdown: with exactly two destinations a menu
 * costs a tap and buys nothing. Nothing can write into someone's calendar from
 * the browser — Google opens a prefilled event to save, and the .ics is handed
 * to whatever Apple Calendar, Outlook or Fantastical does with it.
 */
export function AddToCalendar({
  googleHref,
  icsHref,
  className = "",
}: {
  googleHref: string;
  icsHref: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="label">Agregar al calendario</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={googleHref}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost px-3.5 py-2 text-[13px]"
        >
          <CalendarIcon />
          Google Calendar
        </a>
        <a href={icsHref} download className="btn-ghost px-3.5 py-2 text-[13px]">
          <DownloadIcon />
          Apple · Outlook
        </a>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />
    </svg>
  );
}
