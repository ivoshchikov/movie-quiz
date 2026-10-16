import { useEffect, useRef, useState } from "react";
import { getMyDailyResult, submitDailyResult } from "../api";
import type { MyDailyResult, Question } from "../api";
import { getPublicUrl } from "../supabase";
import { dailyBegin, dailyReceipt, dailyStatus } from "../game/server";
import type { DailyStatus } from "../game/server";
import { gaEvent } from "../analytics/ga";
import { attemptAnalytics } from "../analytics/attempts";
import { clearDailyRun, dailyRunKey, pointToDaily, readDailyRun, writeDailyRun } from "./dailyStorage";
import type { DailyRun } from "./dailyStorage";
import { dailyDate, nextDailyReset } from "./time";

type Phase = "loading" | "guest" | "ready" | "load-error" | "empty" | "image-loading" | "image-error" |
  "starting" | "start-error" | "playing" | "saving" | "save-error" | "result";
interface DailyView {
  owner: string | null; phase: Phase; date: string; today: string; question: Question | null;
  options: string[]; run: DailyRun | null; result: MyDailyResult | null; elapsed: number; startedAt: string | null;
  imageAttempt: number; resetIn: number; storageAvailable: boolean; refreshKey: number;
}
interface Actions {
  start: () => void; imageReady: (id: number, attempt: number) => void; imageFailed: (id: number, attempt: number) => void;
  answer: (answer: string) => void; retry: () => void; openToday: () => void;
}
function initial(owner: string | null): DailyView {
  return { owner, phase: "loading", date: dailyDate(), today: dailyDate(), question: null, options: [], run: null,
    result: null, elapsed: 0, startedAt: null, imageAttempt: 0, resetIn: Math.ceil((nextDailyReset() - Date.now()) / 1000), storageAvailable: true, refreshKey: 0 };
}
async function withDailyLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request(key, work) : work();
}
export function useDailyGame(userId: string | null, authLoading: boolean) {
  const [view, setView] = useState<DailyView>(() => initial(userId));
  const actions = useRef<Actions | null>(null);
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    let mounted = true, revision = 0, state = initial(userId), refreshing = false;
    let serverAt = Date.now(), receivedAt = performance.now(), closesAt = nextDailyReset();
    const lifetime = new AbortController();
    function update(patch: Partial<DailyView>) { state = { ...state, ...patch }; if (mounted) setView(state); }
    function valid(id: number) { return mounted && !lifetime.signal.aborted && id === revision; }
    const now = () => serverAt + Math.max(0, performance.now() - receivedAt);
    function sync(status: DailyStatus) {
      serverAt = Date.parse(status.server_now); receivedAt = performance.now(); closesAt = Date.parse(status.closes_at);
      update({ date: status.date, today: status.date, startedAt: status.started_at, resetIn: Math.max(0, Math.ceil((closesAt - now()) / 1000)) });
    }
    function confirmed(result: MyDailyResult) {
      if (!userId || !result.is_answered) return;
      clearDailyRun(userId, state.date);
      update({ phase: "result", run: null, question: null, options: [], result,
        elapsed: result.time_spent ?? 0, refreshKey: state.refreshKey + 1 });
    }
    async function boot() {
      const id = ++revision;
      const previousDate = state.date;
      update({ phase: "loading", question: null, options: [], result: null, run: null });
      if (authLoading) return;
      try {
        const status = await dailyStatus(lifetime.signal);
        if (!valid(id)) return;
        sync(status);
        if (userId && previousDate !== status.date) clearDailyRun(userId, previousDate);
        const viewKey = `${status.date}:${userId ?? "guest"}`;
        if (viewed.current !== viewKey && gaEvent("daily_view", { d: status.date, game_mode: "daily", is_logged_in: !!userId })) viewed.current = viewKey;
        if (!userId) { update({ phase: "guest" }); return; }
        const receipt = dailyReceipt(status);
        if (receipt) { confirmed(receipt); return; }
        const run = readDailyRun(userId, status.date);
        if (run?.pending && status.started_at) {
          update({ phase: "save-error", run: { ...run, startedAt: Date.parse(status.started_at) }, elapsed: run.pending.seconds }); return;
        }
        update({ phase: "ready", elapsed: status.started_at ? Math.max(0, Math.floor((now() - Date.parse(status.started_at)) / 1000)) : 0 });
      } catch { if (valid(id)) update({ phase: "load-error" }); }
    }
    async function begin() {
      if (!userId || !["ready", "start-error"].includes(state.phase)) return;
      const id = revision, date = state.date;
      const resumed = !!state.startedAt;
      update({ phase: "starting" });
      try {
        const status = await withDailyLock(dailyRunKey(userId, date), () => dailyBegin(date, lifetime.signal));
        if (!valid(id)) return;
        sync(status);
        const receipt = dailyReceipt(status);
        if (receipt) { confirmed(receipt); return; }
        const q = status.question!;
        const question: Question = { ...q, image_url: getPublicUrl(q.image_url) };
        const run: DailyRun = { version: 1, userId, date: status.date, questionId: q.id, options: q.options, startedAt: Date.parse(status.started_at!) };
        const old = readDailyRun(userId, status.date);
        if (old?.pending && old.questionId === q.id) run.pending = old.pending;
        const storageAvailable = writeDailyRun(run);
        update({ phase: run.pending ? "save-error" : "image-loading", question, run, options: run.options, storageAvailable,
          imageAttempt: 0, elapsed: Math.max(0, Math.floor((now() - run.startedAt) / 1000)) });
        attemptAnalytics("daily", `${userId}:${status.date}:${run.startedAt}`).start({ d: status.date, is_logged_in: true }, resumed);
      } catch {
        if (valid(id)) {
          // A day may have changed while the request waited for a database lock.
          if (now() >= closesAt) void boot(); else update({ phase: "start-error" });
        }
      }
    }
    async function save() {
      if (!userId || !state.run?.pending || state.phase === "saving") return;
      const run = state.run, pending = run.pending!, id = revision;
      if (now() >= closesAt) { clearDailyRun(userId, run.date); void boot(); return; }
      update({ phase: "saving", elapsed: pending.seconds });
      try {
        const result = await withDailyLock(dailyRunKey(userId, run.date), async () => {
          const prior = await getMyDailyResult(userId, run.date, lifetime.signal);
          if (!valid(id)) throw new Error("inactive-daily");
          if (prior.is_answered) return prior;
          if (now() >= closesAt) throw new Error("daily-expired");
          await submitDailyResult(userId, run.date, pending.selected, 0, lifetime.signal);
          const saved = await getMyDailyResult(userId, run.date, lifetime.signal);
          if (!saved.is_answered) throw new Error("unconfirmed-daily");
          return saved;
        });
        if (!valid(id)) return;
        confirmed(result);
        attemptAnalytics("daily", `${userId}:${run.date}:${run.startedAt}`).submit({ d: run.date, ok: result.is_correct ?? false, elapsed: result.time_spent ?? 0, is_logged_in: true });
      } catch { if (valid(id)) { if (now() >= closesAt) { clearDailyRun(userId, run.date); void boot(); } else update({ phase: "save-error" }); } }
    }
    actions.current = {
      start: () => { void begin(); },
      imageReady: (id, attempt) => {
        if (state.phase === "image-loading" && state.question?.id === id && state.imageAttempt === attempt) update({ phase: "playing" });
      },
      imageFailed: (id, attempt) => {
        if (state.phase === "image-loading" && state.question?.id === id && state.imageAttempt === attempt) update({ phase: "image-error" });
      },
      answer: selected => {
        if (state.phase !== "playing" || !state.run || !state.options.includes(selected)) return;
        if (now() >= closesAt) { clearDailyRun(userId!, state.date); void boot(); return; }
        const old = readDailyRun(userId!, state.date);
        const run: DailyRun = old?.pending ? old : { ...state.run, pending: { selected, seconds: Math.max(1, Math.floor((now() - state.run.startedAt) / 1000)) } };
        update({ phase: "save-error", run, storageAvailable: writeDailyRun(run), elapsed: run.pending!.seconds });
        void save();
      },
      retry: () => {
        if (state.phase === "save-error") void save();
        else if (state.phase === "image-error") update({ phase: "image-loading", imageAttempt: state.imageAttempt + 1 });
        else if (state.phase === "start-error") void begin();
        else if (["load-error", "empty"].includes(state.phase)) void boot();
      },
      openToday: () => { if (userId) pointToDaily(userId, state.today); void boot(); },
    };
    function tick() {
      if (!mounted) return;
      const t = now();
      update({ resetIn: Math.max(0, Math.ceil((closesAt - t) / 1000)),
        elapsed: state.run && !state.run.pending ? Math.max(0, Math.floor((t - state.run.startedAt) / 1000)) : state.elapsed });
      if (t >= closesAt && !["loading", "load-error"].includes(state.phase)) {
        if (state.phase === "result") {
          if (!refreshing) { refreshing = true; void dailyStatus(lifetime.signal).then(s => { if (mounted) { serverAt = Date.parse(s.server_now); receivedAt = performance.now(); closesAt = Date.parse(s.closes_at); update({ today: s.date }); } }).catch(() => {}).finally(() => { refreshing = false; }); }
        } else { if (userId) clearDailyRun(userId, state.date); void boot(); }
      }
    }
    function focus() {
      tick();
      // Refresh the authoritative calendar on return from a suspended tab or another device.
      if (!refreshing && !["loading", "starting", "saving"].includes(state.phase)) {
        refreshing = true;
        const id = revision;
        void dailyStatus(lifetime.signal).then(s => {
          if (!valid(id)) return;
          if (s.date !== state.date && state.phase !== "result") { void boot(); return; }
          if (s.date === state.date) { sync(s); const receipt = dailyReceipt(s); if (receipt) confirmed(receipt); }
        }).catch(() => {}).finally(() => { refreshing = false; });
      }
    }
    function storage(event: StorageEvent) {
      if (!userId || event.key !== dailyRunKey(userId, state.date) || state.phase === "saving") return;
      const run = readDailyRun(userId, state.date);
      if (run?.pending && state.phase === "playing") update({ phase: "save-error", run, elapsed: run.pending.seconds });
      focus();
    }
    const interval = window.setInterval(tick, 250);
    window.addEventListener("focus", focus); window.addEventListener("pageshow", focus);
    document.addEventListener("visibilitychange", focus); window.addEventListener("storage", storage);
    void boot();
    return () => {
      mounted = false; revision++; lifetime.abort(); actions.current = null; window.clearInterval(interval);
      window.removeEventListener("focus", focus); window.removeEventListener("pageshow", focus);
      document.removeEventListener("visibilitychange", focus); window.removeEventListener("storage", storage);
    };
  }, [userId, authLoading]);
  return { ...(view.owner === userId && !authLoading ? view : initial(userId)), actions };
}
