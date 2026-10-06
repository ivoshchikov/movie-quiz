import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkAnswer, getCategories, getDifficultyLevels, getQuestion } from "../api";
import type { Category, DifficultyLevel, Question } from "../api";
import { useAuth } from "../AuthContext";
import { gaEvent } from "../analytics/ga";
import { supabase } from "../supabase";
import { shuffle } from "../utils/shuffle";
import { checkpointGame, lastGameResult, recoverInterruptedGame, retainGameResult, saveGameResult } from "./resultStorage";
import type { ActiveGame, FinishReason, GameResult } from "./resultStorage";
import { guardGameNavigation } from "./navigationGuard";

type Phase = "setup" | "loading" | "image-loading" | "playing" | "checking" | "feedback" |
  "setup-error" | "question-error" | "image-error" | "answer-error" | "empty" | "finished";
type Feedback = "correct" | "wrong" | "timeout" | null;
interface GameView {
  phase: Phase; category: Category | null; level: DifficultyLevel | null; question: Question | null;
  options: string[]; number: number; score: number; lives: number; seconds: number; remaining: number;
  elapsed: number; selected: string | null; feedback: Feedback; imageAttempt: number;
}
interface Actions {
  answer: (answer: string) => void; imageReady: (id: number, attempt: number) => void;
  imageFailed: (id: number, attempt: number) => void; retry: () => void; finish: () => void;
}
const initial: GameView = { phase: "setup", category: null, level: null, question: null, options: [],
  number: 0, score: 0, lives: 0, seconds: 0, remaining: 1, elapsed: 0, selected: null, feedback: null, imageAttempt: 0 };

