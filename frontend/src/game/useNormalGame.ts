import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getDifficultyLevels } from "../api";
import type { Category, DifficultyLevel, Question } from "../api";
import { useAuth } from "../AuthContext";
import { gaEvent } from "../analytics/ga";
import { gameRequest, roundQuestion } from "./server";
import type { ServerGame } from "./server";
import { checkpointGame, confirmedGameResult, lastGameResult, recoverInterruptedGame, retainGameResult, saveGameResult } from "./resultStorage";
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
const playIds = new Map<string, string>();
function sessionId(key: string) {
  let id = playIds.get(key);
  try { id ??= sessionStorage.getItem(`hq:quiz:session:${key}`) ?? undefined; } catch { /* Memory fallback. */ }
  id ??= crypto.randomUUID(); playIds.set(key, id);
  try { sessionStorage.setItem(`hq:quiz:session:${key}`, id); } catch { /* Memory fallback. */ }
  return id;
}

export function useNormalGame(categoryId: number | undefined, difficultyId: number | undefined, playKey: string) {
  const { loading: authLoading, session } = useAuth();
  const ownerId = session?.user.id ?? null;
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
    let mounted = true, ended = false, state = { ...initial }, busy = false, restoring = false;
    let game: ActiveGame | null = null, server: ServerGame | null = null;
    let serverAt = 0, receivedAt = 0, feedbackAt = 0;
    let answerInFlight: Promise<void> = Promise.resolve();
    let pendingAnswer: string | null = null;
    const id = sessionId(`${playKey}:${ownerId ?? "guest"}`);
    const originalIndex = window.history.state?.idx as number | undefined;
    const now = () => serverAt + Math.max(0, performance.now() - receivedAt);
    function update(patch: Partial<GameView>) { state = { ...state, ...patch }; if (mounted) setView(state); }
    function sync(value: ServerGame) {
      if (value.id !== id || value.category_id !== catId || value.difficulty_id !== diffId) throw new Error("unexpected-game");
      server = value; serverAt = Date.parse(value.server_now); receivedAt = performance.now();
      update({ score: value.score, lives: value.lives, elapsed: value.time_secs });
      if (game) { game.score = value.score; game.elapsedSecs = value.time_secs; checkpointGame(game); }
    }
    function baseResult(reason: FinishReason): GameResult {
      return { id, serverGame: true, playKey, userId: game!.userId, categoryId: catId, difficultyId: diffId,
        categoryName: game!.categoryName, difficultyName: game!.difficultyName, score: state.score,
        elapsedSecs: state.elapsed, finishReason: reason, finishedAt: Date.now(), saveStatus: game!.userId ? "pending" : "device" };
    }
    function finish(reason: FinishReason, show = true, keepalive = false) {
      if (ended || !game) return;
      if (server?.bank_size === 0) { ended = true; if (show) navigate("/"); return; }
      ended = true;
      const result = retainGameResult(server?.status === "finished" ? confirmedGameResult(baseResult(reason), server) : baseResult(reason));
      if (server?.status !== "finished") void saveGameResult(result, sessionRef.current, keepalive, keepalive ? Promise.resolve() : answerInFlight);
      gaEvent("quiz_end", { category_id: catId, difficulty_id: diffId, score: result.score, elapsed_secs: result.elapsedSecs, finish_reason: result.finishReason });
      update({ phase: "finished" });
      if (show && mounted) navigate("/result", { replace: true, state: result });
    }
    function feedback(value: ServerGame) {
      const outcome = value.round?.outcome;
      if (!outcome || outcome === "abandoned") return;
      update({ phase: "feedback", feedback: outcome, selected: value.round?.selected ?? null,
        ...(outcome === "timeout" ? { seconds: 0, remaining: 0 } : {}) });
      feedbackAt = performance.now() + (outcome === "correct" ? 900 : 1800);
    }
    async function loadQuestion() {
      if (busy || ended || !mounted) return;
      busy = true; update({ phase: "loading", selected: null, feedback: null });
      try {
        const value = await gameRequest("quiz_next", { p_session: id });
        if (!mounted || ended) return;
        sync(value);
        if (value.status === "finished") { finish(value.finish_reason!); return; }
        const question = roundQuestion(value);
        if (!question) throw new Error("missing-question");
        update({ phase: "image-loading", question, options: question.options, number: value.round!.number, imageAttempt: 0 });
        if (value.round?.outcome) feedback(value);
      } catch { if (mounted && !ended) update({ phase: "question-error" }); }
      finally { busy = false; }
    }
    async function setup() {
      if (busy || ended || !mounted) return;
      busy = true; update({ phase: "setup" });
      try {
        const [categories, levels] = await Promise.all([getCategories(), getDifficultyLevels()]);
        if (!mounted || ended) return;
        const category = categories.find(c => c.id === catId), level = levels.find(l => l.id === diffId);
        if (!category || !level) throw new Error("invalid-settings");
        update({ category, level, seconds: level.time_limit_secs, lives: level.lives });
        const value = await gameRequest("quiz_start", { p_session: id, p_category_id: catId, p_difficulty_id: diffId });
        if (!mounted || ended) return;
        game = { id, serverGame: true, playKey, userId: ownerId, categoryId: catId, difficultyId: diffId,
          categoryName: category.name, difficultyName: level.name, score: value.score, elapsedSecs: value.time_secs, startedAt: Date.parse(value.started_at) };
        sync(value); checkpointGame(game);
        if (value.bank_size === 0) { update({ phase: "empty" }); return; }
        if (value.status === "finished") { finish(value.finish_reason!); return; }
        gaEvent("quiz_start", { category_id: catId, difficulty_id: diffId });
        busy = false; void loadQuestion();
      } catch { if (mounted && !ended) update({ phase: "setup-error" }); }
      finally { busy = false; }
    }
    async function answer(selected: string | null, retry = false) {
      if (ended || !mounted || !server?.round || (retry ? state.phase !== "answer-error" : !["playing", "image-loading", "image-error"].includes(state.phase))) return;
      if (selected !== null && !state.options.includes(selected)) return;
      pendingAnswer = selected;
      update({ phase: "checking", selected });
      try {
        const value = await gameRequest("quiz_answer", { p_session: id, p_round: server.round.id, p_answer: selected });
        if (!mounted || ended) return;
        sync(value);
        if (value.round?.outcome) feedback(value); else update({ phase: "playing" });
        gaEvent("quiz_answer", { question_id: value.round?.question_id, correct: value.round?.outcome === "correct" });
      } catch { if (mounted && !ended) update({ phase: "answer-error" }); }
    }
    function sendAnswer(selected: string | null, retry = false) { answerInFlight = answer(selected, retry); }
    function tick() {
      if (!mounted || ended || !game || !server) return;
      if (server.status !== "finished") update({ elapsed: Math.max(0, Math.floor((now() - Date.parse(server.started_at)) / 1000)) });
      if (["playing", "image-loading", "image-error"].includes(state.phase) && server.round) {
        const ms = Math.max(0, Date.parse(server.round.deadline_at) - now());
        update({ seconds: Math.ceil(ms / 1000), remaining: ms / ((state.level?.time_limit_secs ?? 1) * 1000) });
        if (ms === 0) sendAnswer(null);
      } else if (state.phase === "feedback" && performance.now() >= feedbackAt) {
        if (server.status === "finished") finish(server.finish_reason!); else void loadQuestion();
      }
    }
    actions.current = {
      answer: value => { if (state.phase === "playing") sendAnswer(value); },
      imageReady: (qid, attempt) => {
        if (mounted && !ended && state.phase === "image-loading" && state.question?.id === qid && state.imageAttempt === attempt) { update({ phase: "playing" }); tick(); }
      },
      imageFailed: (qid, attempt) => {
        if (mounted && !ended && state.phase === "image-loading" && state.question?.id === qid && state.imageAttempt === attempt) update({ phase: "image-error" });
      },
      retry: () => {
        if (state.phase === "setup-error") void setup();
        else if (state.phase === "question-error") void loadQuestion();
        else if (state.phase === "image-error") update({ phase: "image-loading", imageAttempt: state.imageAttempt + 1 });
        else if (state.phase === "answer-error") sendAnswer(pendingAnswer, true);
      },
      finish: () => { if (game) finish("exit"); else navigate("/"); },
    };
    function pageHide() { finish("exit", false, true); }
    function pageShow(event: PageTransitionEvent) { if (event.persisted && ended) navigate("/result", { replace: true, state: lastGameResult(game?.userId ?? null) }); }
    function beforeUnload(event: BeforeUnloadEvent) { if (!ended && game) { checkpointGame(game); event.preventDefault(); event.returnValue = ""; } }
    function popState(event: PopStateEvent) {
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (ended || !game || event.state?.key === playKey) return;
      if (window.confirm("End this quiz? Your accepted answers and elapsed time will be saved. This quiz cannot be resumed.")) { finish("exit", false, true); return; }
      const target = event.state?.idx as number | undefined;
      if (originalIndex != null && target != null) { event.stopImmediatePropagation(); restoring = true; window.history.go(originalIndex - target); }
    }
    const interval = window.setInterval(tick, 100);
    window.addEventListener("pagehide", pageHide); window.addEventListener("pageshow", pageShow); window.addEventListener("beforeunload", beforeUnload);
    const release = guardGameNavigation(popState);
    document.addEventListener("visibilitychange", tick);
    void setup();
    return () => {
      if (window.location.pathname !== "/play" || window.history.state?.key !== playKey) finish("exit", false, true);
      mounted = false; window.clearInterval(interval); actions.current = null;
      window.removeEventListener("pagehide", pageHide); window.removeEventListener("pageshow", pageShow); window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", tick); release();
    };
  }, [authLoading, categoryId, difficultyId, playKey, navigate, ownerId]);
  return { ...view, actions };
}
