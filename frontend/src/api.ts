// frontend/src/api.ts
import { supabase } from "./supabaseClient";

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

/* ⬇⬇⬇  NEW: строка из таблицы user_best  */
export interface UserBestRow {
  user_id: string;
  category_id: number;
  difficulty_level_id: number;
  best_score: number;
  best_time: number;
  updated_at: string;
}

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
   USER BEST RESULTS  (NEW)
───────────────────────────────────────────────────────────── */
/** Возвращает ВСЕ best-результаты текущего авторизованного пользователя.  
 *  RLS-политика в БД уже ограничивает выборку «только мои строки». */
export async function getMyBest(): Promise<UserBestRow[]> {
  const { data, error } = await supabase
    .from<UserBestRow>("user_best")
    .select(
      "user_id, category_id, difficulty_level_id, best_score, best_time, updated_at",
    )
    .order("best_score", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/* ────────────────────────────────────────────────────────────
   QUESTIONS
───────────────────────────────────────────────────────────── */
export async function getQuestion(
  exclude: number[] = [],
  categoryId?: number,
  difficultyId?: number,
): Promise<Question> {
  /* 1️⃣ — выбираем подходящие строки */
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

  /* 2️⃣ — случайный вопрос */
  const raw = all[Math.floor(Math.random() * all.length)];

  /* 3️⃣ — конвертируем путь к изображению в public-URL */
  const key = raw.image_url.replace(/^\/?posters\//, "");
  const { data: urlData, error: urlError } = supabase.storage
    .from("movies")
    .getPublicUrl(key);

  if (urlError) console.error("Failed to get publicUrl for", raw.image_url, urlError);
  const publicUrl = urlData?.publicUrl ?? raw.image_url;

  /* 4️⃣ — парсим options_json */
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
   ANSWER CHECK
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
   PROFILE HELPERS  (unchanged)
───────────────────────────────────────────────────────────── */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, nickname, avatar_url, created_at")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // 116 = no rows
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
