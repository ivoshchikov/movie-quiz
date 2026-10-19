import { isLevel } from "./api";
import type { AttackGame, AttackLevel } from "./api";
export interface PendingAction { round: string; action: "answer" | "skip"; answer: string | null; }
export interface AttackRun {
  id: string; owner: string | null; category: number; level: AttackLevel; confirmed: boolean; pending?: PendingAction;
}
const key = (owner: string | null) => `hq:time-attack:run:${owner ?? "guest"}`;
const memory = new Map<string, AttackRun>();
export function readAttackRun(owner: string | null): AttackRun | null {
  try {
    const r: AttackRun = JSON.parse(localStorage.getItem(key(owner)) || "null");
    if (r && typeof r.id === "string" && /^[0-9a-f-]{36}$/i.test(r.id) && r.owner === owner && [1, 2].includes(r.category) && isLevel(r.level) && typeof r.confirmed === "boolean" &&
      (!r.pending || typeof r.pending.round === "string" && ["answer", "skip"].includes(r.pending.action) && (r.pending.answer === null || typeof r.pending.answer === "string"))) return r;
  } catch { /* Memory-only play remains available. */ }
  return memory.get(key(owner)) ?? null;
}
export function writeAttackRun(run: AttackRun) {
  memory.set(key(run.owner), run);
  try { localStorage.setItem(key(run.owner), JSON.stringify(run)); } catch { /* The server still owns the clock and record. */ }
}
export function runFromGame(g: AttackGame): AttackRun {
  return { id: g.id, owner: g.owner, category: g.category_id, level: g.level, confirmed: true };
}
export const attackStorageKey = key;
