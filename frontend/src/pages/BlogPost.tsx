// src/pages/BlogPost.tsx
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import Seo from "../components/Seo";
import { getPostBySlug, posts, getRelatedPosts } from "../blog";
import CollageCover from "../blog/components/CollageCover";
import { GalleryProvider } from "../blog/components/GalleryCollector";

const ORIGIN = "https://hard-quiz.com";

export default function BlogPostPage() {
  const { slug = "" } = useParams();
  const post = getPostBySlug(slug);
  const [autoGallery, setAutoGallery] = useState<string[]>([]);

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl">
        <Seo title="Post not found | Hard Quiz" noindex />
        <h1 className="mb-2 text-2xl font-bold">Post not found</h1>
        <p className="mb-4 opacity-80">
          We couldn't find that article. It may have been moved or renamed.
        </p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          ← Back to blog
        </Link>
      </div>
    );
  }

  // Похожие — по тегам, фоллбек на последние
  const others = getRelatedPosts(post, 3);

  // приоритет: gallery-коллаж → coverUrl → фоллбек
  const imagesForCollage =
    post.gallery && post.gallery.length > 0 ? post.gallery : autoGallery;
  const canCollage = imagesForCollage.length > 0;

  // OG image и абсолютные URL
  const ogImage = post.coverUrl || (post.gallery?.[0] ?? undefined);
  const url = `${ORIGIN}/blog/${post.slug}`;

  // JSON-LD: Article + BreadcrumbList
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || "",
    image: ogImage ? [ogImage] : undefined,
    datePublished: new Date(post.date).toISOString(),
    dateModified: new Date(post.date).toISOString(),
    author: { "@type": "Person", name: "Hard Quiz Team" },
    publisher: {
      "@type": "Organization",
      name: "Hard Quiz",
      logo: {
        "@type": "ImageObject",
        url: `${ORIGIN}/icons/icon-512.png`,
      },
    },
    mainEntityOfPage: url,
  };

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${ORIGIN}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <Seo
        title={`${post.title} | Hard Quiz`}
        description={post.excerpt}
        ogImage={ogImage}
        type="article"
        url={url}
        jsonLd={[articleJsonLd, breadcrumbsJsonLd]}
      />

      <article className="mx-auto max-w-3xl">
        {/* Top back button */}
        <nav className="mb-3" aria-label="Back">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            ← Back to blog
          </Link>
        </nav>

        <h1 className="mb-2 text-3xl font-bold">{post.title}</h1>
        <div className="mb-4 flex items-center gap-3 text-sm opacity-75">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString()}
          </time>
          <span>•</span>
          {post.readingMinutes ? (
            <span>{post.readingMinutes} min read</span>
          ) : (
            <span>Article</span>
          )}
          {post.tags?.length ? (
            <>
              <span>•</span>
              <div className="flex gap-2">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/15 px-2 py-0.5 text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* HERO cover: collage → explicit cover → fallback */}
        {canCollage ? (
          <CollageCover images={imagesForCollage} className="mb-6" />
        ) : post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            className="mb-6 aspect-video w-full rounded-2xl border border-white/10 object-cover"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <div className="mb-6 aspect-video w-full rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/50 to-purple-900/40" />
        )}

        {/* Content wrapped in GalleryProvider to auto-collect poster URLs */}
        <GalleryProvider onChange={setAutoGallery}>
          <div className="prose prose-invert max-w-none">{post.content()}</div>
        </GalleryProvider>

        {/* CTA */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-2 font-semibold">Try a quick round</h3>
          <p className="mb-3 opacity-80">
            Pick any category and difficulty on the homepage and hit Play. Good luck!
          </p>
          <Link to="/" className="btn-primary inline-block">
            Play now
          </Link>
        </div>

        {/* Bottom back button */}
        <div className="mt-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            ← Back to blog
          </Link>
        </div>

        {/* More */}
        {others.length > 0 && (
          <section className="mt-10">
            <h3 className="mb-3 text-lg font-semibold">More like this</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  to={`/blog/${o.slug}`}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="mb-2 text-xs opacity-70">
                    {new Date(o.date).toLocaleDateString()}
                    {o.readingMinutes ? ` • ${o.readingMinutes} min` : null}
                  </div>
                  <div className="font-medium">{o.title}</div>
                  <div className="text-sm opacity-75 line-clamp-2">
                    {o.excerpt}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
