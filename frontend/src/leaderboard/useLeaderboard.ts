import { useCallback, useEffect, useState } from "react";
import { countQuestions, getLeaderboard, getPersonalBest } from "../api";
import { useAuth } from "../AuthContext";
import { isGameResult, RESULT_UPDATED } from "../game/resultStorage";

export const LEADERBOARD_TIMEOUT = 10000;
type Query<T> = { key: string; phase: "ready"; value: T } | { key: string; phase: "error" };

function useRead<T>(key: string, load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [query, setQuery] = useState<Query<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), LEADERBOARD_TIMEOUT);
    setQuery(null);
    load(controller.signal).then(value => { if (active) setQuery(controller.signal.aborted ? { key, phase: "error" } : { key, phase: "ready", value }); })
      .catch(() => { if (active) setQuery({ key, phase: "error" }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [key, load, enabled, attempt]);
  return { query: enabled && query?.key === key ? query : null, retry };
}

export function useLeaderboard(categoryId: number, difficultyId: number, limit: number) {
  const { user, loading: authLoading } = useAuth();
  const key = `${categoryId}:${difficultyId}`;
  const owner = user?.id ?? null;
  // One extra row determines whether there is a larger list without guessing a total.
  const loadScores = useCallback((signal: AbortSignal) => getLeaderboard(categoryId, difficultyId, limit + 1, signal), [categoryId, difficultyId, limit]);
  const loadCount = useCallback((signal: AbortSignal) => countQuestions(categoryId, difficultyId, signal), [categoryId, difficultyId]);
  const loadBest = useCallback((signal: AbortSignal) => getPersonalBest(owner ?? "", categoryId, difficultyId, signal), [owner, categoryId, difficultyId]);
  const scores = useRead(`${key}:${limit}`, loadScores);
  const availability = useRead(key, loadCount);
  const personal = useRead(`${key}:${owner}`, loadBest, !authLoading && owner != null);
  const retryScores = scores.retry, retryPersonal = personal.retry;

  useEffect(() => {
    const updated = (event: Event) => {
      const result: unknown = (event as CustomEvent<unknown>).detail;
      if (isGameResult(result) && result.saveStatus === "saved" && result.categoryId === categoryId && result.difficultyId === difficultyId) {
        retryScores();
        if (result.userId === owner) retryPersonal();
      }
    };
    window.addEventListener(RESULT_UPDATED, updated);
    return () => window.removeEventListener(RESULT_UPDATED, updated);
  }, [categoryId, difficultyId, owner, retryScores, retryPersonal]);

  return { key, user, authLoading, scores, availability, personal };
}

export function formatQuizDuration(seconds: number) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
