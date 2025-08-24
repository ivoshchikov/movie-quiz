// frontend/src/api.ts
import { supabase } from "./supabase";

/* ────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
export interface Category { id: number; name: string; }
export interface DifficultyLevel {
  id: number; key: string; name: string; time_limit_secs: number; lives: number; sort_order?: number;
}
export interface Profile { user_id: string; nickname: string | null; avatar_url: string | null; }
export interface Question {
  id: number; image_url: string; options: string[]; correct_answer?: string;
  category_id: number; difficulty_level_id: number;
}
export interface MyDailyResult { is_answered: boolean; is_correct: boolean | null; time_spent: number | null; answered_at: string | null; }
export interface DailyFastestRow { nickname: string | null; time_spent: number; answered_at: string; }
export interface LeaderboardRow { nickname: string | null; best_score: number; best_time: number; updated_at: string; }

/* ────────────────────────────────────────────────────────────
   PUBLIC URL BUILDER (фикс путей)
───────────────────────────────────────────────────────────── */
function toPublicUrlFromMoviesBucket(raw: string): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const base   = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "");
  const bucket = import.meta.env.VITE_SUPABASE_BUCKET;
  const defDir = (import.meta.env.VITE_SUPABASE_FOLDER_GENERAL || "").replace(/^\/|\/$/g, "");

  // 1) убираем ведущие слэши и возможный устаревший префикс posters/
  let p = String(raw).replace(/^\/+/, "").replace(/^posters\//i, "");
  // 2) если нет подпапки — добавляем дефолтную (general)
  if (!p.includes("/") && defDir) p = `${defDir}/${p}`;

  return `${base}/storage/v1/object/public/${bucket}/${p}`;
}

/* ────────────────────────────────────────────────────────────
   PROFILES
───────────────────────────────────────────────────────────── */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("nickname,avatar_url")
    .eq("user_id", userId)
    .single();
  if (error) { console.warn("getProfile:", error.message); return null; }
  return (data as any) ?? null;
}

export async function isNicknameTaken(nickname: string, excludeUserId?: string): Promise<boolean> {
  if (!nickname.trim()) return false;
  let q = supabase.from("profiles").select("user_id", { count: "exact", head: true }).ilike("nickname", nickname.trim());
  if (excludeUserId) q = q.neq("user_id", excludeUserId);
  const { count, error } = await q;
  if (error) { console.warn("isNicknameTaken:", error.message); return false; }
  return (count ?? 0) > 0;
}

export async function upsertProfile(userId: string, nickname: string | null, avatarUrl?: string | null) {
  const payload: any = { user_id: userId, nickname: nickname ?? null, avatar_url: avatarUrl ?? null };
  const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" }).select("nickname,avatar_url").single();
  if (error) throw error;
  return data as any;
}

/* ────────────────────────────────────────────────────────────
   CATEGORIES / DIFFICULTIES
───────────────────────────────────────────────────────────── */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from<Category>("category").select("id,name").order("name");
  if (error) throw error;
  return data ?? [];
}
export async function getDifficulties(): Promise<DifficultyLevel[]> {
  const { data, error } = await supabase.from<DifficultyLevel>("difficulty_level")
    .select("id,key,name,time_limit_secs,lives,sort_order").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export function getDifficultyLevels(): Promise<DifficultyLevel[]> { return getDifficulties(); }

export async function countQuestions(categoryId: number, difficultyId: number): Promise<number> {
  const { count, error } = await supabase.from("question").select("id", { count: "exact", head: true })
    .eq("category_id", categoryId).eq("difficulty_level_id", difficultyId);
  if (error) throw error;
  return count ?? 0;
}

/* ────────────────────────────────────────────────────────────
   NORMAL GAME (не daily)
───────────────────────────────────────────────────────────── */
export async function getQuestion(categoryId: number, difficultyId: number): Promise<Question> {
  const { data, error } = await supabase.rpc("get_question", { p_category_id: categoryId, p_difficulty_id: difficultyId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as any;
  if (!row) throw new Error("no-question");

  const pub = toPublicUrlFromMoviesBucket(String(row.image_url ?? ""));
  const options: string[] =
    Array.isArray(row.options_json) ? row.options_json :
    typeof row.options_json === "string" ? JSON.parse(row.options_json) : [];

  return { id: row.id, image_url: pub, options, correct_answer: row.correct_answer,
           category_id: row.category_id, difficulty_level_id: row.difficulty_level_id };
}

export async function checkAnswer(questionId: number, answer: string) {
  const { data, error } = await supabase.from<{ correct_answer: string }>("question").select("correct_answer").eq("id", questionId).single();
  if (error) throw error;
  const correct_answer = data?.correct_answer ?? "";
  const correct = correct_answer.trim().toLowerCase() === answer.trim().toLowerCase();
  return { correct, correct_answer };
}

/* МОИ ЛУЧШИЕ */
export async function getMyBest(userId: string) {
  const { data, error } = await supabase.from("user_best")
    .select("category_id,difficulty_level_id,best_score,best_time,updated_at")
    .eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as any[];
}

/* ────────────────────────────────────────────────────────────
   PUBLIC LEADERBOARD (обычная игра)
───────────────────────────────────────────────────────────── */
export async function getLeaderboard(categoryId: number, difficultyId: number, limit = 5): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { p_category_id: categoryId, p_difficulty_id: difficultyId, p_limit: limit });
  if (error) throw error;
  return (data || []) as LeaderboardRow[];
}

/* ────────────────────────────────────────────────────────────
   DAILY (US Central)
───────────────────────────────────────────────────────────── */
export function getDailyDateUS(tz = "America/Chicago"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export interface QuestionRowFull {
  id: number; image_url: string; options_json: unknown; correct_answer: string;
  category_id: number; difficulty_level_id: number;
}

export async function getDailyQuestion(dateOverride?: string): Promise<Question> {
  const pDate = dateOverride ?? getDailyDateUS();
  const { data, error } = await supabase.rpc("get_daily_question", { p_date: pDate });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) throw new Error("no-daily-question");
  const raw = rows[0] as QuestionRowFull;

  const publicUrl = toPublicUrlFromMoviesBucket(raw.image_url);
  const opts: string[] =
    Array.isArray(raw.options_json) ? (raw.options_json as string[]) :
    typeof raw.options_json === "string" ? JSON.parse(raw.options_json) : [];

  return { id: raw.id, image_url: publicUrl, options: opts, correct_answer: raw.correct_answer,
           category_id: raw.category_id, difficulty_level_id: raw.difficulty_level_id };
}

export async function getDailyQuestionPublic(dateOverride?: string): Promise<Question> {
  const pDate = dateOverride ?? getDailyDateUS();
  const { data, error } = await supabase.rpc("get_daily_question_public", { p_date: pDate });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) throw new Error("no-daily-question");
  const raw = rows[0] as { id: number; image_url: string; options_json: unknown; category_id: number; difficulty_level_id: number; };

  const publicUrl = toPublicUrlFromMoviesBucket(raw.image_url);
  const opts: string[] =
    Array.isArray(raw.options_json) ? (raw.options_json as string[]) :
    typeof raw.options_json === "string" ? JSON.parse(raw.options_json) : [];

  return { id: raw.id, image_url: publicUrl, options: opts, category_id: raw.category_id, difficulty_level_id: raw.difficulty_level_id };
}

