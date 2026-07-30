export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "frens-theme";
export const THEME_ATTRIBUTE = "data-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Runs synchronously in <head>, before the first paint, so the page never
 * renders light and then snaps to dark. That timing is the whole point, which
 * is why it is an inline string rather than a module: anything the bundler
 * touches would arrive after the browser has already painted.
 *
 * Keep it defensive. localStorage throws outright in Safari's private mode, and
 * a theme script that takes the page down with it is worse than a wrong colour.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage.getItem("${THEME_STORAGE_KEY}");d.setAttribute("${THEME_ATTRIBUTE}",s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))}catch(e){document.documentElement.setAttribute("${THEME_ATTRIBUTE}","light")}})()`;

/** The theme the inline script above settled on. */
export function readTheme(): Theme {
  const attr = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return isTheme(attr) ? attr : "light";
}

/** Explicit choice — remembered, so it outranks the OS from here on. */
export function writeTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode. The attribute still applied; only persistence is lost.
  }
}

export function hasStoredTheme(): boolean {
  try {
    return isTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return false;
  }
}
