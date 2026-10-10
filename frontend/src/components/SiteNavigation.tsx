import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

function focusContent(target: HTMLElement | null) {
  if (!target || document.querySelector('[role="dialog"]')) return;
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

const SCROLL_KEY = "hq_scroll_positions_v1";
interface ScrollPoint { top: number; left: number; }

// Keep history restoration under one owner: native POP restoration can run
// after a fragment has been aligned and overwrite its position.
export default function SiteNavigation() {
  const location = useLocation();
  const navigation = useNavigationType();
  // Direct document navigations share React Router's default key. Scope it
  // to the page so a new address cannot inherit another page's reading point.
  const scrollKey = location.key === "default" ? `default:${location.pathname}` : location.key;
  const previous = useRef<{ pathname: string; hash: string; key: string } | null>(null);
  const activeKey = useRef(scrollKey);
  const positions = useRef(new Map<string, ScrollPoint>());

  useLayoutEffect(() => {
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "[]");
      if (Array.isArray(saved)) for (const item of saved.slice(-100)) {
        if (!Array.isArray(item) || typeof item[0] !== "string" || !item[1] || typeof item[1] !== "object") continue;
        const point = item[1] as Partial<ScrollPoint>;
        if (typeof point.top === "number" && Number.isFinite(point.top) && point.top >= 0 &&
          typeof point.left === "number" && Number.isFinite(point.left) && point.left >= 0) positions.current.set(item[0], { top: point.top, left: point.left });
      }
    } catch { /* Storage may be unavailable; in-page history still works. */ }
    const remember = () => {
      positions.current.set(activeKey.current, { top: window.scrollY, left: window.scrollX });
      if (positions.current.size > 100) positions.current.delete(positions.current.keys().next().value!);
    };
    const pagehide = () => {
      remember();
      try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify([...positions.current])); } catch { /* Optional persistence. */ }
      window.history.scrollRestoration = "auto";
    };
    const pageshow = () => { window.history.scrollRestoration = "manual"; };
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("popstate", remember, true);
    document.addEventListener("click", remember, true);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    return () => {
      window.removeEventListener("scroll", remember);
      window.removeEventListener("popstate", remember, true);
      document.removeEventListener("click", remember, true);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      window.history.scrollRestoration = restoration;
    };
  }, []);

  useLayoutEffect(() => {
    const before = previous.current;
    const current = { pathname: location.pathname, hash: location.hash, key: scrollKey };
    // Pending scroll events can belong to the page we are leaving. Capture the
    // destination's point before changing which entry those events update.
    const point = navigation === "POP" ? positions.current.get(scrollKey) : undefined;
    activeKey.current = scrollKey;
    const pageChanged = before != null && before.pathname !== location.pathname;
    const hashChanged = before != null && before.hash !== location.hash;
    const sectionChanged = before == null || pageChanged || before.hash !== location.hash;
    const documentNavigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const initialRestore = before == null && navigation === "POP" && positions.current.has(scrollKey) &&
      (documentNavigation?.type === "reload" || documentNavigation?.type === "back_forward");
    // Query-only changes are filters: preserve the current scroll and focus.
    if (!pageChanged && !hashChanged && !(location.hash && sectionChanged) && !initialRestore) { previous.current = current; return; }
    const frame = requestAnimationFrame(() => {
      previous.current = current;
      if (location.hash && sectionChanged) {
        let id: string;
        try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
        const section = document.getElementById(id);
        if (section) {
          // Native fragment navigation may already have focused the section;
          // don't pull focus back after the user has tabbed into its controls.
          const alreadyFocused = document.activeElement === section || section.contains(document.activeElement);
          if (navigation === "POP" || !alreadyFocused) section.scrollIntoView({ behavior: "instant" });
          if (!alreadyFocused) focusContent(section);
          return;
        }
      }
      if (pageChanged || hashChanged || initialRestore) {
        window.scrollTo({ top: point?.top ?? 0, left: point?.left ?? 0, behavior: "instant" });
        focusContent(document.querySelector<HTMLElement>("main h1") ?? document.getElementById("main-content"));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, scrollKey, navigation]);
  return null;
}
