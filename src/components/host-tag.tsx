/**
 * "recibió 7 juntadas" — that a person opens their place, said once and the
 * same way everywhere it appears: the friend list, a request you are deciding
 * on, a profile. Loud enough to notice while scanning, which a grey line of
 * text beside the handle was not.
 *
 * Deliberately only ever a total. See hostedJuntadasFor for why nothing sharper
 * belongs here.
 */
export function HostTag({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="host-tag">
      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 11l8-6 8 6" />
        <path d="M6 10v9h12v-9" />
      </svg>
      recibió {count} {count === 1 ? "juntada" : "juntadas"}
    </span>
  );
}
