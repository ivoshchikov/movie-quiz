import { choices, uuid } from "./api";
import type { Board, Choice, Comparison } from "./api";
export type Pending = { kind: "choose"; round: string; choice: Choice } | { kind: "next"; round: string; more: boolean };
export interface Run { id: string; owner: string | null; board: Board; confirmed: boolean; pending?: Pending; }
const memory = new Map<string, Run>();
// Actors retain their original keys, including in-flight imports from old clients.
const scopedKey = (legacy: string, board: Board) => board === "actors" ? legacy : `${legacy}:${board}`;
export const runKey = (owner: string | null, board: Board = "actors") => scopedKey(`hq:this-that:run:${owner ?? "guest"}`, board);
export const ACTIVITY = "hq:this-that:activity";
export const activityKey = (board: Board) => scopedKey(ACTIVITY, board);
export function readRun(owner: string | null, board: Board = "actors"): Run | null {
  try {
    const r: Run = JSON.parse(localStorage.getItem(runKey(owner, board)) || "null");
    if (r && uuid(r.id) && r.owner === owner && r.board === board && typeof r.confirmed === "boolean" && (!r.pending || uuid(r.pending.round) && (r.pending.kind === "choose" && choices.includes(r.pending.choice) || r.pending.kind === "next" && typeof r.pending.more === "boolean"))) return r;
  } catch { /* Keep a usable in-memory descriptor when storage is unavailable. */ }
  return memory.get(runKey(owner, board)) ?? null;
}
export function writeRun(r: Run) { memory.set(runKey(r.owner, r.board), r); try { localStorage.setItem(runKey(r.owner, r.board), JSON.stringify(r)); } catch { /* Server choices remain saved. */ } }
export const fromComparison = (g: Comparison): Run => ({ id: g.id, owner: g.owner, board: g.board, confirmed: true });
export function signalActivity(board: Board = "actors") { try { localStorage.setItem(activityKey(board), crypto.randomUUID()); } catch { /* Visibility checks still reconcile. */ } }
export interface Preference { a: number; b: number; winner: number; }
const preferencesKey = (board: Board) => scopedKey("hq:this-that:guest-preferences", board);
const cached = new Map<Board, Preference[]>();
export function guestPreferences(board: Board = "actors"): Preference[] {
  try { const p: Preference[] = JSON.parse(localStorage.getItem(preferencesKey(board)) || "[]"); if (Array.isArray(p) && p.length <= 20000 && p.every(x => Number.isSafeInteger(x.a) && Number.isSafeInteger(x.b) && x.a < x.b && [x.a, x.b].includes(x.winner))) return p; } catch { /* Memory fallback. */ } return cached.get(board) ?? [];
}
function savePreferences(board: Board, p: Preference[]) { cached.set(board, p); try { localStorage.setItem(preferencesKey(board), JSON.stringify(p)); } catch { /* Guest preferences are device-local. */ } }
export function rememberGuest(g: Comparison) {
  const r = g.round; if (g.owner !== null || !r || (!r.winner && r.outcome !== "equal")) return;
  const [a, b] = r.cards.map(p => p.id).sort((x, y) => x - y), p = guestPreferences(g.board);
  savePreferences(g.board, [...p.filter(x => x.a !== a || x.b !== b), ...(r.winner ? [{ a, b, winner: r.winner }] : [])].slice(-20000));
}
export function removeImported(items: Preference[], board: Board = "actors") { const keys = new Set(items.map(p => `${p.a}:${p.b}:${p.winner}`)); savePreferences(board, guestPreferences(board).filter(p => !keys.has(`${p.a}:${p.b}:${p.winner}`))); }
const importKey = (owner: string, board: Board) => scopedKey(`hq:this-that:import:${owner}`, board);
type ImportJob = { operation: string; items: Preference[] };
const jobs = new Map<string, ImportJob>();
export function importBatch(owner: string, board: Board = "actors"): ImportJob | null {
  const key = importKey(owner, board);
  try { const job = JSON.parse(localStorage.getItem(key) || "null"); if (job && uuid(job.operation) && Array.isArray(job.items) && job.items.length > 0 && job.items.length <= 500) return job; } catch { /* Keep the immutable operation in memory when storage is unavailable. */ }
  if (jobs.has(key)) return jobs.get(key)!;
  const items = guestPreferences(board).slice(0, 500); if (!items.length) return null;
  const job = { operation: crypto.randomUUID(), items }; jobs.set(key, job); try { localStorage.setItem(key, JSON.stringify(job)); } catch { /* Import remains private and pair-unique. */ } return job;
}
export function finishImport(owner: string, items: Preference[], board: Board = "actors") { removeImported(items, board); jobs.delete(importKey(owner, board)); try { localStorage.removeItem(importKey(owner, board)); } catch { /* Retrying the same operation is safe. */ } }
