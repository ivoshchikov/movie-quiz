import { gameplayRpc } from "../game/server";
import type { DailyStreakRow, LeaderboardRow } from "../api";

export type RankedRow<T> = T & { rank: number; user_id: string };
export interface Ranking<T> {
  total: number;
  top: RankedRow<T>[];
  me: RankedRow<T> | null;
}
function parseRanking<T>(
  value: unknown,
  limit: number,
  valid: (row: T) => boolean,
): Ranking<T> {
  const r = value as Ranking<T>;
  const row = (v: RankedRow<T>) =>
    !!v &&
    typeof v.user_id === "string" &&
    Number.isInteger(v.rank) &&
    v.rank > 0 &&
    v.rank <= r.total &&
    valid(v);
  if (
    !r ||
    !Number.isInteger(r.total) ||
    r.total < 0 ||
    !Array.isArray(r.top) ||
    r.top.length > Math.min(100, limit) ||
    !r.top.every((v, i) => row(v) && v.rank === i + 1) ||
    (r.me !== null && !row(r.me))
  )
    throw new Error("invalid-ranking");
  return r;
}
export async function quizRanking(
  categoryId: number,
  difficultyId: number,
  limit: number,
  signal?: AbortSignal,
) {
  const value = await gameplayRpc(
    "quiz_leaderboard",
    {
      p_category_id: categoryId,
      p_difficulty_id: difficultyId,
      p_limit: limit,
    },
    signal,
  );
  return parseRanking<LeaderboardRow>(
    value,
    limit,
    (r) =>
      (r.nickname === null || typeof r.nickname === "string") &&
      Number.isInteger(r.best_score) &&
      r.best_score >= 0 &&
      Number.isFinite(r.best_time) &&
      r.best_time >= 0,
  );
}
export async function dailyRanking(
  activeOnly: boolean,
  limit: number,
  signal?: AbortSignal,
) {
  const value = await gameplayRpc(
    "daily_leaderboard",
    { p_active_only: activeOnly, p_limit: limit },
    signal,
  );
  return parseRanking<DailyStreakRow>(
    value,
    limit,
    (r) =>
      (r.nickname === null || typeof r.nickname === "string") &&
      Number.isInteger(r.streak) &&
      r.streak > 0 &&
      typeof r.start_d === "string" &&
      typeof r.end_d === "string",
  );
}
