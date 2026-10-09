import type { BlogPost } from "./types";
import { TOPICS, type TopicKey } from "./topics";
import metadata from "../blogMetadata.json";

export type BlogTopic = "all" | TopicKey;

export function getBlogTopic(search: string): BlogTopic {
  const key = new URLSearchParams(search).get("topic");
  return TOPICS.find(topic => topic.key === key)?.key ?? "all";
}

export function blogTopicUrl(topic: BlogTopic): string {
  return topic === "all" ? "/blog" : `/blog?topic=${topic}`;
}

/** Only a known blog filter can become an article's return destination. */
export function blogReturnUrl(state: unknown): string {
  if (!state || typeof state !== "object" || !("blogReturn" in state) || typeof state.blogReturn !== "string") return "/blog";
  try {
    const url = new URL(state.blogReturn, metadata.url);
    if (url.origin !== new URL(metadata.url).origin || !["/blog", "/blog/"].includes(url.pathname)) return "/blog";
    return blogTopicUrl(getBlogTopic(url.search));
  } catch { return "/blog"; }
}

export function validBlogDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function formatBlogDate(value: string): string {
  return validBlogDate(value)
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
    : "Date unavailable";
}

export function readingEstimate(minutes: number | undefined): string | undefined {
  return minutes !== undefined && Number.isInteger(minutes) && minutes > 0 ? `~${minutes} min read` : undefined;
}

export function sortBlogPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const left = validBlogDate(a.date) ? a.date : "";
    const right = validBlogDate(b.date) ? b.date : "";
    return right.localeCompare(left) || a.slug.localeCompare(b.slug);
  });
}

export function primaryTopic(post: BlogPost) {
  return TOPICS.find(topic => post.tags.includes(topic.label));
}

export function listingImages(post: BlogPost): string[] {
  return [...new Set([post.listingCoverUrl, post.coverUrl, ...(post.gallery ?? [])].filter((value): value is string => {
    if (!value) return false;
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }))];
}

/** Build-time content checks stop malformed entries from reaching production. */
export function validateBlogPosts(posts: BlogPost[]): void {
  const slugs = new Set<string>();
  for (const post of posts) {
    const fail = (reason: string) => { throw new Error(`Invalid blog post ${post.slug}: ${reason}`); };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || slugs.has(post.slug)) fail("invalid or duplicate slug");
    slugs.add(post.slug);
    if (!post.title.trim() || !post.excerpt.trim()) fail("title and excerpt are required");
    if (!validBlogDate(post.date)) fail("date must be a real YYYY-MM-DD calendar date");
    if (post.modified && (!validBlogDate(post.modified) || post.modified < post.date)) fail("modified must be a real date on or after publication");
    if (!primaryTopic(post)) fail("a canonical topic is required");
    if (post.readingMinutes !== undefined && !readingEstimate(post.readingMinutes)) fail("readingMinutes must be a positive integer");
    if (post.archiveYear !== undefined && (!Number.isInteger(post.archiveYear) || post.archiveYear < 1900 || post.archiveYear > Number(post.date.slice(0, 4)))) fail("invalid archive year");
    for (const image of [post.listingCoverUrl, post.coverUrl, ...(post.gallery ?? [])]) {
      if (image && !listingImages({ ...post, listingCoverUrl: image, coverUrl: undefined, gallery: [] }).length) fail("image must be an absolute HTTPS URL");
    }
    const ids = new Set<string>();
    for (const item of post.contents ?? []) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id) || !item.label.trim()) fail("invalid or duplicate contents item");
      ids.add(item.id);
    }
    for (const source of post.sources ?? []) {
      let valid = false;
      try { valid = new URL(source.url).protocol === "https:" && !!source.label.trim(); } catch { /* checked below */ }
      if (!valid) fail("sources need a label and an absolute HTTPS URL");
    }
  }
}

/** Shared by the browser and the generated first HTTP response. */
export function articleMetadata(post: BlogPost) {
  const origin = new URL(metadata.url).origin;
  const params = new URLSearchParams({ title: post.title, date: post.date });
  return {
    title: `${post.title} | Hard Quiz`, description: post.excerpt,
    url: `${origin}/blog/${post.slug}`, image: `${origin}/api/og/post?${params}`,
  };
}

export function articleJsonLd(post: BlogPost) {
  const meta = articleMetadata(post);
  return {
    "@context": "https://schema.org", "@type": "BlogPosting",
    "@id": `${meta.url}#article`, url: meta.url, headline: post.title,
    description: post.excerpt, inLanguage: "en",
    mainEntityOfPage: { "@type": "WebPage", "@id": meta.url },
    ...(validBlogDate(post.date) ? { datePublished: post.date } : {}),
    ...(post.modified && validBlogDate(post.modified) ? { dateModified: post.modified } : {}),
    ...(listingImages(post)[0] ? { image: listingImages(post)[0] } : {}),
    articleSection: primaryTopic(post)?.shortLabel,
    publisher: { "@type": "Organization", name: "Hard Quiz", url: new URL(metadata.url).origin },
  };
}

export function blogCollectionJsonLd(posts: BlogPost[]) {
  const origin = new URL(metadata.url).origin;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": metadata.url,
    name: "Hard Quiz Blog",
    description: metadata.description,
    url: metadata.url,
    inLanguage: "en",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: posts.length,
      itemListElement: sortBlogPosts(posts).map((post, index) => ({
        "@type": "ListItem", position: index + 1,
        item: {
          "@type": "BlogPosting", headline: post.title, description: post.excerpt,
          ...(validBlogDate(post.date) ? { datePublished: post.date } : {}),
          ...(listingImages(post)[0] ? { image: listingImages(post)[0] } : {}),
          url: `${origin}/blog/${post.slug}`,
        },
      })),
    },
  };
}
