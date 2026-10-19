import { gameplayRpc } from "../game/server";

export type AttackLevel = "easy" | "medium" | "hard";
export interface AttackCatalog {
  categories: { id: number; name: string; bank_size: number }[];
  levels: { key: AttackLevel; name: string; duration_secs: number }[];
}
export interface AttackBest { score: number; score_time_ms: number; }
export interface AttackRound {
  id: string; number: number; question_id: number; image_url: string; options: string[];
  issued_at: string; next_at: string | null; selected: string | null;
  outcome: "correct" | "wrong" | "skipped" | "abandoned" | null;
}
export interface AttackGame {
  id: string; owner: string | null; category_id: number; level: AttackLevel; duration_secs: number;
  score: number; correct: number; wrong: number; skipped: number; version: number; bank_size: number;
  started_at: string; deadline_at: string; server_now: string; elapsed_ms: number; score_time_ms: number | null;
  status: "active" | "finished"; finish_reason: "time-up" | "completed" | "exit" | null;
  previous_best: AttackBest | null; personal_best: AttackBest | null; record_outcome: "first" | "new" | null;
  round: AttackRound | null;
}
export interface AttackRank extends AttackBest { rank: number; user_id: string; nickname: string; updated_at: string; }
export interface AttackRanking { total: number; top: AttackRank[]; me: AttackRank | null; }
export interface MyAttackBest extends AttackBest { category_id: number; level: AttackLevel; updated_at: string; }
export const levelName = (key: AttackLevel) => ({ easy: "Easy", medium: "Medium", hard: "Hard" })[key];
export const isLevel = (v: unknown): v is AttackLevel => typeof v === "string" && ["easy", "medium", "hard"].includes(v);
const integer = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v);
const count = (v: unknown): v is number => integer(v) && v >= 0;
const date = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const best = (v: AttackBest) => !!v && integer(v.score) && count(v.score_time_ms);
export function parseAttack(value: unknown): AttackGame {
  const g = value as AttackGame;
  if (!g || typeof g.id !== "string" || !(g.owner === null || typeof g.owner === "string") ||
    ![1, 2].includes(g.category_id) || !isLevel(g.level) || g.duration_secs !== ({ easy: 120, medium: 90, hard: 60 })[g.level] ||
    !integer(g.score) || ![g.correct, g.wrong, g.skipped, g.version, g.bank_size, g.elapsed_ms].every(count) ||
    g.score !== g.correct * 2 - g.wrong || !["active", "finished"].includes(g.status) ||
    ![g.started_at, g.deadline_at, g.server_now].every(date) ||
    !(g.score_time_ms === null || count(g.score_time_ms)) ||
    (g.status === "finished" && (!count(g.score_time_ms) || !["time-up", "completed", "exit"].includes(g.finish_reason ?? ""))) ||
    !(g.previous_best === null || best(g.previous_best)) || !(g.personal_best === null || best(g.personal_best)) ||
    ![null, "first", "new"].includes(g.record_outcome)) throw new Error("invalid-time-attack");
  const r = g.round;
  if (r && (typeof r.id !== "string" || !count(r.number) || r.number < 1 || !count(r.question_id) ||
    typeof r.image_url !== "string" || !r.image_url.trim() || !Array.isArray(r.options) || r.options.length !== 4 ||
    !r.options.every(o => typeof o === "string" && !!o.trim()) || new Set(r.options).size !== 4 || !date(r.issued_at) ||
    !(r.next_at === null || date(r.next_at)) || ![null, "correct", "wrong", "skipped", "abandoned"].includes(r.outcome) ||
    !(r.selected === null || r.options.includes(r.selected)))) throw new Error("invalid-time-attack-round");
  return g;
}
export async function attackRequest(name: "time_attack_start" | "time_attack_status" | "time_attack_action" | "time_attack_next" | "time_attack_finish", payload: Record<string, unknown>) {
  return parseAttack(await gameplayRpc(name, payload));
}
export async function attackCatalog(signal?: AbortSignal) {
  const c = await gameplayRpc<AttackCatalog>("time_attack_catalog", {}, signal);
  if (!c || !Array.isArray(c.categories) || !Array.isArray(c.levels) || c.levels.length !== 3 ||
    !c.categories.every(c => [1, 2].includes(c.id) && typeof c.name === "string" && c.name.trim() && count(c.bank_size) && c.bank_size > 0) ||
    new Set(c.categories.map(c => c.id)).size !== c.categories.length ||
    !c.levels.every((l, i) => l.key === ["easy", "medium", "hard"][i] && l.name === levelName(l.key) && l.duration_secs === [120, 90, 60][i])) throw new Error("invalid-time-attack-catalog");
  return c;
}
export async function activeAttack(signal?: AbortSignal) {
  const value = await gameplayRpc("time_attack_active", {}, signal);
  return value === null ? null : parseAttack(value);
}
export async function attackRanking(category: number, level: AttackLevel, signal?: AbortSignal) {
  const r = await gameplayRpc<AttackRanking>("time_attack_leaderboard", { p_category_id: category, p_level: level, p_limit: 10 }, signal);
  const row = (v: AttackRank) => best(v) && count(v.rank) && v.rank > 0 && v.rank <= r.total && typeof v.user_id === "string" && typeof v.nickname === "string" && date(v.updated_at);
  if (!r || !count(r.total) || !Array.isArray(r.top) || r.top.length > 10 || !r.top.every((v, i) => row(v) && v.rank === i + 1) ||
    !(r.me === null || row(r.me))) throw new Error("invalid-time-attack-ranking");
  return r;
}
export async function myAttackBests(signal?: AbortSignal) {
  const rows = await gameplayRpc<MyAttackBest[]>("my_time_attack_bests", {}, signal);
  if (!Array.isArray(rows) || !rows.every(r => best(r) && [1, 2].includes(r.category_id) && isLevel(r.level) && date(r.updated_at))) throw new Error("invalid-time-attack-bests");
  return rows;
}
export const attackTime = (ms: number) => `${(ms / 1000).toFixed(3)} s`;
