import { supabase, getPublicUrl } from "../supabase";
import type { DailyHistoryRow } from "../api";

export interface AdminQuestion {
  id: number;
  image_url: string;
  correct_answer: string;
  category_id: number;
  difficulty_level_id: number;
}
export interface AdminQuestionPreview extends AdminQuestion {
  options: string[];
  source: {
    image_url: string;
    correct_answer: string;
    options_json: unknown;
    category_id: number;
    difficulty_level_id: number;
  };
}
export interface DailyAssignment {
  d: string;
  question_id: number | null;
  attempt_count: number;
  version: number;
}
export const HISTORY_PAGE_SIZE = 20;
export const SEARCH_LIMIT = 30;

export function validDailyDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
function positiveId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}
function count(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function question(value: unknown): AdminQuestion {
  if (
    !record(value) ||
    !positiveId(value.id) ||
    !positiveId(value.category_id) ||
    !positiveId(value.difficulty_level_id) ||
    typeof value.correct_answer !== "string" ||
    !value.correct_answer.trim() ||
    typeof value.image_url !== "string"
  )
    throw new Error("invalid-admin-question");
  return {
    id: value.id,
    category_id: value.category_id,
    difficulty_level_id: value.difficulty_level_id,
    correct_answer: value.correct_answer.trim(),
    image_url: value.image_url.trim()
      ? getPublicUrl(value.image_url.trim())
      : "",
  };
}
function assignment(value: unknown, date: string): DailyAssignment {
  const row = Array.isArray(value) && value.length === 1 ? value[0] : value;
  if (
    !record(row) ||
    row.d !== date ||
    !(row.question_id === null || positiveId(row.question_id)) ||
    !count(row.attempt_count) ||
    !count(row.version)
  )
    throw new Error("invalid-admin-assignment");
  return {
    d: date,
    question_id: row.question_id,
    attempt_count: row.attempt_count,
    version: row.version,
  };
}

export async function checkAdminRights(signal: AbortSignal): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin").abortSignal(signal);
  if (error) throw error;
  if (typeof data !== "boolean") throw new Error("invalid-admin-rights");
  return data;
}
export async function searchAdminQuestions(
  term: string,
  signal: AbortSignal,
): Promise<AdminQuestion[]> {
  const text = term.trim();
  if (!text) return [];
  const pattern = text.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase
    .from("question")
    .select("id,image_url,correct_answer,category_id,difficulty_level_id")
    .ilike("correct_answer", `%${pattern}%`)
    .order("id", { ascending: false })
    .limit(SEARCH_LIMIT)
    .abortSignal(signal);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("invalid-admin-search");
  const rows = data.map(question);
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error("duplicate-admin-search");
  return rows;
}
export async function getAdminQuestion(
  id: number,
  signal: AbortSignal,
): Promise<AdminQuestionPreview | null> {
  if (!positiveId(id)) throw new Error("invalid-admin-question-id");
  const { data, error } = await supabase
    .from("question")
    .select(
      "id,image_url,correct_answer,options_json,category_id,difficulty_level_id",
    )
    .eq("id", id)
    .abortSignal(signal)
    .maybeSingle();
  if (error) throw error;
  if (data === null) return null;
  const parsed = question(data);
  let options: unknown = data.options_json;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      throw new Error("invalid-admin-options");
    }
  }
  if (
    !Array.isArray(options) ||
    options.length !== 4 ||
    !options.every((option) => typeof option === "string" && option.trim()) ||
    new Set(options.map((option) => option.trim())).size !== 4 ||
    !options.some((option) => option.trim() === parsed.correct_answer) ||
    !parsed.image_url
  )
    throw new Error("invalid-admin-options");
  return {
    ...parsed,
    options: options.map((option) => option.trim()),
    source: {
      image_url: data.image_url,
      correct_answer: data.correct_answer,
      options_json: data.options_json,
      category_id: parsed.category_id,
      difficulty_level_id: parsed.difficulty_level_id,
    },
  };
}
export async function getAdminHistory(
  offset: number,
  signal: AbortSignal,
): Promise<DailyHistoryRow[]> {
  const { data, error } = await supabase
    .rpc("get_daily_history_admin", {
      p_limit: HISTORY_PAGE_SIZE,
      p_offset: offset,
    })
    .abortSignal(signal);
  if (error) throw error;
  if (
    !Array.isArray(data) ||
    !data.every(
      (row) =>
        record(row) &&
        typeof row.d === "string" &&
        validDailyDate(row.d) &&
        positiveId(row.question_id) &&
        positiveId(row.category_id) &&
        positiveId(row.difficulty_level_id) &&
        typeof row.image_url === "string" &&
        typeof row.correct_answer === "string" &&
        row.correct_answer.trim() &&
        count(row.total_answers) &&
        count(row.correct_answers) &&
        row.correct_answers <= row.total_answers &&
        typeof row.created_at === "string",
    )
  )
    throw new Error("invalid-admin-history");
  if (new Set(data.map((row) => row.d)).size !== data.length)
    throw new Error("duplicate-admin-history");
  return data.map((row) => ({
    ...row,
    image_url: row.image_url.trim() ? getPublicUrl(row.image_url) : "",
  }));
}
// Exact-date reads must not create a Daily or depend on a limited history page.
// These guarded RPCs are enabled only once their server migration is installed.
export async function getAdminAssignment(
  date: string,
  signal: AbortSignal,
): Promise<DailyAssignment> {
  if (!validDailyDate(date)) throw new Error("invalid-admin-date");
  const { data, error } = await supabase
    .rpc("get_daily_assignment_admin", { p_date: date })
    .abortSignal(signal);
  if (error) throw error;
  return assignment(data, date);
}
export async function saveAdminAssignment(
  date: string,
  question: AdminQuestionPreview,
  expected: DailyAssignment,
  owner: string,
  signal: AbortSignal,
): Promise<DailyAssignment> {
  if (
    !validDailyDate(date) ||
    !positiveId(question.id) ||
    expected.d !== date ||
    !(expected.question_id === null || positiveId(expected.question_id)) ||
    !count(expected.version) ||
    !owner
  )
    throw new Error("invalid-admin-write");
  const { data, error } = await supabase
    .rpc("set_daily_question_admin", {
      p_date: date,
      p_question_id: question.id,
      p_expected_question_id: expected.question_id,
      p_expected_version: expected.version,
      p_expected_user_id: owner,
      p_expected_question: question.source,
    })
    .abortSignal(signal);
  if (error) throw error;
  const result = assignment(data, date);
  if (result.question_id !== question.id)
    throw new Error("unconfirmed-admin-write");
  return result;
}
