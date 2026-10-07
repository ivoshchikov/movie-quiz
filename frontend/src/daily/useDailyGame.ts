import { useEffect, useRef, useState } from "react";
import { getDailyQuestion, getMyDailyResult, startDailySession, submitDailyResult } from "../api";
import type { MyDailyResult, Question } from "../api";
import { gaEvent } from "../analytics/ga";
import { shuffle } from "../utils/shuffle";
import { clearDailyRun, dailyRunKey, initialDailyDate, pointToDaily, readDailyRun, writeDailyRun } from "./dailyStorage";
import type { DailyRun } from "./dailyStorage";
import { dailyDate, nextDailyReset } from "./time";

type Phase = "loading" | "guest" | "ready" | "load-error" | "empty" | "image-loading" | "image-error" |
  "starting" | "start-error" | "playing" | "saving" | "save-error" | "result";
interface DailyView {
  owner: string | null; phase: Phase; date: string; today: string; question: Question | null;
  options: string[]; run: DailyRun | null; result: MyDailyResult | null; elapsed: number;
  imageAttempt: number; resetIn: number; storageAvailable: boolean; refreshKey: number;
}
interface Actions {
  start: () => void; imageReady: (id: number, attempt: number) => void; imageFailed: (id: number, attempt: number) => void;
  answer: (answer: string) => void; retry: () => void; openToday: () => void;
}
function initial(owner: string | null): DailyView {
  return { owner, phase: "loading", date: dailyDate(), today: dailyDate(), question: null, options: [], run: null,
    result: null, elapsed: 0, imageAttempt: 0, resetIn: Math.ceil((nextDailyReset() - Date.now()) / 1000), storageAvailable: true, refreshKey: 0 };
}
// Serialise writes across tabs on browsers supporting Web Locks. The server result
// is checked inside the lock; a transport error never releases a new answer choice.
async function withDailyLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  if (navigator.locks) return navigator.locks.request(key, work);
  return work();
}

