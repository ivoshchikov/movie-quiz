import { choices, uuid } from "./api";
import type { Board, Choice, Comparison } from "./api";
export type Pending = { kind: "choose"; round: string; choice: Choice } | { kind: "next"; round: string; more: boolean };
export interface Run { id: string; owner: string | null; board: Board; confirmed: boolean; pending?: Pending; }
const memory = new Map<string, Run>();
export const runKey = (owner: string | null) => `hq:this-that:run:${owner ?? "guest"}`;
export const ACTIVITY = "hq:this-that:activity";
export function readRun(owner: string | null): Run | null {
  try {
    const r: Run = JSON.parse(localStorage.getItem(runKey(owner)) || "null");
    if (r && uuid(r.id) && r.owner === owner && ["actors", "actresses"].includes(r.board) && typeof r.confirmed === "boolean" && (!r.pending || uuid(r.pending.round) && (r.pending.kind === "choose" && choices.includes(r.pending.choice) || r.pending.kind === "next" && typeof r.pending.more === "boolean"))) return r;
  } catch { /* Keep a usable in-memory descriptor when storage is unavailable. */ }
  return memory.get(runKey(owner)) ?? null;
}
export function writeRun(r: Run) { memory.set(runKey(r.owner), r); try { localStorage.setItem(runKey(r.owner), JSON.stringify(r)); } catch { /* Server choices remain saved. */ } }
export const fromComparison = (g: Comparison): Run => ({ id: g.id, owner: g.owner, board: g.board, confirmed: true });
export function signalActivity() { try { localStorage.setItem(ACTIVITY, crypto.randomUUID()); } catch { /* Visibility checks still reconcile. */ } }
export interface Preference { a: number; b: number; winner: number; }
const PREFS = "hq:this-that:guest-preferences";
let cached: Preference[] = [];
export function guestPreferences(): Preference[] {
  try { const p: Preference[] = JSON.parse(localStorage.getItem(PREFS) || "[]"); if (Array.isArray(p) && p.length <= 20000 && p.every(x => Number.isSafeInteger(x.a) && Number.isSafeInteger(x.b) && x.a < x.b && [x.a, x.b].includes(x.winner))) return p; } catch { /* Memory fallback. */ } return cached;
}
function savePreferences(p: Preference[]) { cached = p; try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch { /* Guest preferences are device-local. */ } }
export function rememberGuest(g: Comparison) {
  const r = g.round; if (g.owner !== null || !r || (!r.winner && r.outcome !== "equal")) return;
  const [a, b] = r.cards.map(p => p.id).sort((x, y) => x - y), p = guestPreferences();
  savePreferences([...p.filter(x => x.a !== a || x.b !== b), ...(r.winner ? [{ a, b, winner: r.winner }] : [])].slice(-20000));
}
export function removeImported(items: Preference[]) { const keys = new Set(items.map(p => `${p.a}:${p.b}:${p.winner}`)); savePreferences(guestPreferences().filter(p => !keys.has(`${p.a}:${p.b}:${p.winner}`))); }
const importKey = (owner: string) => `hq:this-that:import:${owner}`;
export function importBatch(owner: string): { operation: string; items: Preference[] } | null {
  try { const job = JSON.parse(localStorage.getItem(importKey(owner)) || "null"); if (job && uuid(job.operation) && Array.isArray(job.items) && job.items.length > 0 && job.items.length <= 500) return job; } catch { /* A repeated private preference cannot affect public votes. */ }
  const items = guestPreferences().slice(0, 500); if (!items.length) return null;
  const job = { operation: crypto.randomUUID(), items }; try { localStorage.setItem(importKey(owner), JSON.stringify(job)); } catch { /* Import remains private and pair-unique. */ } return job;
}
export function finishImport(owner: string, items: Preference[]) { removeImported(items); try { localStorage.removeItem(importKey(owner)); } catch { /* Retrying the same operation is safe. */ } }
