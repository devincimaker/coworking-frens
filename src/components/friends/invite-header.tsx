"use client";

import { useEffect, useRef, useState } from "react";

const BACK_TO_IDLE_MS = 4000;

/**
 * "Invitar" copies the link and says so. It used to unfold a card — which read
 * wrong twice over: a verb that revealed something instead of doing it, and a
 * button that undid itself on a second press with nothing on it to say so.
 *
 * The card was carrying a URL nobody reads and nobody types. It is clipboard
 * payload, and the only reason to look at it is to check that it copied, which
 * the button now says better. What is left of the card is the failure path: if
 * the clipboard refuses — insecure context, permissions, Safari — the link
 * appears to be selected by hand, and stays until it is used.
 */
export function InviteHeader({ inviteUrl, subtitle }: { inviteUrl: string; subtitle: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      setState("failed");
      return;
    }
    setState("copied");
    timer.current = setTimeout(() => setState("idle"), BACK_TO_IDLE_MS);
  }

  return (
    <div className="mb-7">
      {/* Stacked on a phone, where the button beside the subtitle would squeeze
          it into two ragged lines; side by side once there is room. */}
      <div className="flex flex-col items-start gap-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="page-title">Amigos</h1>
          {/* The one thing worth knowing about the link takes over the subtitle
              for a moment rather than claiming a line of its own: it is read at
              the instant it matters, right under the button that just changed,
              and nothing on the page moves. Kept shorter than the subtitle so it
              cannot wrap to a second line on a phone and shift it after all. */}
          <p role="status" className="mt-2 text-[15px] text-faded">
            {state === "copied" ? "Quien entre queda como amigo tuyo." : subtitle}
          </p>
        </div>
        <button type="button" onClick={copy} className="btn-ghost shrink-0">
          {state === "copied" ? (
            <>
              <svg
                aria-hidden="true"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12.5 4.5 4.5L19 7" />
              </svg>
              Link copiado
            </>
          ) : (
            "Invitar"
          )}
        </button>
      </div>

      {state === "failed" && (
        <div className="panel mt-4 p-4">
          <p className="text-[13px] text-ink">
            El navegador no me dejó copiarlo. Copiá el link a mano:
          </p>
          <code className="mt-2.5 block w-full truncate rounded-xl bg-paper px-3 py-2.5 font-mono text-[13px] text-ink select-all">
            {inviteUrl}
          </code>
          <p className="mt-2 font-mono text-[11px] text-faded">
            El link no caduca · lo podés mandar a quien quieras
          </p>
        </div>
      )}
    </div>
  );
}
