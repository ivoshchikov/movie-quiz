import { supabase } from "../supabase";

export interface VisitorStats {
  online: number;
  today: number;
  week: number;
  month: number;
  date: string;
  since: string;
  updated_at: string;
  timezone: "America/Chicago";
}
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const timestamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));

export async function loadVisitorStats(owner: string, signal: AbortSignal): Promise<VisitorStats> {
  const { data, error } = await supabase.rpc("admin_visitor_stats", { p_expected_owner: owner }).abortSignal(signal);
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) ||
    ![data.online, data.today, data.week, data.month].every(count) ||
    data.today > data.week || data.week > data.month || data.online > data.month ||
    !timestamp(data.since) || !timestamp(data.updated_at) || Date.parse(data.since) > Date.parse(data.updated_at) ||
    typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    data.timezone !== "America/Chicago") throw new Error("Invalid visitor statistics");
  return data as VisitorStats;
}
