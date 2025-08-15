// src/blog/topics.ts

/**
 * Темы (категории) для фильтра на /blog.
 * ВАЖНО: BlogIndex.tsx фильтрует посты по тому, что в post.tags есть label темы.
 * Поэтому label темы = канонический тег, который ОБЯЗАТЕЛЬНО должен стоять у постов этой темы.
 */
export const TOPICS = [
  { key: "quizzes",    label: "Stills & Faces" },            // Квизы по кадрам/лицам
  { key: "streaming",  label: "Streaming & New Releases" },  // Ежемесячные новинки (кино + при желании стриминг)
  { key: "explainers", label: "Explainers & Trivia" },       // Объяснялки/разборы/факты
] as const;

export type TopicKey = typeof TOPICS[number]["key"];

// Удобная мапа key → label (используется BlogIndex)
export const TopicLabels: Record<TopicKey, string> = TOPICS.reduce(
  (acc, t) => {
    acc[t.key] = t.label;
    return acc;
  },
  {} as Record<TopicKey, string>,
);

/* ──────────────────────────────────────────────────────────────
   ФИКСИРОВАННЫЙ СПИСОК ТЕГОВ (опционально, но рекомендуется)
   Минимум один тег у поста должен быть из TopicLabels[*].
   Остальные — уточняющие (десятилетия/жанры/персоны/аспекты).
   Эти экспорты ни на что сейчас не влияют, но дают общий словарь.
   ────────────────────────────────────────────────────────────── */

export const TAGS = [
  // Топиковые (по одному обязателен у поста)
  "Stills & Faces",
  "Streaming & New Releases",
  "Explainers & Trivia",

  // Десятилетия
  "1970s", "1980s", "1990s", "2000s", "2010s", "2020s",

  // Жанры
  "Horror", "Sci-Fi", "Comedy", "Action", "Animation", "Drama", "Thriller",

  // Персоны/направления
  "Actors", "Actresses",
  "Nolan", "Tarantino", "Pixar", "Ghibli", "Marvel", "A24",

  // Визуальные аспекты (для Explainers)
  "Color Grading", "Aspect Ratio", "Production Design", "Costumes", "Lighting",
] as const;

export type Tag = typeof TAGS[number];

/**
 * Алиасы для совместимости (полезно при миграции/опечатках).
 */
export const TAG_ALIASES: Record<string, Tag> = {
  "Stills Quiz": "Stills & Faces",
  "Poster Quiz": "Stills & Faces",
  "Explainer": "Explainers & Trivia",
  "Explainers": "Explainers & Trivia",
  "Sci-Fi": "Sci-Fi", // унификация дефиса — пример
};

/** Проверка в белом списке */
export function isValidTag(x: string): x is Tag {
  return (TAGS as readonly string[]).includes(x);
}

/** Нормализация: алиасы → каноника, уникализация, фильтр мусора */
export function normalizeTags(input: string[] | undefined): Tag[] {
  if (!input || input.length === 0) return [];
  const out = new Set<Tag>();
  for (const raw of input) {
    const mapped = (TAG_ALIASES as Record<string, string>)[raw] ?? raw;
    if (isValidTag(mapped)) out.add(mapped as Tag);
  }
  return Array.from(out);
}

/** Жёсткая проверка (для CI/дев), можно не вызывать */
export function assertValidTags(input: string[] | undefined, ctx?: string): void {
  if (!input) return;
  const invalid = input
    .map((t) => (TAG_ALIASES as Record<string, string>)[t] ?? t)
    .filter((t) => !isValidTag(t as Tag));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid tag(s) ${ctx ? `in ${ctx}` : ""}: ${invalid.join(", ")}. ` +
      `Allowed tags: ${TAGS.join(", ")}`
    );
  }
}
