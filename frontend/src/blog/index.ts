// src/blog/index.ts
import type { BlogPost } from "./types";

// Единственный пост на сейчас
import august2025Movies from "./entries/august-2025-new-movies";

export const posts: BlogPost[] = [
  august2025Movies,
];

export const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

export function getPostBySlug(slug: string) {
  return posts.find((p) => p.slug === slug);
}
