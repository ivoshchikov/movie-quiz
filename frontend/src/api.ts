// frontend/src/api.ts
import { supabase } from "./supabase";

/* ────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
export interface Category {
  id: number;
  name: string;
}

export interface DifficultyLevel {
  id: number;
  key: string;
  name: string;
  time_limit_secs: number;
  lives: number;
  mistakes_allowed: number;
  sort_order: number;
}

export interface Question {
  id: number;
  image_url: string;
  options: string[];
  correct_answer: string;
  category_id: number;
  difficulty_level_id: number;
}

/* user_best row */
export interface UserBestRow {
  user_id: string;
  category_id: number;
  difficulty_level_id: number;
  best_score: number;
  best_time: number;
  updated_at: string;
}

/* leaderboard row */
export type LeaderboardRow = {
  nickname: string;
  best_score: number;
  best_time: number;
  updated_at: string;
};

/* fastest today row */
export type DailyFastestRow = {
  nickname: string;
  time_spent: number;
  answered_at: string;
};

/* my daily status */
export type MyDailyResult = {
  is_answered: boolean;
  is_correct: boolean | null;
  time_spent: number | null;
  answered_at: string | null;
};

/* ────────────────────────────────────────────────────────────
   CATEGORIES
───────────────────────────────────────────────────────────── */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from<Category>("category")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data!;
}

/* ────────────────────────────────────────────────────────────
   DIFFICULTY LEVELS
───────────────────────────────────────────────────────────── */
export async function getDifficultyLevels(): Promise<DifficultyLevel[]> {
  const { data, error } = await supabase
    .from<DifficultyLevel>("difficulty_level")
    .select(
      "id, key, name, time_limit_secs, lives, mistakes_allowed, sort_order",
    )
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data!;
}

