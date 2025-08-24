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

/* ⬇⬇⬇  NEW: строка из таблицы user_best  */
export interface UserBestRow {
  user_id: string;
  category_id: number;
  difficulty_level_id: number;
  best_score: number;
  best_time: number;
  updated_at: string;
}

/* ⬇⬇⬇  NEW: строка глобального лидерборда (RPC get_leaderboard) */
export type LeaderboardRow = {
  nickname: string;      // из profiles.nickname или 'Anonymous'
  best_score: number;    // int
  best_time: number;     // int (секунды)
  updated_at: string;    // timestamptz → ISO строка
};

/* ⬇⬇⬇  NEW: строка «самые быстрые сегодня» для /daily */
export type DailyFastestRow = {
  nickname: string;
  time_spent: number;
  answered_at: string;
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
   GLOBAL LEADERBOARD (RPC: public.get_leaderboard)
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
   QUESTIONS
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
   DAILY QUESTION (RPC: public.get_daily_question)
   День начинается по US Central Time (America/Chicago)
───────────────────────────────────────────────────────────── */

/** YYYY-MM-DD в указанной таймзоне (по умолчанию America/Chicago) */
export function getDailyDateUS(tz = "America/Chicago"): string {
  // en-CA даёт ISO-подобный формат 'YYYY-MM-DD'
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Получить/зафиксировать «вопрос дня» на дату в US Central (или на переданную дату) */
export async function getDailyQuestion(dateOverride?: string): Promise<Question> {
  const pDate = dateOverride ?? getDailyDateUS();

  const { data, error } = await supabase.rpc("get_daily_question", {
    p_date: pDate,
  });
  if (error) throw error;

  const raw = data as {
    id: number;
    image_url: string;
    options_json: unknown;
    correct_answer: string;
    category_id: number;
    difficulty_level_id: number;
  };

  // как и в getQuestion(): преобразуем путь к публичному URL из бакета
  const key = raw.image_url.replace(/^\/?posters\//, "");
  const { data: urlData } = supabase.storage.from("movies").getPublicUrl(key);
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

/* ⬇⬇⬇ NEW: отправка результата дня */
export async function submitDailyResult(
  userId: string,
  date: string,          // 'YYYY-MM-DD' — см. getDailyDateUS()
  isCorrect: boolean,
  timeSpentSecs: number,
) {
  const { data, error } = await supabase.rpc("upsert_daily_result", {
    p_user_id: userId,
    p_date: date,
    p_is_correct: isCorrect,
    p_time: timeSpentSecs,
  });
  if (error) throw error;
  return data;
}

/* ⬇⬇⬇ NEW: топ-5 самых быстрых за сегодня (или указанную дату) */
export async function getDailyFastest(date?: string, limit = 5): Promise<DailyFastestRow[]> {
  const { data, error } = await supabase.rpc("get_daily_fastest", {
    p_date: date ?? getDailyDateUS(),
    p_limit: limit,
  });
  if (error) throw error;
  return (data || []) as DailyFastestRow[];
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
