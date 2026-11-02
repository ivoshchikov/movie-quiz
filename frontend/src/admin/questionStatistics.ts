import { supabase } from "../supabase";
export const statSorts = ["shown_desc", "shown_asc", "correct_desc", "accuracy_desc", "accuracy_asc", "id_desc", "id_asc"] as const;
export interface StatisticsFilters { search: string; category: number | null; difficulty: number | null; mode: "all" | "normal" | "daily" | "time_attack"; versions: "all" | "current"; sort: typeof statSorts[number]; page: number }
export interface QuestionStatistic { id: number; image_url: string; correct_answer: string; category_id: number | null; difficulty_level_id: number; admin_revision: number; shown: number; correct: number; accuracy: number | null }
export interface QuestionStatistics { rows: QuestionStatistic[]; total: number; page: number; page_size: 25; shown: number; correct: number; since: string; updated_at: string }
const integer = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const date = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
export function statisticsFilters(p: URLSearchParams): StatisticsFilters {
  const number = (v: string | null, zero = false) => v && /^\d{1,6}$/.test(v) && Number(v) >= (zero ? 0 : 1) ? Number(v) : null;
  return { search: (p.get("q") ?? "").slice(0, 200), category: number(p.get("category"), true), difficulty: number(p.get("difficulty")),
    mode: ["normal", "daily", "time_attack"].includes(p.get("mode") ?? "") ? p.get("mode") as StatisticsFilters["mode"] : "all",
    versions: p.get("versions") === "current" ? "current" : "all",
    sort: statSorts.includes(p.get("sort") as StatisticsFilters["sort"]) ? p.get("sort") as StatisticsFilters["sort"] : "shown_desc",
    page: Math.min(number(p.get("page")) ?? 1, 100000) };
}
export async function loadQuestionStatistics(owner: string, f: StatisticsFilters, signal: AbortSignal): Promise<QuestionStatistics> {
  const { data: d, error } = await supabase.rpc("admin_question_statistics", { p_expected_owner: owner, p_search: f.search, p_category_id: f.category,
    p_difficulty_id: f.difficulty, p_mode: f.mode, p_versions: f.versions, p_sort: f.sort, p_page: f.page }).abortSignal(signal);
  if (error) throw error;
  const totalShown: unknown = d?.shown, totalCorrect: unknown = d?.correct;
  if (!object(d) || !Array.isArray(d.rows) || !integer(d.total) || !integer(d.page) || d.page < 1 || d.page_size !== 25 ||
    !integer(totalShown) || !integer(totalCorrect) || totalCorrect > totalShown || !date(d.since) || !date(d.updated_at) || Date.parse(d.since) > Date.parse(d.updated_at) ||
    d.page > Math.max(1, Math.ceil(d.total / 25)) || d.rows.length !== Math.min(25, Math.max(0, d.total - (d.page - 1) * 25)) ||
    !d.rows.every(r => object(r) && integer(r.id) && r.id > 0 && typeof r.image_url === "string" && typeof r.correct_answer === "string" &&
      (r.category_id === null || integer(r.category_id)) && integer(r.difficulty_level_id) && r.difficulty_level_id > 0 && integer(r.admin_revision) && r.admin_revision > 0 &&
      integer(r.shown) && integer(r.correct) && r.correct <= r.shown && r.shown <= totalShown && r.correct <= totalCorrect &&
      (r.shown === 0 ? r.accuracy === null : typeof r.accuracy === "number" && Number.isFinite(r.accuracy) && Math.abs(r.accuracy - Math.round(r.correct / r.shown * 1000) / 10) < .001)) ||
    new Set(d.rows.map(r => r.id)).size !== d.rows.length) throw Error("Invalid question statistics");
  return d as unknown as QuestionStatistics;
}
