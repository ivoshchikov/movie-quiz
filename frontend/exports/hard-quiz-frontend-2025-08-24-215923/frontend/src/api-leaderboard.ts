// src/api-leaderboard.ts
import { supabase } from "./supabase";

export interface LeaderboardRow {
  nickname: string | null;
  best_score: number;
  best_time: number; // seconds
  updated_at?: string;
}

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
  return (data ?? []) as LeaderboardRow[];
}
