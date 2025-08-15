// src/pages/BlogIndex.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { posts } from "../blog";
import { TOPICS, TopicKey, TopicLabels } from "../blog/topics";
import CollageCover from "../blog/components/CollageCover";

const ORIGIN = "https://hard-quiz.com";

export default function BlogIndex() {
  const [topic, setTopic] = useState<"all" | TopicKey>("all");

  const list = useMemo(() => {
    const sorted = [...posts].sort(
      (a, b) => +new Date(b.date) - +new Date(a.date),
    );
    if (topic === "all") return sorted;

    const label = TopicLabels[topic];
    return sorted.filter((p) => p.tags?.includes(label));
  }, [topic]);

  const chipCls = (active: boolean) =>
    [
      "px-3 py-1.5 rounded-full text-sm border transition",
      active
        ? "bg-indigo-600 border-indigo-600 text-white"
        : "border-gray-600 hover:border-indigo-400",
    ].join(" ");

  // JSON-LD: Blog/CollectionPage + ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Hard Quiz — Blog",
    url: `${ORIGIN}/blog`,
    hasPart: list.slice(0, 12).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      datePublished: new Date(p.date).toISOString(),
      image: p.coverUrl || (p.gallery?.[0] ?? undefined),
      url: `${ORIGIN}/blog/${p.slug}`,
    })),
  };

  return (
    <>
      <Seo
        title="Hard Quiz Blog — Movie Poster Quizzes, Tips & New Releases"
        description="Discoveries to watch now, behind-the-scenes facts, quick craft lessons, and curated lists — the Hard Quiz blog."
        url={`${ORIGIN}/blog`}
        jsonLd={jsonLd}
      />
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="opacity-75">
            Discoveries to watch now, behind-the-scenes facts, quick craft lessons, and curated lists.
          </p>
        </header>

        {/* Fixed topic filter */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <button className={chipCls(topic === "all")} onClick={() => setTopic("all")}>
            All
          </button>
          {TOPICS.map((t) => (
            <button
              key={t.key}
              className={chipCls(topic === t.key)}
              onClick={() => setTopic(t.key)}
              title={t.label}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const canCollage = Array.isArray(p.gallery) && p.gallery.length > 0;
            return (
              <article
                key={p.slug}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm transition-shadow hover:bg-white/10 hover:shadow-md"
              >
                {/* cover priority: gallery-collage → explicit cover → gradient */}
                {canCollage ? (
                  <CollageCover images={p.gallery!} variant="plain" />
                ) : p.coverUrl ? (
                  <img
                    src={p.coverUrl}
                    alt={p.title}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-indigo-900/50 to-purple-900/40" />
                )}

                <div className="p-4">
                  {p.tags?.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {p.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-80"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="mb-1 line-clamp-2 text-lg font-semibold">
                    <Link to={`/blog/${p.slug}`}>{p.title}</Link>
                  </h2>
                  <p className="line-clamp-3 text-sm opacity-80">{p.excerpt}</p>
                  <div className="mt-3 flex items-center justify-between text-xs opacity-70">
                    <time dateTime={p.date}>
                      {new Date(p.date).toLocaleDateString()}
                    </time>
                    {p.readingMinutes ? (
                      <span>{p.readingMinutes} min read</span>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {list.length === 0 && (
          <p className="mt-10 text-center opacity-70">
            No posts in this topic yet — check back soon.
          </p>
        )}
      </div>
    </>
  );
}
