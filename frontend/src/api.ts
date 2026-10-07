// frontend/src/api.ts
import { supabase, getPublicUrl } from "./supabase";

/* ────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
export interface Category { id: number; name: string; }
export interface DifficultyLevel {
  id: number; key: string; name: string; time_limit_secs: number; lives: number; sort_order?: number;
}
export interface Profile { user_id: string; nickname: string | null; avatar_url: string | null; }
export type ProfileDetails = Pick<Profile, "nickname" | "avatar_url">;
export interface Question {
  id: number; image_url: string; options: string[]; correct_answer?: string;
  category_id: number; difficulty_level_id: number;
}
export interface MyDailyResult { is_answered: boolean; is_correct: boolean | null; time_spent: number | null; answered_at: string | null; }
export interface DailyFastestRow { nickname: string | null; time_spent: number; answered_at: string; }
export interface LeaderboardRow { nickname: string | null; best_score: number; best_time: number; updated_at?: string; user_id?: string; }
export interface UserBestRow { category_id: number; difficulty_level_id: number; best_score: number; best_time: number; updated_at: string; }
export interface PersonalBest { score: number; time: number; }
export interface DailyUserStreak {
  current_streak: number; longest_streak: number; total_correct: number;
  last_played?: string | null; last_correct?: string | null;
}
export interface DailyStreakRow {
  user_id: string; nickname: string | null; streak: number; start_d: string; end_d: string;
}
export interface DailyHistoryRow {
  d: string; question_id: number; image_url: string; correct_answer: string;
  category_id: number; difficulty_level_id: number; total_answers: number;
  correct_answers: number; created_at: string;
}

/* ────────────────────────────────────────────────────────────
   PROFILES
───────────────────────────────────────────────────────────── */
export async function getProfile(userId: string): Promise<ProfileDetails | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nickname,avatar_url")
    .eq("user_id", userId)
    .single();
  if (error) { console.warn("getProfile:", error.message); return null; }
  return (data as ProfileDetails | null) ?? null;
}

export async function isNicknameTaken(nickname: string, excludeUserId?: string): Promise<boolean> {
  if (!nickname.trim()) return false;
  let q = supabase.from("profiles").select("user_id", { count: "exact", head: true }).ilike("nickname", nickname.trim());
  if (excludeUserId) q = q.neq("user_id", excludeUserId);
  const { count, error } = await q;
  if (error) { console.warn("isNicknameTaken:", error.message); return false; }
  return (count ?? 0) > 0;
}

export async function upsertProfile(userId: string, nickname: string | null, avatarUrl?: string | null): Promise<ProfileDetails | null> {
  const payload: Profile = { user_id: userId, nickname: nickname ?? null, avatar_url: avatarUrl ?? null };
  const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" }).select("nickname,avatar_url").single();
  if (error) throw error;
  return data as ProfileDetails | null;
}

/* ────────────────────────────────────────────────────────────
   CATEGORIES / DIFFICULTIES
───────────────────────────────────────────────────────────── */
export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const query = supabase.from("category").select("id,name").order("name");
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return data ?? [];
}
export async function getDifficulties(signal?: AbortSignal): Promise<DifficultyLevel[]> {
  const query = supabase.from("difficulty_level")
    .select("id,key,name,time_limit_secs,lives,sort_order").order("sort_order", { ascending: true });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return data ?? [];
}
export function getDifficultyLevels(signal?: AbortSignal): Promise<DifficultyLevel[]> { return getDifficulties(signal); }