export function useNormalGame(categoryId: number | undefined, difficultyId: number | undefined, playKey: string) {
  const { loading: authLoading, session } = useAuth();
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const navigate = useNavigate();
  const [view, setView] = useState<GameView>(initial);
  const actions = useRef<Actions | null>(null);

  useEffect(() => {
    if (authLoading || categoryId == null || difficultyId == null) return;
    const catId = categoryId, diffId = difficultyId;
    recoverInterruptedGame();
    const previous = lastGameResult(sessionRef.current?.user.id ?? null);
    if (previous?.playKey === playKey) { navigate("/result", { replace: true, state: previous }); return; }
    let mounted = true, ended = false, state = { ...initial };
    let game: ActiveGame | null = null;
    let deadline = 0, chosenTime = 0, feedbackDeadline = 0, requestId = 0;
    let loadingRequest = false, restoringHistory = false;
    const shown: number[] = [];
    const originalIndex = window.history.state?.idx as number | undefined;

    function update(patch: Partial<GameView>) {
      state = { ...state, ...patch };
      if (mounted) setView(state);
    }
    function finish(reason: FinishReason, showResult = true, keepalive = false) {
      if (ended || !game) return;
      ended = true; requestId++;
      const result: GameResult = { id: game.id, playKey, userId: game.userId, categoryId: catId, difficultyId: diffId,
        score: state.score, elapsedSecs: Math.max(0, Math.floor((Date.now() - game.startedAt) / 1000)),
        finishReason: reason, saveStatus: game.userId ? "pending" : "device" };
      retainGameResult(result);
      void saveGameResult(result, sessionRef.current, keepalive);
      gaEvent("quiz_end", { category_id: catId, difficulty_id: diffId, score: result.score,
        elapsed_secs: result.elapsedSecs, finish_reason: reason });
      update({ phase: "finished", elapsed: result.elapsedSecs });
      if (showResult && mounted) navigate("/result", { replace: true, state: result });
    }
    async function loadQuestion() {
      if (ended || !mounted || loadingRequest) return;
      loadingRequest = true;
      const currentRequest = ++requestId;
      update({ phase: "loading", question: null, options: [], selected: null, feedback: null, imageAttempt: 0,
        seconds: state.level?.time_limit_secs ?? 0, remaining: 1 });
      try {
        const question = await getQuestion(shown, catId, diffId);
        if (!mounted || ended || currentRequest !== requestId) return;
        if (shown.includes(question.id) || question.category_id !== catId || question.difficulty_level_id !== diffId) throw new Error("unexpected-question");
        shown.push(question.id);
        update({ phase: "image-loading", question, options: shuffle(question.options), number: shown.length });
      } catch (error: unknown) {
        if (!mounted || ended || currentRequest !== requestId) return;
        const exhausted = error instanceof Error && (error.message === "no-question" || error.message === "no-more-questions");
        if (exhausted && shown.length > 0) finish("completed");
        else update({ phase: exhausted ? "empty" : "question-error" });
      } finally { loadingRequest = false; }
    }
    async function setup() {
      if (loadingRequest || ended || !mounted) return;
      loadingRequest = true; update({ phase: "setup" });
      try {
        const [categories, levels] = await Promise.all([getCategories(), getDifficultyLevels()]);
        if (!mounted || ended) return;
        const category = categories.find(item => item.id === catId), level = levels.find(item => item.id === diffId);
        if (!category || !level || !Number.isFinite(level.time_limit_secs) || level.time_limit_secs <= 0 || !Number.isInteger(level.lives) || level.lives < 1) throw new Error("invalid-settings");
        game = { id: crypto.randomUUID(), playKey, userId: sessionRef.current?.user.id ?? null, categoryId: catId, difficultyId: diffId,
          score: 0, startedAt: Date.now(), elapsedSecs: 0 };
        checkpointGame(game);
        update({ category, level, lives: level.lives, seconds: level.time_limit_secs });
        gaEvent("quiz_start", { category_id: catId, difficulty_id: diffId });
        loadingRequest = false; void loadQuestion();
      } catch { if (mounted && !ended) update({ phase: "setup-error" }); }
      finally { loadingRequest = false; }
    }
    function feedback(type: Exclude<Feedback, null>) {
      if (ended) return;
      const score = state.score + (type === "correct" ? 1 : 0), lives = state.lives - (type === "correct" ? 0 : 1);
      update({ phase: "feedback", feedback: type, score, lives, ...(type === "timeout" ? { seconds: 0, remaining: 0, selected: null } : {}) });
      if (game) { game.score = score; checkpointGame(game); }
      feedbackDeadline = Date.now() + (type === "correct" ? 900 : 1800);
    }
    async function answer(answerText: string, retry = false) {
      if (ended || !mounted || !state.question || (retry ? state.phase !== "answer-error" : state.phase !== "playing")) return;
      if (!retry && Date.now() >= deadline) { feedback("timeout"); return; }
      if (!state.options.includes(answerText)) return;
      const question = state.question, currentRequest = ++requestId;
      if (!retry) chosenTime = Math.max(0, deadline - Date.now());
      // Lock synchronously, including consecutive clicks/keyboard events before React renders.
      update({ phase: "checking", selected: answerText, seconds: Math.ceil(chosenTime / 1000), remaining: chosenTime / ((state.level?.time_limit_secs ?? 1) * 1000) });
      try {
        const result = await checkAnswer(question.id, answerText);
        if (!mounted || ended || currentRequest !== requestId) return;
        feedback(result.correct ? "correct" : "wrong");
        gaEvent("quiz_answer", { question_id: question.id, correct: result.correct });
        // A statistics request must never delay gameplay or change the checked answer.
        void supabase.rpc("touch_question_stats", { p_question_id: question.id, p_is_correct: result.correct }).then(() => {}, () => {});
      } catch { if (mounted && !ended && currentRequest === requestId) update({ phase: "answer-error" }); }
    }
    function tick() {
      if (ended || !game || !mounted) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - game.startedAt) / 1000));
      if (elapsed !== state.elapsed) { update({ elapsed }); checkpointGame(game); }
      if (state.phase === "playing") {
        const remainingMs = Math.max(0, deadline - Date.now());
        update({ seconds: Math.ceil(remainingMs / 1000), remaining: remainingMs / ((state.level?.time_limit_secs ?? 1) * 1000) });
        if (remainingMs === 0) feedback("timeout");
      } else if (state.phase === "feedback" && Date.now() >= feedbackDeadline) {
        if (state.lives === 0) finish("out-of-lives"); else void loadQuestion();
      }
    }
    actions.current = {
      answer: value => { void answer(value); },
      imageReady: (id, attempt) => {
        if (ended || !mounted || state.phase !== "image-loading" || state.question?.id !== id || state.imageAttempt !== attempt) return;
        deadline = Date.now() + (state.level?.time_limit_secs ?? 0) * 1000;
        update({ phase: "playing", seconds: state.level?.time_limit_secs ?? 0, remaining: 1 });
      },
      imageFailed: (id, attempt) => {
        if (!ended && mounted && state.phase === "image-loading" && state.question?.id === id && state.imageAttempt === attempt) update({ phase: "image-error" });
      },
      retry: () => {
        if (state.phase === "setup-error") void setup();
        else if (state.phase === "question-error") void loadQuestion();
        else if (state.phase === "image-error") update({ phase: "image-loading", imageAttempt: state.imageAttempt + 1 });
        else if (state.phase === "answer-error" && state.selected) void answer(state.selected, true);
      },
      finish: () => { if (game) finish("exit"); else navigate("/"); },
    };
    function pageHide() { finish("exit", false, true); }
    function pageShow(event: PageTransitionEvent) {
      if (event.persisted && ended) navigate("/result", { replace: true, state: lastGameResult(game?.userId ?? null) });
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!ended && game) { checkpointGame(game); event.preventDefault(); event.returnValue = ""; }
    }
    function popState(event: PopStateEvent) {
      if (restoringHistory) { restoringHistory = false; event.stopImmediatePropagation(); return; }
      if (ended || !game || event.state?.key === playKey) return;
      const copy = `End this quiz? Your current score (${state.score}) and elapsed time will be saved on this device${game.userId ? " and submitted for your personal best" : ""}. This quiz cannot be resumed.`;
      if (window.confirm(copy)) { finish("exit", false, true); return; }
      const targetIndex = event.state?.idx as number | undefined;
      if (originalIndex != null && targetIndex != null) {
        event.stopImmediatePropagation(); restoringHistory = true; window.history.go(originalIndex - targetIndex);
      }
    }
    const interval = window.setInterval(tick, 100);
    window.addEventListener("pagehide", pageHide); window.addEventListener("pageshow", pageShow);
    window.addEventListener("beforeunload", beforeUnload);
    const releaseNavigationGuard = guardGameNavigation(popState);
    document.addEventListener("visibilitychange", tick);
    void setup();
    return () => {
      // StrictMode's development cleanup leaves a game on the same history entry intact.
      if (window.location.pathname !== "/play" || window.history.state?.key !== playKey) finish("exit", false, true);
      mounted = false; requestId++; window.clearInterval(interval);
      window.removeEventListener("pagehide", pageHide); window.removeEventListener("pageshow", pageShow);
      window.removeEventListener("beforeunload", beforeUnload); releaseNavigationGuard();
      document.removeEventListener("visibilitychange", tick); actions.current = null;
    };
  }, [authLoading, categoryId, difficultyId, playKey, navigate]);
  return { ...view, actions };
}
