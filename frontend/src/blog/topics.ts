// src/blog/topics.ts
export const TOPICS = [
  { key: "streaming",   label: "Streaming & New Releases" },
  { key: "film-facts",  label: "Film Facts & Behind-the-Scenes" },
  { key: "actors",      label: "Actor Spotlights & Casting" },
  { key: "film-school", label: "Mini Film School" },
  { key: "movie-lists", label: "Curated Movie Lists" },
  { key: "tv-lists",    label: "Curated TV Lists" },
] as const;

export type TopicKey = typeof TOPICS[number]["key"];

// Удобная мапа key → label
export const TopicLabels: Record<TopicKey, string> = TOPICS.reduce(
  (acc, t) => {
    acc[t.key] = t.label;
    return acc;
  },
  {} as Record<TopicKey, string>,
);
