"use client";

import { useEffect } from "react";
import {
  THEME_ATTRIBUTE,
  hasStoredTheme,
  readTheme,
  writeTheme,
  type Theme,
} from "@/lib/theme";

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.5 14.3A8.6 8.6 0 1 1 9.7 3.5a6.9 6.9 0 0 0 10.8 10.8Z" />
  </svg>
);

const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
  </svg>
);

const BASE =
  "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-faded transition-colors hover:bg-amenity hover:text-ink";

/**
 * The theme lives in one place — data-theme on <html> — and this component
 * deliberately keeps no copy of it in React state. Both the glyph and the
 * accessible name are selected in CSS off that attribute, so the button is
 * already correct in the server's HTML, never flickers on hydration, and needs
 * no re-render to stay in sync. Exactly one of the two labels is display:none
 * at any time, and display:none content is excluded from the accessible name.
 */
export function ThemeToggle({ className }: { className?: string }) {
  useEffect(() => {
    // Until someone picks a side the OS keeps the casting vote, including when
    // it flips mid-session — which is exactly when a laptop crosses sunset.
    // Touching the DOM is all this needs to do; CSS notices on its own.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (hasStoredTheme()) return;
      const next: Theme = media.matches ? "dark" : "light";
      document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  return (
    <button
      type="button"
      title="Cambiar el tema"
      onClick={() => writeTheme(readTheme() === "dark" ? "light" : "dark")}
      className={className ? `${BASE} ${className}` : BASE}
    >
      <span className="sr-only dark:hidden">Cambiar a modo oscuro</span>
      <span className="sr-only hidden dark:inline">Cambiar a modo claro</span>
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
    </button>
  );
}
