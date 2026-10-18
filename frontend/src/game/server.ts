import { getPublicUrl, supabase } from "../supabase";
import type { Question, PersonalBest, MyDailyResult } from "../api";

export interface ServerRound {
  id: string;
  number: number;
  question_id: number;
  image_url: string;
  options: string[];
  issued_at: string;
  deadline_at: string;
  outcome: "correct" | "wrong" | "timeout" | "abandoned" | null;
  selected: string | null;
}
export interface ServerGame {
  id: string;
  score: number;
  lives: number;
  status: "active" | "finished";
  category_id: number;
  difficulty_id: number;
  bank_size: number;
  started_at: string;
  server_now: string;
  time_secs: number;
  finish_reason: "out-of-lives" | "completed" | "exit" | "inactive" | null;
  round: ServerRound | null;
  previous_best: PersonalBest | null;
  personal_best: PersonalBest | null;
  record_outcome: "first" | "new" | null;
}
export async function gameplayRpc<T>(
  name: string,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = window.setTimeout(abort, 15000);
  try {
    const { data, error } = await supabase
      .rpc(name, payload)
      .abortSignal(controller.signal);
    if (error) throw error;
    return data as T;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
const timestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
export function parseServerGame(value: unknown): ServerGame {
  const g = value as ServerGame;
  if (
    !g ||
    typeof g.id !== "string" ||
    !Number.isInteger(g.score) ||
    g.score < 0 ||
    !Number.isInteger(g.lives) ||
    g.lives < 0 ||
    !["active", "finished"].includes(g.status) ||
    !Number.isInteger(g.category_id) ||
    !Number.isInteger(g.difficulty_id) ||
    !Number.isInteger(g.bank_size) ||
    !Number.isInteger(g.time_secs) ||
    g.time_secs < 0 ||
    !timestamp(g.started_at) ||
    !timestamp(g.server_now) ||
    (g.status === "finished" &&
      !["exit", "completed", "out-of-lives", "inactive"].includes(g.finish_reason ?? ""))
  )
    throw new Error("invalid-game");
  if (
    g.round &&
    (typeof g.round.id !== "string" ||
      !Number.isInteger(g.round.number) ||
      !Number.isInteger(g.round.question_id) ||
      typeof g.round.image_url !== "string" ||
      !g.round.image_url.trim() ||
      !Array.isArray(g.round.options) ||
      g.round.options.length !== 4 ||
      !g.round.options.every((o) => typeof o === "string" && !!o.trim()) ||
      new Set(g.round.options).size !== 4 ||
      !timestamp(g.round.issued_at) ||
      !timestamp(g.round.deadline_at) ||
      ![null, "correct", "wrong", "timeout", "abandoned"].includes(
        g.round.outcome,
      ))
  )
    throw new Error("invalid-round");
  return g;
}
export async function gameRequest(
  name: "quiz_start" | "quiz_next" | "quiz_answer" | "quiz_finish" | "quiz_status",
  payload: Record<string, unknown>,
) {
  return parseServerGame(await gameplayRpc(name, payload));
}
export function roundQuestion(g: ServerGame): Question | null {
  return g.round
    ? {
        id: g.round.question_id,
        image_url: getPublicUrl(g.round.image_url),
        options: g.round.options,
        category_id: g.category_id,
        difficulty_level_id: g.difficulty_id,
      }
    : null;
}
export interface DailyStatus {
  cancelled?: boolean;
  cancellation_reason?: string | null;
  date: string;
  server_now: string;
  closes_at: string;
  started_at: string | null;
  result: {
    is_correct: boolean;
    time_spent: number;
    answered_at: string;
  } | null;
  question?: {
    id: number;
    image_url: string;
    options: string[];
    category_id: number;
    difficulty_level_id: number;
  };
}
function parseDaily(value: unknown): DailyStatus {
  const d = value as DailyStatus;
  if (
    !d ||
    (d.cancelled !== undefined && typeof d.cancelled !== "boolean") ||
    (d.cancellation_reason !== undefined && d.cancellation_reason !== null && typeof d.cancellation_reason !== "string") ||
    typeof d.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
    !timestamp(d.server_now) ||
    !timestamp(d.closes_at) ||
    (d.started_at !== null && !timestamp(d.started_at)) ||
    (d.result !== null &&
      (typeof d.result?.is_correct !== "boolean" ||
        !Number.isInteger(d.result.time_spent) ||
        d.result.time_spent < 1 ||
        !timestamp(d.result.answered_at)))
  )
    throw new Error("invalid-daily-status");
  return d;
}
export async function dailyStatus(signal?: AbortSignal) {
  return parseDaily(await gameplayRpc("daily_status", {}, signal));
}
export async function dailyBegin(date: string, signal?: AbortSignal) {
  const d = parseDaily(
    await gameplayRpc("daily_begin", { p_date: date }, signal),
  );
  if (
    !d.result && !d.cancelled &&
    (!d.started_at ||
      !d.question ||
      !Number.isInteger(d.question.id) ||
      typeof d.question.image_url !== "string" ||
      !d.question.image_url.trim() ||
      !Array.isArray(d.question.options) ||
      d.question.options.length !== 4 ||
      !d.question.options.every((o) => typeof o === "string" && !!o.trim()) ||
      new Set(d.question.options).size !== 4 ||
      !Number.isInteger(d.question.category_id) ||
      !Number.isInteger(d.question.difficulty_level_id))
  )
    throw new Error("invalid-daily-question");
  return d;
}
export function dailyReceipt(status: DailyStatus): MyDailyResult | null {
  return !status.cancelled && status.result ? { is_answered: true, ...status.result } : null;
}
