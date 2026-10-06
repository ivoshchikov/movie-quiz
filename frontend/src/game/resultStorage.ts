import type { Session } from "@supabase/supabase-js";

export type FinishReason = "out-of-lives" | "completed" | "exit";
export type SaveStatus = "saved" | "pending" | "device";
export interface GameResult {
  id: string;
  playKey: string;
  userId: string | null;
  categoryId: number;
  difficultyId: number;
  score: number;
  elapsedSecs: number;
  finishReason: FinishReason;
  saveStatus: SaveStatus;
}
export interface ActiveGame extends Omit<GameResult, "elapsedSecs" | "finishReason" | "saveStatus"> {
  startedAt: number;
  elapsedSecs: number;
}

const ACTIVE_KEY = "hq:quiz:active";
const PENDING_PREFIX = "hq:quiz:pending:";
const LAST_PREFIX = "hq:quiz:last:";
export const RESULT_UPDATED = "hq:quiz:result-updated";
const sending = new Map<string, Promise<SaveStatus>>();

function read<T>(storage: Storage, key: string): T | null {
  try { return JSON.parse(storage.getItem(key) || "null") as T | null; } catch { return null; }
}
function write(storage: Storage, key: string, value: unknown) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable in private browsing. */ }
}
function remove(storage: Storage, key: string) {
  try { storage.removeItem(key); } catch { /* Keep gameplay available if storage is blocked. */ }
}
function validResult(value: GameResult | null): value is GameResult {
  return !!value && typeof value.id === "string" && typeof value.playKey === "string" &&
    (value.userId === null || typeof value.userId === "string") && Number.isInteger(value.categoryId) &&
    Number.isInteger(value.difficultyId) && Number.isInteger(value.score) && value.score >= 0 &&
    Number.isInteger(value.elapsedSecs) && value.elapsedSecs >= 0;
}
export function lastGameResult(userId: string | null): GameResult | null {
  const result = read<GameResult>(localStorage, LAST_PREFIX + (userId ?? "guest"));
  return validResult(result) ? result : null;
}
export function checkpointGame(game: ActiveGame) {
  write(sessionStorage, ACTIVE_KEY, { ...game, elapsedSecs: Math.max(0, Math.floor((Date.now() - game.startedAt) / 1000)) });
}
export function retainGameResult(result: GameResult) {
  write(localStorage, LAST_PREFIX + (result.userId ?? "guest"), result);
  if (result.userId && result.saveStatus === "pending") write(localStorage, PENDING_PREFIX + result.id, result);
  const active = read<ActiveGame>(sessionStorage, ACTIVE_KEY);
  if (active?.id === result.id) remove(sessionStorage, ACTIVE_KEY);
  window.dispatchEvent(new CustomEvent(RESULT_UPDATED, { detail: result }));
}
/** Recover only this tab's interrupted document, never a running game in another tab. */
export function recoverInterruptedGame() {
  const active = read<ActiveGame>(sessionStorage, ACTIVE_KEY);
  if (!active || !validResult({ ...active, finishReason: "exit", saveStatus: "pending" })) return;
  retainGameResult({ ...active, finishReason: "exit", saveStatus: active.userId ? "pending" : "device" });
}

/** The immutable final score/time are retried; an unfinished game is never resumed. */
export function saveGameResult(result: GameResult, session: Session | null, keepalive = false): Promise<SaveStatus> {
  if (!result.userId) return Promise.resolve("device");
  if (result.userId !== session?.user.id) return Promise.resolve("pending");
  const existing = sending.get(result.id);
  if (existing) return existing;
  const request = (async (): Promise<SaveStatus> => {
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 6000);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/upsert_user_best`, {
        method: "POST", keepalive, signal: abort.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ p_user_id: result.userId, p_category_id: result.categoryId,
          p_difficulty_id: result.difficultyId, p_score: result.score, p_time: result.elapsedSecs }),
      });
      if (!response.ok) return "pending";
      remove(localStorage, PENDING_PREFIX + result.id);
      const last = lastGameResult(result.userId);
      const saved = { ...result, saveStatus: "saved" as const };
      if (last?.id === result.id) write(localStorage, LAST_PREFIX + result.userId, saved);
      window.dispatchEvent(new CustomEvent(RESULT_UPDATED, { detail: saved }));
      return "saved";
    } catch { return "pending"; }
    finally { window.clearTimeout(timeout); sending.delete(result.id); }
  })();
  sending.set(result.id, request);
  return request;
}
export async function flushPendingGameResults(session: Session | null) {
  if (!session) return;
  let keys: string[];
  try { keys = Object.keys(localStorage).filter(key => key.startsWith(PENDING_PREFIX)); } catch { return; }
  for (const key of keys) {
    const result = read<GameResult>(localStorage, key);
    if (validResult(result) && result.userId === session.user.id) await saveGameResult(result, session);
  }
}
