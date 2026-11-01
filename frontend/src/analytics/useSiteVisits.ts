import { useEffect } from "react";
import { supabase } from "../supabase";
import { canMeasureVisits } from "./ga";

const OWNER = "112743d7-f683-4bbb-8117-068e89a00f22";
const visitorKey = "hq_visitor_id";
const ownerKey = "hq_visitor_owner_browser";
const lastSentKey = "hq_visitor_last_sent";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memoryId: string | null = null;
let lastSent = 0;
let excludedBrowser = false;

function existingId() {
  try {
    const value = localStorage.getItem(visitorKey);
    if (value && uuid.test(value)) return value;
  } catch { /* Denied storage falls back to one identifier for this document. */ }
  return memoryId;
}
function visitorId() {
  const create = () => {
    const existing = existingId();
    if (existing) return existing;
    memoryId = crypto.randomUUID();
    try { localStorage.setItem(visitorKey, memoryId); } catch { /* Memory-only. */ }
    return memoryId;
  };
  // Two newly opened tabs must share the first browser identifier.
  return navigator.locks ? navigator.locks.request("hq-visitor-id", create) : Promise.resolve(create());
}
function ownerBrowser() {
  if (excludedBrowser) return true;
  try { return localStorage.getItem(ownerKey) === "1"; } catch { return false; }
}

export function useSiteVisits(blocked: boolean, owner: string) {
  useEffect(() => {
    const controller = new AbortController();
    if (owner === OWNER) {
      // Also remove any earlier guest observations from this owner's browser.
      const id = existingId();
      excludedBrowser = true;
      try { localStorage.setItem(ownerKey, "1"); } catch { /* Account exclusion is also enforced by SQL. */ }
      if (id) void supabase.rpc("site_visit_heartbeat", { p_visitor: id }).abortSignal(controller.signal).then(() => {}, () => {});
      return () => controller.abort();
    }
    if (blocked || ownerBrowser() || !canMeasureVisits()) return;
    let busy = false;
    const heartbeat = async () => {
      if (busy || controller.signal.aborted || ownerBrowser() || !canMeasureVisits() ||
        document.visibilityState !== "visible" || !navigator.onLine) return;
      busy = true;
      try {
        const id = await visitorId();
        if (controller.signal.aborted || ownerBrowser() || !canMeasureVisits() || document.visibilityState !== "visible") return;
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
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [blocked, owner]);
}
