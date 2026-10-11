import { Link, useLocation, useParams } from "react-router-dom";
import Seo from "../components/Seo";
import { getPostBySlug, getRelatedPosts, posts } from "../blog";
import { GalleryProvider } from "../blog/components/GalleryCollector";
import { articleJsonLd, articleMetadata, blogReturnUrl, blogTopicUrl, formatBlogDate, primaryTopic, readingEstimate, sortBlogPosts, validBlogDate } from "../blog/presentation";
import "../blog-article.css";
import NotFound from "../components/NotFound";

export default function BlogPostPage() {
  const { slug = "" } = useParams();
  const { state } = useLocation();
  const backToBlog = blogReturnUrl(state);
  const post = getPostBySlug(slug);

  if (!post) return <NotFound article blogReturn={backToBlog} />;

  const meta = articleMetadata(post);
  const topic = primaryTopic(post);
  const related = getRelatedPosts(post, 2);
  const others = related.length ? related : sortBlogPosts(posts.filter(item => item.slug !== slug)).slice(0, 2);
  const tags = post.tags.filter(tag => tag !== topic?.label);

  return <>
    <Seo title={meta.title} description={meta.description} ogImage={meta.image} type="article" url={meta.url} canonical={meta.url} jsonLd={articleJsonLd(post)} />
    <article className="hq-article" key={post.slug}>
      <Link to={backToBlog} className="hq-article-back">← Back to blog</Link>
      <header className="hq-article-header">
        {topic && <Link to={blogTopicUrl(topic.key)} className="hq-article-topic">{topic.shortLabel}</Link>}
        <h1>{post.title}</h1>
        <div className="hq-article-meta">
          <span>Published <time dateTime={validBlogDate(post.date) ? post.date : undefined}>{formatBlogDate(post.date)}</time></span>
          {readingEstimate(post.readingMinutes) && <span>{readingEstimate(post.readingMinutes)}</span>}
          {post.modified && <span>Updated <time dateTime={post.modified}>{formatBlogDate(post.modified)}</time></span>}
        </div>
      </header>
      {post.archiveYear && <aside className="hq-article-archive" aria-label="Archive notice">
        <strong>{post.archiveYear} archive · US theatrical releases</strong>
        <p>This guide covers selected releases from {post.archiveYear}. Dates are historical; current cinema and streaming availability may differ by country.</p>
      </aside>}
      {!!post.contents?.length && <nav className="hq-article-contents" aria-label="Article contents">
        <details><summary>On this page</summary><ol>{post.contents.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol></details>
      </nav>}
      <GalleryProvider key={post.slug}>
        <div className="hq-article-prose">{post.content()}</div>
      </GalleryProvider>
      {!!post.sources?.length && <section className="hq-article-sources" aria-labelledby="sources">
        <h2 id="sources" tabIndex={-1}>Sources</h2>
        <p>Film references, reviews and technical sources used for this article.</p>
        <ul>{post.sources.map(source => <li key={source.url}><a href={source.url}>{source.label}<span aria-hidden="true"> ↗</span></a></li>)}</ul>
      </section>}
      {!!tags.length && <div className="hq-article-tags" aria-label="Article tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
      {!!others.length && <section className="hq-article-more" aria-labelledby="more-articles">
        <h2 id="more-articles">{related.length ? "Related articles" : "More articles"}</h2>
        <div className="hq-article-more-grid">{others.map(item => <Link key={item.slug} to={`/blog/${item.slug}`} state={{ blogReturn: backToBlog }} className="hq-article-card">
          <span className="hq-article-card-meta">{primaryTopic(item)?.shortLabel} · {formatBlogDate(item.date)}{readingEstimate(item.readingMinutes) ? ` · ${readingEstimate(item.readingMinutes)}` : ""}</span>
          <h3>{item.title}</h3><p>{item.excerpt}</p>
        </Link>)}</div>
      </section>}
      <section className="hq-article-cta" aria-labelledby="quiz-next">
        <div><h2 id="quiz-next">Put your movie knowledge to the test</h2><p>Choose a quiz and difficulty, or explore today's Daily challenge. Movie quizzes are open to guests. Daily requires an account.</p></div>
        <div className="hq-article-actions"><Link to="/" className="hq-primary">Choose a quiz</Link><Link to="/daily" className="hq-secondary">Try Daily</Link></div>
      </section>
      <Link to={backToBlog} className="hq-article-back">← Back to blog</Link>
    </article>
  </>;
}