export async function countQuestions(categoryId: number, difficultyId?: number, signal?: AbortSignal): Promise<number> {
  let query = supabase.from("question").select("id", { count: "exact", head: true }).eq("category_id", categoryId);
  if (difficultyId != null) query = query.eq("difficulty_level_id", difficultyId);
  const { count, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  if (count == null || !Number.isInteger(count) || count < 0) throw new Error("invalid-question-count");
  return count;
}

/* ────────────────────────────────────────────────────────────
   NORMAL GAME (не daily)
   getQuestion: понимает 2 сигнатуры:
   - getQuestion(categoryId, difficultyId)
   - getQuestion(excludeIds[], categoryId, difficultyId)
───────────────────────────────────────────────────────────── */
export function getQuestion(categoryId: number, difficultyId: number): Promise<Question>;
export function getQuestion(excludeIds: number[], categoryId: number, difficultyId: number): Promise<Question>;
export async function getQuestion(arg1: number | number[], arg2: number, arg3?: number): Promise<Question> {
  let payload: Record<string, number | number[]>;
  if (Array.isArray(arg1)) {
    if (arg3 == null) throw new Error("invalid-settings");
    payload = { p_exclude_ids: arg1, p_category_id: arg2, p_difficulty_id: arg3 };
  } else {
    // новая форма
    payload = { p_category_id: arg1 as number, p_difficulty_id: arg2 as number };
  }

  const { data, error } = await supabase.rpc("get_question", payload);
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  if (!row) throw new Error("no-question");
  if (typeof row.id !== "number" || !Number.isInteger(row.id) || typeof row.category_id !== "number" ||
    typeof row.difficulty_level_id !== "number" || typeof row.image_url !== "string" || !row.image_url.trim()) throw new Error("invalid-question");
  const publicUrl = getPublicUrl(row.image_url);
  const options: unknown =
    Array.isArray(row.options_json) ? row.options_json :
    typeof row.options_json === "string" ? JSON.parse(row.options_json) : [];

  if (!Array.isArray(options) || options.length !== 4 || !options.every((option): option is string => typeof option === "string" && !!option.trim()) || new Set(options).size !== 4) {
    throw new Error("invalid-question");
  }
  return {
    id: row.id,
    image_url: publicUrl,
    options,
    correct_answer: typeof row.correct_answer === "string" ? row.correct_answer : undefined,
    category_id: row.category_id,
    difficulty_level_id: row.difficulty_level_id,
  };
}

export async function checkAnswer(questionId: number, answer: string) {
  const { data, error } = await supabase.from("question").select("correct_answer").eq("id", questionId).single();
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
  return (data || []) as UserBestRow[];
}

export async function getPersonalBest(userId: string, categoryId: number, difficultyId: number, signal: AbortSignal): Promise<PersonalBest | null> {
  const { data, error } = await supabase.from("user_best")
    .select("category_id,difficulty_level_id,best_score,best_time")
    .eq("user_id", userId).eq("category_id", categoryId).eq("difficulty_level_id", difficultyId)
    .limit(1).abortSignal(signal);
  if (error) throw error;
  const row = data?.find(item => item.category_id === categoryId && item.difficulty_level_id === difficultyId);
  if (!row) return null;
  if (!Number.isInteger(row.best_score) || row.best_score < 0 || !Number.isFinite(row.best_time) || row.best_time < 0) throw new Error("invalid-personal-best");
  return { score: row.best_score, time: row.best_time };
}

/* ────────────────────────────────────────────────────────────
   PUBLIC LEADERBOARD (обычная игра)
───────────────────────────────────────────────────────────── */
export async function getLeaderboard(categoryId: number, difficultyId: number, limit = 5, signal?: AbortSignal): Promise<LeaderboardRow[]> {
  const query = supabase.rpc("get_leaderboard", { p_category_id: categoryId, p_difficulty_id: difficultyId, p_limit: limit });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(row => row && (row.nickname === null || typeof row.nickname === "string") &&
    Number.isInteger(row.best_score) && row.best_score >= 0 && Number.isFinite(row.best_time) && row.best_time >= 0)) {
    throw new Error("invalid-leaderboard");
  }
  // Keep the server's order, including ties. Identity is optional in the existing RPC.
  return data.map(row => ({ nickname: row.nickname, best_score: row.best_score, best_time: row.best_time,
    ...(typeof row.updated_at === "string" ? { updated_at: row.updated_at } : {}),
    ...(typeof row.user_id === "string" && row.user_id.trim() ? { user_id: row.user_id } : {}) }));
}

/* ────────────────────────────────────────────────────────────
   DAILY (US Central)
───────────────────────────────────────────────────────────── */
export function getDailyDateUS(tz = "America/Chicago"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

type DailyRowFull = {
  id: number; image_url: string; options_json: unknown; correct_answer?: string;
  category_id: number; difficulty_level_id: number;
};

export async function getDailyQuestion(dateOverride?: string, signal?: AbortSignal): Promise<Question> {
  const pDate = dateOverride ?? getDailyDateUS();
  const query = supabase.rpc("get_daily_question", { p_date: pDate });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) throw new Error("no-daily-question");
  const raw = rows[0] as DailyRowFull;

  if (!Number.isInteger(raw.id) || typeof raw.image_url !== "string" || !raw.image_url.trim() ||
    !Number.isInteger(raw.category_id) || !Number.isInteger(raw.difficulty_level_id)) throw new Error("invalid-daily-question");

  const publicUrl = getPublicUrl(raw.image_url);
  const opts: string[] =
    Array.isArray(raw.options_json) ? (raw.options_json as string[]) :
    typeof raw.options_json === "string" ? JSON.parse(raw.options_json) : [];

  if (opts.length !== 4 || !opts.every(option => typeof option === "string" && !!option.trim()) ||
    new Set(opts.map(option => option.trim())).size !== 4 || typeof raw.correct_answer !== "string" ||
    !opts.some(option => option.trim() === raw.correct_answer?.trim())) throw new Error("invalid-daily-question");

  return { id: raw.id, image_url: publicUrl, options: opts, correct_answer: raw.correct_answer!,
           category_id: raw.category_id, difficulty_level_id: raw.difficulty_level_id };
}

