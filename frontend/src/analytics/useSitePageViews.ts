import { useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { canMeasureVisits } from "./ga";
import { SITE_OWNER, getVisitorId, isOwnerBrowser } from "./visitorIdentity";

// Retries live only in this document: no URLs or durable browsing history.
const retryLifetime = 10 * 60 * 1000;
const eligible = () => canMeasureVisits() && !isOwnerBrowser() &&
  document.visibilityState === "visible" && navigator.onLine;
function enqueue(view: { id?: string }, pending: Map<string, number>) {
  const now = Date.now();
  for (const [id, at] of pending) if (now - at > retryLifetime) pending.delete(id);
  if (view.id) return;
  view.id = crypto.randomUUID();
  pending.set(view.id, now);
  if (pending.size > 32) pending.delete(pending.keys().next().value!);
}

export function useSitePageViews(blocked: boolean, owner: string, pathname: string) {
  const activation = useRef<{ path: string; id?: string }>({ path: pathname });
  const pending = useRef(new Map<string, number>());
  const wake = useRef<(() => void) | null>(null);

  useEffect(() => {
    // A pathname transition (including Back/Forward) is a new view. Query/hash
    // changes and StrictMode effect replay keep the same activation and token.
    if (activation.current.path !== pathname) activation.current = { path: pathname };
    if (owner === SITE_OWNER || isOwnerBrowser()) pending.current.clear();
    if (!blocked && eligible()) {
      enqueue(activation.current, pending.current);
      wake.current?.();
    }
  }, [pathname, blocked, owner]);

  useEffect(() => {
    if (blocked || owner === SITE_OWNER || isOwnerBrowser()) return;
    const lifecycle = new AbortController();
    let busy = false;
    const flush = async () => {
      if (busy || lifecycle.signal.aborted || !eligible()) return;
      enqueue(activation.current, pending.current);
      busy = true;
      try {
        const visitor = await getVisitorId();
        while (!lifecycle.signal.aborted && eligible() && pending.current.size) {
          const id = pending.current.keys().next().value!;
          const request = new AbortController();
          const abort = () => request.abort();
          lifecycle.signal.addEventListener("abort", abort, { once: true });
          const timeout = window.setTimeout(abort, 10000);
          try {
            const { error } = await supabase.rpc("site_record_page_view", { p_visitor: visitor, p_view: id }).abortSignal(request.signal);
            if (error || request.signal.aborted) break;
            pending.current.delete(id);
          } finally {
            window.clearTimeout(timeout);
            lifecycle.signal.removeEventListener("abort", abort);
          }
        }
      } catch { /* Observational telemetry must never interrupt a page or game. */ }
      finally { busy = false; }
    };
    const resume = () => { void flush(); };
    wake.current = resume;
    resume();
    const timer = window.setInterval(resume, 15000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      wake.current = null;
      lifecycle.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [blocked, owner]);
}
