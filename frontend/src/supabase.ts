import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const BUCKET        = import.meta.env.VITE_SUPABASE_BUCKET!;            // "movies"
const DEF_DIR       = (import.meta.env.VITE_SUPABASE_FOLDER_GENERAL || "general").replace(/^\/|\/$/g, "");

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

/** Публичный URL для файла в бакете. Добавляем дефолтную папку, если путь — просто имя. */
export function getPublicUrl(filePath: string): string {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;

  let p = String(filePath).replace(/^\/+/, "").replace(/^posters\//i, "");
  if (!p.includes("/") && DEF_DIR) p = `${DEF_DIR}/${p}`;

  const base = SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${p}`;
}
