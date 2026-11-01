import { useSyncExternalStore } from "react";

export const themes = ["light", "dark", "christmas"] as const;
// Keep the archived Halloween renderer type-compatible for a future season.
type Theme = typeof themes[number] | "halloween";
const normalizeTheme = (value: string | null | undefined): Theme => value === "halloween" ? "christmas" : themes.find(theme => theme === value) ?? "dark";
const storageKey = "hard-quiz-theme";
const changeEvent = "hard-quiz-theme-change";
const getTheme = (): Theme => normalizeTheme(document.documentElement.dataset.theme);

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f7fb" : theme === "christmas" ? "#0d191b" : "#101116");
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(notify: () => void) {
  const sync = (event: StorageEvent) => {
    try { if (event.storageArea !== localStorage) return; } catch { return; }
    if (event.key === storageKey || event.key === null) applyTheme(normalizeTheme(event.newValue));
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", sync);
  return () => { window.removeEventListener(changeEvent, notify); window.removeEventListener("storage", sync); };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, (): Theme => "dark");
  const setTheme = (next: Theme) => {
    const active = normalizeTheme(next);
    applyTheme(active);
    // Browsers can deny storage. The selected theme still works in this document.
    try { localStorage.setItem(storageKey, active); } catch { /* Keep the in-memory choice. */ }
  };
  return { theme, setTheme };
}
