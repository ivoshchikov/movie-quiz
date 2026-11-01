import { supabase } from "../supabase";

export interface PageViewStats {
  hours24: number;
  days7: number;
  days30: number;
  since: string;
  updated_at: string;
}
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const timestamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));

export async function loadPageViewStats(owner: string, signal: AbortSignal): Promise<PageViewStats> {
  const { data, error } = await supabase.rpc("admin_page_view_stats", { p_expected_owner: owner }).abortSignal(signal);
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) ||
    ![data.hours24, data.days7, data.days30].every(count) ||
    data.hours24 > data.days7 || data.days7 > data.days30 ||
    !timestamp(data.since) || !timestamp(data.updated_at) || Date.parse(data.since) > Date.parse(data.updated_at)) {
    throw new Error("Invalid page view statistics");
  }
  return data as PageViewStats;
}
