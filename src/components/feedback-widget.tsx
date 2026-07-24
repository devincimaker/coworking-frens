"use client";

import { useEffect, useId, useRef, useState } from "react";

type SubmitState = "idle" | "sending" | "sent";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
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

    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = String(formData.get("message") ?? "").trim();
    if (!message) return;

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setSubmitState("sending");
    setError("");

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        email: String(formData.get("email") ?? "").trim() || null,
        page: window.location.pathname,
      }),
    });

    if (!response.ok) {
      setSubmitState("idle");
      setError("No se pudo enviar. Probá de nuevo en un ratito.");
      return;
    }

    form.reset();
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

  return (
    <div className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 sm:right-5 md:bottom-5">
      {open && (
        <section
          id={panelId}
          className="absolute right-0 bottom-[calc(100%+10px)] w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_70px_-34px_rgba(43,38,32,0.65)]"
          aria-label="Enviar feedback"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
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
            <form onSubmit={handleSubmit} className="grid gap-3 p-4">
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

              <label>
                <span className="label">Email opcional</span>
                <input
                  type="email"
                  name="email"
                  maxLength={320}
                  placeholder="Para responderte si hace falta"
                  className="input"
                />
              </label>

              {error && (
                <p role="alert" className="text-sm font-semibold text-clay">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitState === "sending"}
                className="btn-primary min-h-11"
              >
                {submitState === "sending" ? "Enviando..." : "Enviar feedback"}
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
