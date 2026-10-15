import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";
const storageKey = "hard-quiz-theme";
const changeEvent = "hard-quiz-theme-change";
const getTheme = (): Theme => document.documentElement.dataset.theme === "light" ? "light" : "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f7fb" : "#101116");
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(notify: () => void) {
  const sync = (event: StorageEvent) => {
    try { if (event.storageArea !== localStorage) return; } catch { return; }
    if (event.key === storageKey || event.key === null) applyTheme(event.newValue === "light" ? "light" : "dark");
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", sync);
  return () => { window.removeEventListener(changeEvent, notify); window.removeEventListener("storage", sync); };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, (): Theme => "dark");
  const toggleTheme = () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    // Browsers can deny storage. The selected theme still works in this document.
    try { localStorage.setItem(storageKey, next); } catch { /* Keep the in-memory choice. */ }
  };
  return { theme, toggleTheme };
}