export async function getDailyQuestionPublic(dateOverride?: string): Promise<Question> {
  const pDate = dateOverride ?? getDailyDateUS();
  const { data, error } = await supabase.rpc("get_daily_question_public", { p_date: pDate });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) throw new Error("no-daily-question");
  const raw = rows[0] as DailyRowFull;

  const publicUrl = getPublicUrl(raw.image_url);
  const opts: string[] =
    Array.isArray(raw.options_json) ? (raw.options_json as string[]) :
    typeof raw.options_json === "string" ? JSON.parse(raw.options_json) : [];

  return { id: raw.id, image_url: publicUrl, options: opts,
           category_id: raw.category_id, difficulty_level_id: raw.difficulty_level_id };
}

export async function startDailySession(userId: string, date?: string, signal?: AbortSignal): Promise<unknown> {
  const query = supabase.rpc("start_daily_session", { p_user_id: userId, p_date: date ?? getDailyDateUS() });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return (data as unknown) ?? null;
}

export async function submitDailyResult(userId: string, date: string, isCorrect: boolean, timeSpentSecs: number, signal?: AbortSignal) {
  const query = supabase.rpc("submit_daily_result", {
    p_user_id: userId, p_date: date, p_is_correct: isCorrect, p_time: timeSpentSecs,
  });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return data;
}

export async function getMyDailyResult(userId: string, date?: string, signal?: AbortSignal): Promise<MyDailyResult> {
  const query = supabase.rpc("get_my_daily_result", { p_user_id: userId, p_date: date ?? getDailyDateUS() });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  const raw = rows[0] as Partial<MyDailyResult> | undefined;
  if (raw && (typeof raw.is_answered !== "boolean" || (raw.is_correct != null && typeof raw.is_correct !== "boolean") ||
    (raw.time_spent != null && (!Number.isFinite(raw.time_spent) || raw.time_spent < 0)) ||
    (raw.answered_at != null && typeof raw.answered_at !== "string"))) throw new Error("invalid-daily-result");
  return { is_answered: raw?.is_answered ?? false, is_correct: raw?.is_correct ?? null, time_spent: raw?.time_spent ?? null, answered_at: raw?.answered_at ?? null };
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

export async function getDailyUserStreak(userId: string, signal?: AbortSignal): Promise<DailyUserStreak | null | undefined> {
  const query = supabase.rpc("get_daily_user_streak", { p_user_id: userId });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (row && ![row.current_streak, row.longest_streak, row.total_correct].every(value => Number.isInteger(value) && value >= 0)) throw new Error("invalid-daily-streak");
  return row as DailyUserStreak | null | undefined;
}

export async function getDailyStreakLeaderboard(activeOnly = false, limit = 20, hideNicks?: string[], signal?: AbortSignal): Promise<DailyStreakRow[]> {
  const query = supabase.rpc("get_daily_streak_leaderboard", {
    p_active_only: activeOnly, p_limit: limit, p_hide_nicks: hideNicks ?? [],
  });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  if (data != null && (!Array.isArray(data) || !data.every(row => typeof row.user_id === "string" &&
    (row.nickname == null || typeof row.nickname === "string") && Number.isInteger(row.streak) && row.streak >= 0 &&
    typeof row.start_d === "string" && typeof row.end_d === "string"))) throw new Error("invalid-daily-leaderboard");
  return (data || []) as DailyStreakRow[];
}

export async function getDailyBestTimeRecords(limit = 20, hideNicks?: string[]): Promise<unknown[]> {
  const { data, error } = await supabase.rpc("get_daily_best_time_records", {
    p_limit: limit, p_hide_nicks: hideNicks ?? [],
  });
  if (error) throw error;
  return (data || []) as unknown[];
}

export async function getDailyTotalCorrectLeaderboard(limit = 20, hideNicks?: string[]): Promise<unknown[]> {
  const { data, error } = await supabase.rpc("get_daily_total_correct_leaderboard", {
    p_limit: limit, p_hide_nicks: hideNicks ?? [],
  });
  if (error) throw error;
  return (data || []) as unknown[];
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
export async function getDailyHistoryAdmin(limit = 30, offset = 0): Promise<DailyHistoryRow[]> {
  const { data, error } = await supabase.rpc("get_daily_history_admin", { p_limit: limit, p_offset: offset });
  if (error) throw error;
  const rows = (data || []) as DailyHistoryRow[];
  for (const r of rows) if (r?.image_url) r.image_url = getPublicUrl(String(r.image_url));
  return rows;
}