export function useDailyGame(userId: string | null, authLoading: boolean) {
  const [view, setView] = useState<DailyView>(() => initial(userId));
  const actions = useRef<Actions | null>(null);
  useEffect(() => {
    let mounted = true, revision = 0, heldPreviousResult = false;
    let state = initial(userId);
    let resetAt = nextDailyReset();
    let viewedDate: string | null = null;
    const lifetime = new AbortController();
    function update(patch: Partial<DailyView>) { state = { ...state, ...patch }; if (mounted) setView(state); }
    function valid(id: number) { return mounted && !lifetime.signal.aborted && id === revision; }
    function isPhase(phase: Phase) { return state.phase === phase; }
    async function request<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
      const controller = new AbortController();
      const abort = () => controller.abort();
      lifetime.signal.addEventListener("abort", abort, { once: true });
      const timeout = window.setTimeout(abort, 20000);
      try { if (lifetime.signal.aborted) controller.abort(); return await work(controller.signal); }
      finally { window.clearTimeout(timeout); lifetime.signal.removeEventListener("abort", abort); }
    }
    function confirmed(result: MyDailyResult) {
      if (!userId || !result.is_answered) return;
      clearDailyRun(userId, state.date);
      heldPreviousResult = state.date !== dailyDate();
      update({ phase: "result", run: null, question: null, options: [], result,
        elapsed: result.time_spent ?? 0, refreshKey: state.refreshKey + 1 });
    }
    async function boot(date: string) {
      const id = ++revision;
      const recovered = userId ? readDailyRun(userId, date) : null;
      heldPreviousResult = !!recovered?.pending && date !== dailyDate();
      update({ ...initial(userId), date, today: dailyDate(), run: recovered, refreshKey: state.refreshKey });
      if (authLoading) return;
      if (viewedDate !== date) { gaEvent("daily_view", { d: date, is_logged_in: !!userId }); viewedDate = date; }
      if (!userId) { update({ phase: "guest" }); return; }
      try {
        const status = await request(signal => getMyDailyResult(userId, date, signal));
        if (!valid(id)) return;
        if (status.is_answered) { confirmed(status); return; }
        const run = readDailyRun(userId, date);
        if (run?.pending) {
          update({ phase: "save-error", run, options: run.options, elapsed: run.pending.seconds, storageAvailable: writeDailyRun(run) });
          return;
        }
        const question = await request(signal => getDailyQuestion(date, signal));
        if (!valid(id)) return;
        if (run && (run.questionId !== question.id || question.options.some(option => !run.options.includes(option)))) throw new Error("changed-daily");
        update({ phase: "ready", question, run, options: run?.options ?? shuffle(question.options),
          elapsed: run ? Math.max(0, Math.floor((Date.now() - run.startedAt) / 1000)) : 0 });
      } catch (error) {
        if (valid(id)) update({ phase: error instanceof Error && error.message === "no-daily-question" ? "empty" : "load-error" });
      }
    }
    async function begin() {
      if (!userId || !state.question || state.phase !== "image-loading") return;
      const id = revision, question = state.question, date = state.date;
      update({ phase: "starting" });
      try {
        await withDailyLock(dailyRunKey(userId, date), async () => {
          if (!valid(id) || !isPhase("starting")) return;
          const status = await request(signal => getMyDailyResult(userId, date, signal));
          if (!valid(id) || !isPhase("starting")) return;
          if (status.is_answered) { confirmed(status); return; }
          // A second tab may have started while this tab was on the introduction.
          let run = readDailyRun(userId, date) ?? state.run;
          if (run?.pending) { update({ run, phase: "save-error", elapsed: run.pending.seconds }); return; }
          if (run && run.questionId !== question.id) throw new Error("changed-daily");
          if (!run) {
            await request(signal => startDailySession(userId, date, signal));
            if (!valid(id) || !isPhase("starting")) return;
            run = { version: 1, userId, date, questionId: question.id, options: state.options, startedAt: Date.now() };
          }
          const storageAvailable = writeDailyRun(run);
          update({ phase: "playing", run, options: run.options, storageAvailable,
            elapsed: Math.max(0, Math.floor((Date.now() - run.startedAt) / 1000)) });
        });
        if (!valid(id) || !isPhase("playing")) return;
        gaEvent("daily_start", { d: date, is_logged_in: true });
      } catch { if (valid(id) && isPhase("starting")) update({ phase: "start-error" }); }
    }
    async function save() {
      if (!userId || !state.run?.pending || state.phase === "saving") return;
      const run = state.run, pending = run.pending!, id = revision;
      update({ phase: "saving", elapsed: pending.seconds });
      try {
        const result = await withDailyLock(dailyRunKey(userId, run.date), async () => {
          if (!valid(id)) throw new Error("inactive-daily");
          const status = await request(signal => getMyDailyResult(userId, run.date, signal));
          if (!valid(id)) throw new Error("inactive-daily");
          if (status.is_answered) return status;
          await request(signal => submitDailyResult(userId, run.date, pending.correct, pending.seconds, signal));
          if (!valid(id)) throw new Error("inactive-daily");
          const saved = await request(signal => getMyDailyResult(userId, run.date, signal));
          if (!saved.is_answered) throw new Error("unconfirmed-daily");
          return saved;
        });
        if (!valid(id)) return;
        confirmed(result);
        gaEvent("daily_submit", { d: run.date, ok: result.is_correct ?? false, elapsed: result.time_spent ?? pending.seconds });
      } catch { if (valid(id)) update({ phase: "save-error" }); }
    }
    actions.current = {
      start: () => { if (state.phase === "ready") update({ phase: "image-loading", imageAttempt: 0 }); },
      imageReady: (id, attempt) => { if (state.question?.id === id && state.imageAttempt === attempt) void begin(); },
      imageFailed: (id, attempt) => { if (state.phase === "image-loading" && state.question?.id === id && state.imageAttempt === attempt) update({ phase: "image-error" }); },
      answer: selected => {
        if (state.phase !== "playing" || !state.question || !state.run || !state.options.includes(selected)) return;
        if (state.date !== dailyDate()) { void boot(dailyDate()); return; }
        // Lock synchronously, before reading the server. Retries retain this payload.
        const stored = readDailyRun(userId!, state.date);
        const run: DailyRun = stored?.pending ? stored : { ...state.run, pending: { selected,
          correct: selected.trim() === state.question.correct_answer?.trim(),
          seconds: Math.max(1, Math.floor((Date.now() - state.run.startedAt) / 1000)) } };
        const storageAvailable = writeDailyRun(run);
        update({ phase: "save-error", run, storageAvailable, elapsed: run.pending!.seconds });
        void save();
      },
      retry: () => {
        if (state.phase === "save-error") void save();
        else if (state.phase === "image-error" || state.phase === "start-error") update({ phase: "image-loading", imageAttempt: state.imageAttempt + 1 });
        else if (state.phase === "load-error" || state.phase === "empty") void boot(state.date);
      },
      openToday: () => { if (userId) pointToDaily(userId, dailyDate()); void boot(dailyDate()); },
    };
    function tick() {
      if (!mounted) return;
      const now = Date.now(), today = dailyDate(now);
      if (today !== state.today) resetAt = nextDailyReset(now);
      update({ today, resetIn: Math.max(0, Math.ceil((resetAt - now) / 1000)),
        elapsed: state.run && !state.run.pending ? Math.max(0, Math.floor((now - state.run.startedAt) / 1000)) : state.elapsed });
      // Never retarget a captured answer to the new day's question.
      if (today !== state.date && !state.run?.pending && !heldPreviousResult) void boot(today);
    }
    function storage(event: StorageEvent) {
      if (!userId || event.key !== dailyRunKey(userId, state.date) || state.phase === "saving") return;
      const run = readDailyRun(userId, state.date);
      if (run?.pending && state.phase === "playing") update({ phase: "save-error", run, elapsed: run.pending.seconds });
      const id = revision;
      void request(signal => getMyDailyResult(userId, state.date, signal)).then(result => {
        if (valid(id) && result.is_answered) confirmed(result);
      }).catch(() => { /* Retry still checks the server before submitting. */ });
    }
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick); window.addEventListener("pageshow", tick);
    document.addEventListener("visibilitychange", tick); window.addEventListener("storage", storage);
    void boot(userId ? initialDailyDate(userId, dailyDate()) : dailyDate());
    return () => {
      mounted = false; revision++; lifetime.abort(); actions.current = null; window.clearInterval(interval);
      window.removeEventListener("focus", tick); window.removeEventListener("pageshow", tick);
      document.removeEventListener("visibilitychange", tick); window.removeEventListener("storage", storage);
    };
  }, [userId, authLoading]);
  return { ...(view.owner === userId && !authLoading ? view : initial(userId)), actions };
}
