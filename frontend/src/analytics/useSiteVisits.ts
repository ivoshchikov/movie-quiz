import { useEffect } from "react";
import { supabase } from "../supabase";
import { canMeasureVisits } from "./ga";
import { onConsentRevoked } from "../privacy/consent";
import { SITE_OWNER, getVisitorId, isOwnerBrowser, markOwnerBrowser } from "./visitorIdentity";

const lastSentKey = "hq_visitor_last_sent";
let lastSent = 0;

export function useSiteVisits(blocked: boolean, owner: string) {
  useEffect(() => {
    const controller = new AbortController();
    if (owner === SITE_OWNER) {
      markOwnerBrowser();
      return () => controller.abort();
    }
    if (blocked || isOwnerBrowser() || !canMeasureVisits()) return;
    const unsubscribe = onConsentRevoked(() => { lastSent = 0; controller.abort(); });
    let busy = false;
    const heartbeat = async () => {
      if (busy || controller.signal.aborted || isOwnerBrowser() || !canMeasureVisits() ||
        document.visibilityState !== "visible" || !navigator.onLine) return;
      busy = true;
      try {
        const id = await getVisitorId(canMeasureVisits);
        if (!id) return;
        if (controller.signal.aborted || isOwnerBrowser() || !canMeasureVisits() || document.visibilityState !== "visible") return;
        let previous = lastSent;
        try {
          const stored = JSON.parse(localStorage.getItem(lastSentKey) || "null");
          if (stored?.id === id && typeof stored.at === "number") previous = Math.max(previous, stored.at);
        } catch { /* Invalid or unavailable storage never blocks navigation. */ }
        const now = Date.now();
        if (now >= previous && now - previous < 45000) return;
        lastSent = now;
        try { localStorage.setItem(lastSentKey, JSON.stringify({ id, at: now })); } catch { /* Memory-only. */ }
        const request = new AbortController();
        const abort = () => request.abort();
        controller.signal.addEventListener("abort", abort, { once: true });
        const timeout = window.setTimeout(abort, 10000);
        try {
          await supabase.rpc("site_visit_heartbeat", { p_visitor: id }).abortSignal(request.signal);
        } finally {
          window.clearTimeout(timeout);
          controller.signal.removeEventListener("abort", abort);
        }
      } catch { /* Telemetry failure must not affect a game or page. */ }
      finally { busy = false; }
    };
    const wake = () => { void heartbeat(); };
    wake();
    const timer = window.setInterval(wake, 60000);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      controller.abort();
      unsubscribe();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [blocked, owner]);
}
