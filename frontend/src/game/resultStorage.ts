import type { Session } from "@supabase/supabase-js";
import { getPersonalBest } from "../api";
import type { PersonalBest } from "../api";

export type FinishReason = "out-of-lives" | "completed" | "exit";
export type SaveStatus = "saved" | "pending" | "device" | "memory";
export type RecordOutcome = "first" | "new";
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
  categoryName?: string;
  difficultyName?: string;
  finishedAt?: number;
  deviceStored?: boolean;
  previousBest?: PersonalBest | null;
  personalBest?: PersonalBest | null;
  recordOutcome?: RecordOutcome;
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
const recentResults = new Set<string>();
type StorageKind = "local" | "session";

function storage(kind: StorageKind) { return kind === "local" ? window.localStorage : window.sessionStorage; }
function read<T>(kind: StorageKind, key: string): T | null {
  try { return JSON.parse(storage(kind).getItem(key) || "null") as T | null; } catch { return null; }
}
function write(kind: StorageKind, key: string, value: unknown): boolean {
  try { storage(kind).setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function remove(kind: StorageKind, key: string) {
  try { storage(kind).removeItem(key); } catch { /* Gameplay remains available when storage is blocked. */ }
}
export function isGameResult(value: unknown): value is GameResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<GameResult>;
  return typeof result.id === "string" && typeof result.playKey === "string" &&
    (result.userId === null || typeof result.userId === "string") && Number.isInteger(result.categoryId) &&
    Number.isInteger(result.difficultyId) && Number.isInteger(result.score) && (result.score ?? -1) >= 0 &&
    Number.isInteger(result.elapsedSecs) && (result.elapsedSecs ?? -1) >= 0 &&
    ["out-of-lives", "completed", "exit"].includes(result.finishReason ?? "") &&
    ["saved", "pending", "device", "memory"].includes(result.saveStatus ?? "") &&
    (result.categoryName === undefined || typeof result.categoryName === "string") &&
    (result.difficultyName === undefined || typeof result.difficultyName === "string") &&
    (result.finishedAt === undefined || (Number.isFinite(result.finishedAt) && result.finishedAt > 0)) &&
    (result.previousBest === undefined || result.previousBest === null || validBest(result.previousBest)) &&
    (result.personalBest === undefined || result.personalBest === null || validBest(result.personalBest)) &&
    (result.recordOutcome === undefined || result.recordOutcome === "first" || result.recordOutcome === "new");
}
function validBest(value: PersonalBest) {
  return !!value && Number.isInteger(value.score) && value.score >= 0 && Number.isFinite(value.time) && value.time >= 0;
}
export function lastGameResult(userId: string | null): GameResult | null {
  const result = read<unknown>("local", LAST_PREFIX + (userId ?? "guest"));
  return isGameResult(result) && result.userId === userId ? { ...result, deviceStored: true } : null;
}
export function isSavingGameResult(id: string) { return sending.has(id); }
export function isRecentGameResult(id: string) { return recentResults.has(id); }
export function dismissRecentGameResult(id: string) { recentResults.delete(id); }
export function checkpointGame(game: ActiveGame) {
  write("session", ACTIVE_KEY, { ...game, elapsedSecs: Math.max(0, Math.floor((Date.now() - game.startedAt) / 1000)) });
}
function notifyResult(result: GameResult) {
  window.dispatchEvent(new CustomEvent(RESULT_UPDATED, { detail: { ...result } }));
}
export function retainGameResult(result: GameResult, recent = true): GameResult {
  let retained: GameResult = { ...result, deviceStored: true };
  if (!write("local", LAST_PREFIX + (result.userId ?? "guest"), retained)) {
    retained = { ...result, deviceStored: false, saveStatus: result.userId ? result.saveStatus : "memory" };
  }
  if (retained.userId && retained.saveStatus === "pending") write("local", PENDING_PREFIX + retained.id, retained);
  const active = read<ActiveGame>("session", ACTIVE_KEY);
  if (active?.id === result.id) remove("session", ACTIVE_KEY);
  if (recent) recentResults.add(result.id);
  notifyResult(retained);
  return retained;
}
function updateResult(result: GameResult) {
  if (lastGameResult(result.userId)?.id === result.id) write("local", LAST_PREFIX + (result.userId ?? "guest"), result);
  if (result.userId && result.saveStatus === "pending") write("local", PENDING_PREFIX + result.id, result);
  notifyResult(result);
}
/** Recover only this tab's interrupted document, never a running game in another tab. */
export function recoverInterruptedGame() {
  const active = read<ActiveGame>("session", ACTIVE_KEY);
  if (!active) return;
  const result = { ...active, finishReason: "exit" as const, saveStatus: active.userId ? "pending" as const : "device" as const,
    finishedAt: active.finishedAt ?? active.startedAt + active.elapsedSecs * 1000 };
  if (isGameResult(result)) retainGameResult(result, false);
}

async function readPersonalBest(result: GameResult): Promise<PersonalBest | null | undefined> {
  if (!result.userId) return undefined;
  const abort = new AbortController();
  const timeout = window.setTimeout(() => abort.abort(), 3000);
  try { return await getPersonalBest(result.userId, result.categoryId, result.difficultyId, abort.signal); }
  catch { return undefined; }
  finally { window.clearTimeout(timeout); }
}
function recordOutcome(result: GameResult, best: PersonalBest | null): RecordOutcome | undefined {
  if (!best || best.score !== result.score || result.previousBest === undefined) return undefined;
  if (result.previousBest === null) return "first";
  if (best.score > result.previousBest.score) return "new";
  // A tie is celebrated only if the server actually changed the best time to this run's time.
  if (best.score === result.previousBest.score && best.time === result.elapsedSecs && best.time !== result.previousBest.time) return "new";
  return undefined;
}

/** The immutable final score/time are retried; an unfinished game is never resumed. */
export function saveGameResult(result: GameResult, session: Session | null, keepalive = false): Promise<SaveStatus> {
  if (!result.userId) return Promise.resolve(result.saveStatus === "memory" ? "memory" : "device");
  if (result.userId !== session?.user.id) return Promise.resolve("pending");
  const existing = sending.get(result.id);
  if (existing) return existing;
  let current = { ...result };
  const request = (async (): Promise<SaveStatus> => {
    const abort = new AbortController();
    let timeout: number | undefined;
    try {
      // Keep pagehide's keepalive request immediate. Missing comparison data never invents an award.
      if (!keepalive && current.previousBest === undefined) {
        const previousBest = await readPersonalBest(current);
        if (previousBest !== undefined) { current = { ...current, previousBest }; updateResult(current); }
      }
      timeout = window.setTimeout(() => abort.abort(), 6000);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/upsert_user_best`, {
        method: "POST", keepalive, signal: abort.signal,
        headers: {
          "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ p_user_id: result.userId, p_category_id: result.categoryId,
          p_difficulty_id: result.difficultyId, p_score: result.score, p_time: result.elapsedSecs }),
      });
      window.clearTimeout(timeout);
      if (!response.ok) return "pending";
      remove("local", PENDING_PREFIX + result.id);
      current = { ...current, saveStatus: "saved" };
      updateResult(current);
      if (!keepalive) {
        const personalBest = await readPersonalBest(current);
        if (personalBest !== undefined) {
          current = { ...current, personalBest, recordOutcome: recordOutcome(current, personalBest) };
          updateResult(current);
        }
      }
      return "saved";
    } catch { return "pending"; }
    finally { window.clearTimeout(timeout); sending.delete(result.id); updateResult(current); }
  })();
  sending.set(result.id, request);
  notifyResult(current);
  return request;
}
export async function flushPendingGameResults(session: Session | null) {
  if (!session) return;
  let keys: string[];
  try { keys = Object.keys(storage("local")).filter(key => key.startsWith(PENDING_PREFIX)); } catch { return; }
  for (const key of keys) {
    const result = read<unknown>("local", key);
    if (isGameResult(result) && result.userId === session.user.id) await saveGameResult(result, session);
  }
}
