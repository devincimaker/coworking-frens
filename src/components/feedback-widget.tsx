"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FeedbackImageField } from "@/components/feedback-image-field";

type SubmitState = "idle" | "sending" | "sent";

export function FeedbackWidget({
  aboveBottomNav = false,
}: {
  aboveBottomNav?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open || submitState === "sent") return;
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [open, submitState]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (imageBusy) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = String(formData.get("message") ?? "").trim();
    if (!message) return;

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setSubmitState("sending");
    setError("");

    let response: Response;
    try {
      response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          imageUrl: imageUrl || null,
          page: window.location.pathname,
        }),
      });
    } catch {
      setSubmitState("idle");
      setError("No se pudo enviar. Revisá tu conexión y probá de nuevo.");
      return;
    }

    if (!response.ok) {
      setSubmitState("idle");
      setError("No se pudo enviar. Probá de nuevo en un ratito.");
      return;
    }

    form.reset();
    setImageUrl("");
    setSubmitState("sent");
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setSubmitState("idle");
    }, 2200);
  }

  function toggleOpen() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen((current) => !current);
    setSubmitState("idle");
    setError("");
  }

  // On mobile the pill rests just over whatever is at the bottom of the screen:
  // the tab bar where there is one, the home indicator where there isn't.
  const restingPlace = aboveBottomNav
    ? "bottom-[calc(var(--bottom-nav-h)+0.5rem)]"
    : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]";
  const panelHeight = aboveBottomNav
    ? "max-h-[calc(100dvh-var(--bottom-nav-h)-5.25rem)]"
    : "max-h-[calc(100dvh-5.25rem-env(safe-area-inset-bottom))]";

  return (
    <div className={`fixed right-4 z-50 sm:right-5 md:bottom-5 ${restingPlace}`}>
      {open && (
        <section
          id={panelId}
          className={`absolute right-0 bottom-[calc(100%+8px)] w-[min(calc(100vw-2rem),22rem)] overflow-y-auto rounded-2xl border border-line bg-surface shadow-[0_24px_70px_-34px_rgba(43,38,32,0.65)] md:max-h-[calc(100dvh-5.5rem)] ${panelHeight}`}
          aria-label="Enviar feedback"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3.5">
            <div>
              <h2 className="font-display text-base font-semibold text-ink">Feedback</h2>
              <p className="text-xs text-faded">Lo leemos para mejorar Frens.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-faded transition-colors hover:bg-amenity hover:text-ink"
              aria-label="Cerrar feedback"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {submitState === "sent" ? (
            <div className="px-5 py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-olive text-white">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m20 6-11 11-5-5" />
                </svg>
              </div>
              <p className="font-semibold text-ink">Gracias, lo recibimos.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid gap-3 p-4"
              aria-busy={submitState === "sending"}
            >
              <label>
                <span className="label">Qué mejorarías</span>
                <textarea
                  ref={textareaRef}
                  name="message"
                  required
                  maxLength={2000}
                  rows={4}
                  placeholder="Algo que falló, una idea, o cualquier detalle que te gustaría cambiar."
                  className="input min-h-28 resize-y"
                />
              </label>

              <FeedbackImageField
                value={imageUrl}
                onChange={setImageUrl}
                disabled={submitState === "sending"}
                onBusyChange={setImageBusy}
              />

              {error && (
                <p role="alert" className="text-sm font-semibold text-clay">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitState === "sending" || imageBusy}
                className="btn-primary min-h-11"
              >
                {imageBusy
                  ? "Subiendo imagen..."
                  : submitState === "sending"
                    ? "Enviando..."
                    : "Enviar feedback"}
              </button>
            </form>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-[0_18px_36px_-20px_rgba(43,38,32,0.85)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
        Feedback
      </button>
    </div>
  );
}
