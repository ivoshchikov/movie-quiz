import { gameplayRpc } from "../game/server";
export type Board = "actors" | "actresses";
export const choices = ["left", "right", "equal", "unknown_left", "unknown_right", "unknown_both", "skip"] as const;
export type Choice = typeof choices[number];
export interface Person { id: number; name: string; image_url: string; revision?: number; }
export interface Comparison {
  id: string; owner: string | null; board: Board; version: number; series: number; cycle: number;
  server_now: string; complete: boolean; summary: { choices: number; settled: number };
  round: { id: string; number: number; cards: [Person, Person]; outcome: Choice | "withdrawn" | null; winner: number | null;
    public_status: string | null; next_at: string | null; settled_at: string | null; community: { left: number; right: number; total: number } | null } | null;
}
export interface TopPerson extends Person { rank: number; provisional: boolean; }
export interface Ranking { updated_at: string | null; total: number; candidates: number; rows: (Person & { rank: number | null; provisional: boolean })[]; }
export const uuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isPerson = (p: Person) => p && Number.isSafeInteger(p.id) && p.id > 0 && typeof p.name === "string" && !!p.name.trim() && typeof p.image_url === "string" && !!p.image_url.trim();
export function parseComparison(value: unknown): Comparison {
  const g = value as Comparison;
  if (!g || !uuid(g.id) || !(g.owner === null || uuid(g.owner)) || !["actors", "actresses"].includes(g.board) || !Number.isSafeInteger(g.version) || g.version < 0 || !Number.isInteger(g.series) || g.series < 1 || !Number.isInteger(g.cycle) || g.cycle < 1 || !Number.isFinite(Date.parse(g.server_now)) || typeof g.complete !== "boolean" || !g.summary || !Number.isInteger(g.summary.choices) || !Number.isInteger(g.summary.settled)) throw Error("Invalid comparison response");
  const r = g.round;
  if (r && (!uuid(r.id) || !Number.isInteger(r.number) || r.number < 1 || r.number > 10 || !Array.isArray(r.cards) || r.cards.length !== 2 || !r.cards.every(isPerson) || r.cards[0].id === r.cards[1].id || !(r.outcome === null || [...choices, "withdrawn"].includes(r.outcome)) || (r.winner !== null && !r.cards.some(p => p.id === r.winner)) || (r.outcome !== null && (!r.next_at || !Number.isFinite(Date.parse(r.next_at)))) || (r.community !== null && (!Number.isInteger(r.community?.left) || r.community.left < 0 || !Number.isInteger(r.community?.right) || r.community.right < 0 || r.community.total < 20 || r.community.left + r.community.right !== r.community.total)))) throw Error("Invalid pair response");
  return g;
}
export const comparisonRequest = async (name: string, payload: Record<string, unknown>, signal?: AbortSignal) => parseComparison(await gameplayRpc(name, payload, signal));
export async function activeComparison(signal?: AbortSignal) { const v = await gameplayRpc("this_that_active", { p_board: "actors" }, signal); return v === null ? null : parseComparison(v); }
export const comparisonCatalog = (signal?: AbortSignal) => gameplayRpc<{ boards: { key: Board; name: string; people: number; pairs: number }[] }>("this_that_catalog", {}, signal);
export async function personalTop(id?: string, signal?: AbortSignal) {
  const rows = await gameplayRpc<TopPerson[]>("this_that_top", { p_id: id ?? null }, signal);
  if (!Array.isArray(rows) || rows.some(p => !isPerson(p) || !Number.isInteger(p.rank) || p.rank < 1)) throw Error("Invalid personal top");
  return rows;
}
export async function ranking(search: string, signal: AbortSignal): Promise<Ranking> {
  const controller = new AbortController(); const abort = () => controller.abort(); signal.addEventListener("abort", abort, { once: true }); if (signal.aborted) controller.abort();
  const timer = window.setTimeout(abort, 15000);
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/this-that-ranking`, { method: "POST", headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }, body: JSON.stringify({ board: "actors", search }), signal: controller.signal, credentials: "omit" });
    if (!response.ok) throw Error("Ranking unavailable");
    const r = await response.json() as Ranking;
    if (!r || !Number.isInteger(r.total) || !Number.isInteger(r.candidates) || !Array.isArray(r.rows) || r.rows.length > 20 || r.rows.some(p => !isPerson(p) || !(p.rank === null || Number.isInteger(p.rank) && p.rank > 0))) throw Error("Invalid ranking");
    return r;
  } finally { window.clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
