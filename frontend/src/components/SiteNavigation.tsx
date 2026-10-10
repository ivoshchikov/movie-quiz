import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

function focusContent(target: HTMLElement | null) {
  if (!target || document.querySelector('[role="dialog"]')) return;
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

// Search-only changes are filters, not new pages. Native history restores POP
// reading positions; section links align focus after that restoration finishes.
export default function SiteNavigation() {
  const location = useLocation();
  const navigation = useNavigationType();
  const previous = useRef<{ pathname: string; hash: string } | null>(null);
  useEffect(() => {
    const before = previous.current;
    const current = { pathname: location.pathname, hash: location.hash };
    const pageChanged = before != null && before.pathname !== location.pathname;
    const sectionChanged = before == null || pageChanged || before.hash !== location.hash;
    if (!pageChanged && !(location.hash && sectionChanged)) { previous.current = current; return; }
    const frame = requestAnimationFrame(() => {
      previous.current = current;
      if (location.hash && sectionChanged) {
        let id: string;
        try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
        const section = document.getElementById(id);
        if (section) {
          // Native fragment navigation may already have focused the section;
          // don't pull focus back after the user has tabbed into its controls.
          if (document.activeElement !== section && !section.contains(document.activeElement)) {
            section.scrollIntoView(); focusContent(section);
          }
          return;
        }
      }
      if (pageChanged) {
        if (navigation !== "POP") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        focusContent(document.querySelector<HTMLElement>("main h1") ?? document.getElementById("main-content"));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, navigation]);
  return null;
}
