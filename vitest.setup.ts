import "@testing-library/jest-dom/vitest";

// jsdom ships no matchMedia at all, so anything that reads a media query — the
// theme toggle asking the OS whether it prefers dark — throws on mount. Report
// "light" and accept listeners that never fire: tests that care about the OS
// preference should stub this themselves rather than rely on a default.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
