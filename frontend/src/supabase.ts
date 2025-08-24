import { createClient } from "@supabase/supabase-js";

/*  ─── конфигурация из .env ─────────────────────────────── */
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// bucket c безопасным дефолтом "movies"
let BUCKET = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined)?.trim();
BUCKET = (BUCKET && BUCKET.replace(/^\/+|\/+$/g, "")) || "movies"; // <-- fallback

/*  ─── клиент ────────────────────────────────────────────── */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

/**
 * Собирает публичный URL для объекта в бакете.
 * Если filePath уже абсолютный URL → возвращаем как есть.
 */
export function getPublicUrl(filePath: string): string {
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const cleanPath = String(filePath || "").replace(/^\/+/, ""); // убираем ведущие /
  const base      = SUPABASE_URL.replace(/\/$/, "");            // без завершающего /
  return `${base}/storage/v1/object/public/${BUCKET}/${cleanPath}`;
}
