// src/blog/index.ts
import type { BlogPost } from "./types";

// Единственный пост на сейчас
import august2025Movies from "./entries/august-2025-new-movies";

export const posts: BlogPost[] = [august2025Movies];

export const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

export function getPostBySlug(slug: string) {
  return posts.find((p) => p.slug === slug);
}

/**
 * Подбор «Похожих» по общим тегам (а не просто последние).
 * При равенстве — более новые выше.
 */
export function getRelatedPosts(base: BlogPost, limit = 3): BlogPost[] {
  const baseTags = new Set(base.tags || []);
  const scored = posts
    .filter((p) => p.slug !== base.slug)
    .map((p) => {
      const overlap =
        (p.tags || []).reduce((acc, t) => acc + (baseTags.has(t) ? 1 : 0), 0) || 0;
      return { p, overlap };
    })
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return +new Date(b.p.date) - +new Date(a.p.date);
    })
    .slice(0, limit)
    .map((x) => x.p);

  // Фоллбек: если нет пересечений, просто последние
  if (scored.length === 0) {
    return posts
      .filter((p) => p.slug !== base.slug)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, limit);
  }
  return scored;
}
