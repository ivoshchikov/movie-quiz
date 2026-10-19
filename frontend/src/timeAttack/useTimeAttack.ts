import { useEffect, useRef, useState } from "react";
import { attemptAnalytics } from "../analytics/attempts";
import { attackRequest } from "./api";
import type { AttackGame } from "./api";
import { attackStorageKey, writeAttackRun } from "./storage";
import type { AttackRun, PendingAction } from "./storage";

type Phase = "loading" | "image-loading" | "playing" | "checking" | "feedback" | "image-error" | "error" | "finished";
interface View { game: AttackGame | null; phase: Phase; error: string | null; seconds: number; imageAttempt: number; working: boolean; }
interface Actions { answer: (answer: string) => void; skip: () => void; finish: () => void; retry: () => void; image: (id: string, attempt: number, ok: boolean) => void; }
const initial: View = { game: null, phase: "loading", error: null, seconds: 0, imageAttempt: 0, working: false };

export function useTimeAttack(run: AttackRun | null, ready: boolean) {
  const [view, setView] = useState<View>(initial);
  const actions = useRef<Actions | null>(null);
  useEffect(() => {
    if (!ready || !run) return;
    let mounted = true, busy = false, state = { ...initial }, game: AttackGame | null = null;
    let descriptor = { ...run }, imageReady: string | null = null, serverAt = 0, receivedAt = 0;
    let pending: PendingAction | undefined = descriptor.pending, retryFinish = false, expiryChecked = false;
    const analytics = attemptAnalytics("time_attack", run.id);
    const settings = { category_id: run.category, difficulty_id: { easy: 1, medium: 2, hard: 3 }[run.level], is_logged_in: !!run.owner };
    const now = () => serverAt + Math.max(0, performance.now() - receivedAt);
    function update(patch: Partial<View>) { state = { ...state, ...patch }; if (mounted) setView(state); }
    function setBusy(value: boolean) { busy = value; update({ working: value }); }
    function remember() {
      descriptor = { ...descriptor, pending };
      // An old tab must not replace the pointer to a newer run on the same device.
      try {
        const current = JSON.parse(localStorage.getItem(attackStorageKey(descriptor.owner)) || "null");
        if (current && current.id !== descriptor.id) return;
      } catch { /* Memory fallback. */ }
      writeAttackRun(descriptor);
    }
    function apply(value: AttackGame) {
      if (value.id !== descriptor.id || value.owner !== descriptor.owner || value.category_id !== descriptor.category || value.level !== descriptor.level) throw new Error("unexpected-time-attack");
      if (game && (value.version < game.version || value.version === game.version && Date.parse(value.server_now) < Date.parse(game.server_now))) return;
      const changedRound = value.round?.id !== game?.round?.id;
      game = value; serverAt = Date.parse(value.server_now); receivedAt = performance.now();
      descriptor.confirmed = true;
      if (pending && (value.status === "finished" || value.round?.id !== pending.round || value.round?.outcome)) pending = undefined;
      remember();
      if (changedRound) imageReady = null;
      let phase: Phase = value.status === "finished" ? "finished" : value.round?.outcome ? "feedback" : imageReady === value.round?.id ? "playing" : "image-loading";
      if (!changedRound && state.phase === "image-error" && phase === "image-loading") phase = "image-error";
      if (pending && phase !== "finished" && phase !== "feedback") phase = "error";
      update({ game: value, phase, error: pending ? "Your action is not confirmed. Retry sends the same choice; the clock keeps running." : null,
        seconds: Math.max(0, Math.ceil((Date.parse(value.deadline_at) - now()) / 1000)), ...(changedRound ? { imageAttempt: 0 } : {}) });
      if (value.round?.outcome && ["correct", "wrong", "skipped"].includes(value.round.outcome)) {
        analytics.answer(value.round.number, value.round.outcome as "correct" | "wrong" | "skipped", { ...settings, question_id: value.round.question_id });
      }
      if (value.status === "finished") analytics.end({ ...settings, score: value.score, elapsed_secs: value.elapsed_ms / 1000, finish_reason: value.finish_reason, result_confirmed: true });
    }
    function failure(message: string) { if (mounted) update({ phase: "error", error: message }); }
    async function setup() {
      if (busy || !mounted) return;
      setBusy(true); update({ phase: "loading", error: null });
      try {
        const value = await attackRequest(descriptor.confirmed ? "time_attack_status" : "time_attack_start", descriptor.confirmed ? { p_session: descriptor.id } : { p_session: descriptor.id, p_category_id: descriptor.category, p_level: descriptor.level });
        if (!mounted) return;
        if (value.status === "active") analytics.start(settings);
        apply(value);
        if (descriptor.owner) { try { localStorage.setItem(`hq:quiz:activity:${descriptor.owner}`, crypto.randomUUID()); } catch { /* Focus also reconciles. */ } }
      } catch (e) {
        const limited = e && typeof e === "object" && "code" in e && e.code === "PT429";
        failure(limited ? "New games are temporarily limited. Please wait and try again." : "Time Attack could not load. Retry checks the same run. Your server clock may already be running.");
      } finally { setBusy(false); }
      if (mounted && pending && game?.status === "active") void submit();
    }
    async function reconcile() {
      if (busy || !mounted || !game || game.status === "finished") return;
      setBusy(true);
      try { const value = await attackRequest("time_attack_status", { p_session: descriptor.id }); if (mounted) apply(value); }
      catch { if (state.seconds === 0) failure("Your final result could not be confirmed. Reconnect and retry; the server deadline still applies."); }
      finally { setBusy(false); }
    }
    async function submit() {
      if (busy || !mounted || !pending || !game || game.status === "finished") return;
      const action = pending;
      setBusy(true); update({ phase: "checking", error: null });
      try {
        const value = await attackRequest("time_attack_action", { p_session: descriptor.id, p_round: action.round, p_action: action.action, p_answer: action.answer });
        if (mounted) apply(value);
      } catch { failure("Your action could not be confirmed. Retry sends the same choice; the clock keeps running."); }
      finally { setBusy(false); }
      if (mounted && state.phase === "error") void reconcile();
    }
    async function next() {
      if (busy || !mounted || !game?.round || game.status === "finished") return;
      setBusy(true); update({ phase: "loading" });
      try { const value = await attackRequest("time_attack_next", { p_session: descriptor.id, p_round: game.round.id }); if (mounted) apply(value); }
      catch { failure("The next question could not load. Retry keeps your original clock."); }
      finally { setBusy(false); }
    }
    async function finish() {
      if (busy || !mounted || !game || game.status === "finished") return;
      retryFinish = true;
      if (pending) { await submit(); if (pending || !mounted || state.game?.status === "finished") return; }
      setBusy(true); update({ phase: "checking", error: null });
      try { const value = await attackRequest("time_attack_finish", { p_session: descriptor.id }); if (mounted) { apply(value); retryFinish = false; } }
      catch { failure("Ending this run could not be confirmed. Retry to save your server result."); }
      finally { setBusy(false); }
    }
    function tick() {
      if (!mounted || !game || game.status === "finished") return;
      const ms = Math.max(0, Date.parse(game.deadline_at) - now());
      update({ seconds: Math.ceil(ms / 1000) });
      if (busy) return;
      if (ms === 0 && !expiryChecked) { expiryChecked = true; void reconcile(); }
      else if (ms > 0 && state.phase === "feedback" && game.round?.next_at && now() >= Date.parse(game.round.next_at)) void next();
    }
    function choose(action: "answer" | "skip", answer: string | null) {
      if (busy || pending || !game?.round || game.status !== "active" || !["playing", "image-error", "image-loading"].includes(state.phase) || state.seconds <= 0) return;
      if (action === "answer" && (state.phase !== "playing" || !game.round.options.includes(answer!))) return;
      pending = { round: game.round.id, action, answer }; remember(); void submit();
    }
    actions.current = {
      answer: value => choose("answer", value), skip: () => choose("skip", null), finish: () => void finish(),
      retry: () => {
        if (!game) void setup();
        else if (retryFinish) void finish();
        else if (pending) void submit();
        else if (state.phase === "image-error") { imageReady = null; update({ phase: "image-loading", imageAttempt: state.imageAttempt + 1 }); }
        else { expiryChecked = false; void reconcile(); }
      },
      image: (id, attempt, ok) => {
        if (!mounted || game?.round?.id !== id || state.imageAttempt !== attempt || state.phase !== "image-loading") return;
        if (ok) { imageReady = id; update({ phase: "playing" }); tick(); } else update({ phase: "image-error" });
      },
    };
    function focus() { if (document.visibilityState === "visible") { tick(); void reconcile(); } }
    function storage(e: StorageEvent) { if (e.key === attackStorageKey(descriptor.owner) || e.key === `hq:quiz:activity:${descriptor.owner}`) void reconcile(); }
    function beforeUnload(e: BeforeUnloadEvent) { if (game?.status === "active") { e.preventDefault(); e.returnValue = ""; } }
    const interval = window.setInterval(tick, 100);
    window.addEventListener("focus", focus); window.addEventListener("online", focus); window.addEventListener("storage", storage);
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("visibilitychange", focus);
    void setup();
    return () => {
      mounted = false; actions.current = null; window.clearInterval(interval);
      window.removeEventListener("focus", focus); window.removeEventListener("online", focus); window.removeEventListener("storage", storage);
      window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("visibilitychange", focus);
    };
  }, [run, ready]);
  return { ...view, actions };
}
