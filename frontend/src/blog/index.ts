// src/blog/index.ts
import type { BlogPost } from "./types";
import { estimateReadingMinutes } from "./reading";

// Посты
import september2025Movies from "./entries/september-2025-new-movies"; // ← NEW
import august2025Movies    from "./entries/august-2025-new-movies";
import why239              from "./entries/why-2-39-feels-more-cinematic";

export const posts: BlogPost[] = [
  // Самый свежий — сверху (в любом случае список на /blog сортируется по дате)
  september2025Movies,
  august2025Movies,
  why239,
].map(post => ({ ...post, readingMinutes: estimateReadingMinutes(post.content()) }));

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
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return +new Date(b.p.date) - +new Date(a.p.date);
    })
    .slice(0, limit)
    .map((x) => x.p);

  return scored;
}
