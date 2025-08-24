import { createClient } from "@supabase/supabase-js";

/*  ─── конфигурация из .env ─────────────────────────────── */
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const BUCKET        = import.meta.env.VITE_SUPABASE_BUCKET!;   // "movies"

/*  ─── клиент ────────────────────────────────────────────── */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

/**
 * Собирает публичный URL для объекта в бакете `movies`.
 *
 *  • Если filePath уже абсолютный URL → возвращаем как есть.  
 *  • Иначе считаем, что это относительный путь внутри бакета
 *    (может включать подпапку, например "general/g_00001.webp").
 */
export function getPublicUrl(filePath: string): string {
  if (/^https?:\/\//.test(filePath)) return filePath;   // уже полный URL

  const cleanPath = filePath.replace(/^\/+/, "");       // убираем ведущие /
  const base      = SUPABASE_URL.replace(/\/$/, "");    // без завершающего /
  return `${base}/storage/v1/object/public/${BUCKET}/${cleanPath}`;
}
