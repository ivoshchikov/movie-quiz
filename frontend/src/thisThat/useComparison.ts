import { useCallback, useEffect, useRef, useState } from "react";
import { comparisonRequest } from "./api";
import type { Choice, Comparison } from "./api";
import { ACTIVITY, fromComparison, readRun, rememberGuest, runKey, signalActivity, writeRun } from "./storage";
import type { Pending, Run } from "./storage";

type Work = "load" | "retry" | "choose" | "next" | "more";
export function useComparison(initial: Run) {
  const [game, setGame] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(false), [notice, setNotice] = useState("");
  const descriptor = useRef(initial), current = useRef<Comparison | null>(null), locked = useRef(false), alive = useRef(true), queued = useRef(false), controller = useRef<AbortController | null>(null);
  const performRef = useRef<(kind: Work, choice?: Choice) => Promise<void>>(async () => {});
  const perform = useCallback(async (kind: Work, choice?: Choice) => {
    if (!alive.current || locked.current) { if (kind === "load") queued.current = true; return; }
    locked.current = true; setBusy(true); setError(false); setNotice("");
    const run = descriptor.current, g = current.current;
    const stored = readRun(run.owner);
    let pending: Pending | undefined = kind === "retry" ? (stored?.id === run.id ? stored.pending : run.pending) : undefined;
    if (kind === "choose" && g?.round && choice && g.round.outcome === null) pending = { kind: "choose", round: g.round.id, choice };
    if ((kind === "next" || kind === "more") && g?.round?.outcome) pending = { kind: "next", round: g.round.id, more: kind === "more" };
    if (pending) { descriptor.current = { ...run, pending }; writeRun(descriptor.current); }
    controller.current = new AbortController();
    try {
      let next: Comparison;
      if (pending?.kind === "choose") next = await comparisonRequest("this_that_choose", { p_id: run.id, p_round: pending.round, p_choice: pending.choice }, controller.current.signal);
      else if (pending?.kind === "next") next = await comparisonRequest("this_that_next", { p_id: run.id, p_previous: pending.round, p_more: pending.more }, controller.current.signal);
      else next = await comparisonRequest(run.confirmed ? "this_that_status" : "this_that_open", { p_id: run.id, ...(!run.confirmed ? { p_board: run.board } : {}) }, controller.current.signal);
      if (next.owner !== run.owner || next.board !== run.board || (run.confirmed && next.id !== run.id)) throw Error("Comparison owner changed");
      if (!alive.current) return;
      if (current.current && next.version < current.current.version) return;
      const saved = readRun(run.owner), unresolved = saved?.id === next.id ? saved.pending : undefined;
      const stillPending = unresolved && next.round?.id === unresolved.round && (unresolved.kind === "choose" ? next.round.outcome === null : !next.complete && next.round.outcome !== null);
      descriptor.current = { ...fromComparison(next), ...(stillPending ? { pending: unresolved } : {}) };
      if (!saved || saved.id === next.id || !run.confirmed) writeRun(descriptor.current); current.current = next; setGame(next); rememberGuest(next);
      if (stillPending) setError(true);
      if (pending) signalActivity();
    } catch (failure) {
      if (!alive.current) return;
      if ((failure as { code?: string })?.code === "PT409") {
        queued.current = true; setNotice("A choice was already saved in another tab. Checking the latest pair…");
      } else setError(true);
    } finally {
      locked.current = false;
      if (alive.current) { setBusy(false); if (queued.current) { queued.current = false; void performRef.current("load"); } }
    }
  }, []);
  performRef.current = perform;
  useEffect(() => {
    alive.current = true; void perform("load");
    const visible = () => { if (document.visibilityState === "visible") void perform("load"); };
    const storage = (e: StorageEvent) => { if (e.key === ACTIVITY || e.key === runKey(initial.owner)) { const saved = readRun(initial.owner); if (saved && saved.id !== descriptor.current.id) return; if (locked.current) queued.current = true; else void perform("load"); } };
    document.addEventListener("visibilitychange", visible); window.addEventListener("storage", storage);
    return () => { alive.current = false; controller.current?.abort(); document.removeEventListener("visibilitychange", visible); window.removeEventListener("storage", storage); };
  }, [perform, initial.owner]);
  return { game, busy, error, notice, choose: (choice: Choice) => perform("choose", choice), next: () => perform("next"), more: () => perform("more"), retry: () => perform("retry") };
}