/* ────────────────────────────────────────────────────────────
   USER BEST RESULTS
───────────────────────────────────────────────────────────── */
export async function getMyBest(userId: string): Promise<UserBestRow[]> {
  const { data, error } = await supabase
    .from<UserBestRow>("user_best")
    .select(
      "user_id, category_id, difficulty_level_id, best_score, best_time, updated_at",
    )
    .eq("user_id", userId)
    .order("best_score", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/* ────────────────────────────────────────────────────────────
   GLOBAL LEADERBOARD (RPC)
───────────────────────────────────────────────────────────── */
export async function getLeaderboard(
  categoryId: number,
  difficultyId: number,
  limit = 5,
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_category_id: categoryId,
    p_difficulty_id: difficultyId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data || []) as LeaderboardRow[];
}

/* ────────────────────────────────────────────────────────────
   QUESTIONS (обычная игра)
───────────────────────────────────────────────────────────── */
export async function getQuestion(
  exclude: number[] = [],
  categoryId?: number,
  difficultyId?: number,
): Promise<Question> {
  let query = supabase
    .from<{
      id: number;
      image_url: string;
      options_json: unknown;
      correct_answer: string;
      category_id: number;
      difficulty_level_id: number;
    }>("question")
    .select(
      "id, image_url, options_json, correct_answer, category_id, difficulty_level_id",
    );

  if (exclude.length > 0) {
    query = query.not("id", "in", `(${exclude.join(",")})`);
  }
  if (categoryId != null) {
    query = query.eq("category_id", categoryId);
  }
  if (difficultyId != null) {
    query = query.eq("difficulty_level_id", difficultyId);
  }

  const { data: all, error } = await query;
  if (error) throw error;
  if (!all || all.length === 0) {
    throw new Error("no-more-questions");
  }

  const raw = all[Math.floor(Math.random() * all.length)];

  const key = raw.image_url.replace(/^\/?posters\//, "");
  const { data: urlData, error: urlError } = supabase.storage
    .from("movies")
    .getPublicUrl(key);

  if (urlError) console.error("Failed to get publicUrl for", raw.image_url, urlError);
  const publicUrl = urlData?.publicUrl ?? raw.image_url;

  const opts: string[] = Array.isArray(raw.options_json)
    ? (raw.options_json as string[])
    : JSON.parse(raw.options_json as string);

  return {
    id: raw.id,
    image_url: publicUrl,
    options: opts,
    correct_answer: raw.correct_answer,
    category_id: raw.category_id,
    difficulty_level_id: raw.difficulty_level_id,
  };
}

/* ────────────────────────────────────────────────────────────
   DAILY (дата по US Central)
───────────────────────────────────────────────────────────── */
export function getDailyDateUS(tz = "America/Chicago"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Авторизованный вариант — возвращает correct_answer */
export async function getDailyQuestion(dateOverride?: string): Promise<Question> {
  const pDate = dateOverride ?? getDailyDateUS();

  const { data, error } = await supabase.rpc("get_daily_question", { p_date: pDate });
  if (error) throw error;

  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) throw new Error("no-daily-question");

  const raw = rows[0] as {
    id: number;
    image_url: string;
    options_json: unknown;
    correct_answer: string;
    category_id: number;
    difficulty_level_id: number;
  };

  const key = raw.image_url.replace(/^\/?posters\//, "");
  const { data: urlData } = supabase.storage.from("movies").getPublicUrl(key);
  const publicUrl = urlData?.publicUrl ?? raw.image_url;

  let opts: string[] = [];
  if (Array.isArray(raw.options_json)) {
    opts = raw.options_json as string[];
  } else {
    try {
      opts = JSON.parse(raw.options_json as any);
    } catch {
      opts = [];
    }
  }

  return {
    id: raw.id,
    image_url: publicUrl,
    options: opts,
    correct_answer: raw.correct_answer,
    category_id: raw.category_id,
    difficulty_level_id: raw.difficulty_level_id,
  };
}

/** Публичный вариант — БЕЗ correct_answer (для анонимов) */
export async function getDailyQuestionPublic(
  dateOverride?: string,
): Promise<Question> {
  const pDate = dateOverride ?? getDailyDateUS();

  const { data, error } = await supabase.rpc("get_daily_question_public", {
    p_date: pDate,
  });
  if (error) throw error;

  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) throw new Error("no-daily-question");

  const raw = rows[0] as {
    id: number;
    image_url: string;
    options_json: unknown;
    category_id: number;
    difficulty_level_id: number;
  };

  const key = raw.image_url.replace(/^\/?posters\//, "");
  const { data: urlData } = supabase.storage.from("movies").getPublicUrl(key);
  const publicUrl = urlData?.publicUrl ?? raw.image_url;

  let opts: string[] = [];
  if (Array.isArray(raw.options_json)) {
    opts = raw.options_json as string[];
  } else {
    try {
      opts = JSON.parse(raw.options_json as any);
    } catch {
      opts = [];
    }
  }

  return {
    id: raw.id,
    image_url: publicUrl,
    options: opts,
    correct_answer: "",
    category_id: raw.category_id,
    difficulty_level_id: raw.difficulty_level_id,
  };
}

/* ────────────────────────────────────────────────────────────
   DAILY: серверные RPC
───────────────────────────────────────────────────────────── */

/** фиксируем старт на сервере (для серверного таймера) */
export async function startDailySession(userId: string, date?: string) {
  const { data, error } = await supabase.rpc("start_daily_session", {
    p_user_id: userId,
    p_date: date ?? getDailyDateUS(),
  });
  if (error) throw error;
  return data as string | null; // timestamptz в строке
}

/** отправка результата дня (сервер сам посчитает time_spent) */
export async function submitDailyResult(
  userId: string,
  date: string,
  isCorrect: boolean,
  timeSpentSecs: number, // оставим для бэкапа, но на сервере он игнорируется
) {
  const { data, error } = await supabase.rpc("submit_daily_result", {
    p_user_id: userId,
    p_date: date,
    p_is_correct: isCorrect,
    p_time: timeSpentSecs,
  });
  if (error) throw error;
  return data;
}

/** мой статус по дню (играл ли/результат) */
export async function getMyDailyResult(
  userId: string,
  date?: string,
): Promise<MyDailyResult> {
  const { data, error } = await supabase.rpc("get_my_daily_result", {
    p_user_id: userId,
    p_date: date ?? getDailyDateUS(),
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  const raw = rows[0] as Partial<MyDailyResult> | undefined;
  return {
    is_answered: !!raw?.is_answered,
    is_correct: raw?.is_correct ?? null,
    time_spent: raw?.time_spent ?? null,
    answered_at: raw?.answered_at ?? null,
  };
}

/* ────────────────────────────────────────────────────────────
   FASTEST
───────────────────────────────────────────────────────────── */
export async function getDailyFastest(
  date?: string,
  limit = 5,
): Promise<DailyFastestRow[]> {
  const { data, error } = await supabase.rpc("get_daily_fastest", {
    p_date: date ?? getDailyDateUS(),
    p_limit: limit,
  });
  if (error) throw error;
  return (data || []) as DailyFastestRow[];
}

/* ────────────────────────────────────────────────────────────
   ANSWER CHECK (обычная игра)
───────────────────────────────────────────────────────────── */
export async function checkAnswer(
  questionId: number,
  answer: string,
): Promise<{ correct: boolean; correct_answer: string }> {
  const { data, error } = await supabase
    .from<{ correct_answer: string }>("question")
    .select("correct_answer")
    .eq("id", questionId)
    .single();

  if (error) throw error;

  const correct = data.correct_answer.trim() === answer.trim();
  return { correct, correct_answer: data.correct_answer };
}

/* ────────────────────────────────────────────────────────────
   PROFILE HELPERS
───────────────────────────────────────────────────────────── */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, nickname, avatar_url, created_at")
    .eq("user_id", userId)
    .single();
  if (error && (error as any).code !== "PGRST116") throw error; // 116 = no rows
  return data;
}

export async function upsertProfile(
  userId: string,
  nickname: string,
  avatarUrl?: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, nickname, avatar_url: avatarUrl })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* --- CHECK NICKNAME --------------------------------------------------- */
export async function isNicknameTaken(nick: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_nickname_taken", {
    p_nick: nick,
  });
  if (error) throw error;
  return !!data;
}

/* --- COUNT QUESTIONS for category + difficulty ------------------------ */
export async function countQuestions(
  categoryId: number,
  difficultyId: number,
): Promise<number> {
  const { count, error } = await supabase
    .from("question")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("difficulty_level_id", difficultyId);

  if (error) throw error;
  return count ?? 0;
}