export async function startDailySession(userId: string, date?: string) {
  const { data, error } = await supabase.rpc("start_daily_session", { p_user_id: userId, p_date: date ?? getDailyDateUS() });
  if (error) throw error;
  return (data as any) ?? null;
}

export async function submitDailyResult(userId: string, date: string, isCorrect: boolean, timeSpentSecs: number) {
  const { data, error } = await supabase.rpc("submit_daily_result", {
    p_user_id: userId, p_date: date, p_is_correct: isCorrect, p_time: timeSpentSecs,
  });
  if (error) throw error;
  return data;
}

export async function getMyDailyResult(userId: string, date?: string): Promise<MyDailyResult> {
  const { data, error } = await supabase.rpc("get_my_daily_result", { p_user_id: userId, p_date: date ?? getDailyDateUS() });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  const raw = rows[0] as Partial<MyDailyResult> | undefined;
  return { is_answered: !!raw?.is_answered, is_correct: raw?.is_correct ?? null, time_spent: raw?.time_spent ?? null, answered_at: raw?.answered_at ?? null };
}

/* ────────────────────────────────────────────────────────────
   FASTEST / STREAKS / RECORDS
───────────────────────────────────────────────────────────── */
export async function getDailyFastest(date?: string, limit = 5, hideNicks?: string[]): Promise<DailyFastestRow[]> {
  const { data, error } = await supabase.rpc("get_daily_fastest", {
    p_date: date ?? getDailyDateUS(), p_limit: limit, p_hide_nicks: hideNicks ?? [],
  });
  if (error) throw error;
  return (data || []) as DailyFastestRow[];
}

export async function getDailyUserStreak(userId: string) {
  const { data, error } = await supabase.rpc("get_daily_user_streak", { p_user_id: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as any;
}

export async function getDailyStreakLeaderboard(activeOnly = false, limit = 20, hideNicks?: string[]) {
  const { data, error } = await supabase.rpc("get_daily_streak_leaderboard", {
    p_active_only: activeOnly, p_limit: limit, p_hide_nicks: hideNicks ?? [],
  });
  if (error) throw error;
  return (data || []) as any[];
}

export async function getDailyBestTimeRecords(limit = 20, hideNicks?: string[]) {
  const { data, error } = await supabase.rpc("get_daily_best_time_records", {
    p_limit: limit, p_hide_nicks: hideNicks ?? [],
  });
  if (error) throw error;
  return (data || []) as any[];
}

export async function getDailyTotalCorrectLeaderboard(limit = 20, hideNicks?: string[]) {
  const { data, error } = await supabase.rpc("get_daily_total_correct_leaderboard", {
    p_limit: limit, p_hide_nicks: hideNicks ?? [],
  });
  if (error) throw error;
  return (data || []) as any[];
}

/* ────────────────────────────────────────────────────────────
   ADMIN RPC WRAPPERS
───────────────────────────────────────────────────────────── */
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw error;
  return !!data;
}
export async function setDailyQuestion(pDate: string, questionId: number): Promise<void> {
  const { error } = await supabase.rpc("set_daily_question", { p_date: pDate, p_question_id: questionId });
  if (error) throw error;
}
export async function getDailyHistoryAdmin(limit = 30, offset = 0) {
  const { data, error } = await supabase.rpc("get_daily_history_admin", { p_limit: limit, p_offset: offset });
  if (error) throw error;
  const rows = (data || []) as any[];
  for (const r of rows) if (r?.image_url) r.image_url = toPublicUrlFromMoviesBucket(String(r.image_url));
  return rows;
}
