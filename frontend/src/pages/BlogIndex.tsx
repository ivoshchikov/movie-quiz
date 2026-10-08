import { Link, useSearchParams } from "react-router-dom";
import Seo from "../components/Seo";
import { posts } from "../blog";
import { TOPICS } from "../blog/topics";
import { blogCollectionJsonLd, blogTopicUrl, formatBlogDate, getBlogTopic, listingImages, primaryTopic, readingEstimate, sortBlogPosts, type BlogTopic } from "../blog/presentation";
import ListingCover from "../blog/components/ListingCover";
import metadata from "../blogMetadata.json";
import "../blog-index.css";

export default function BlogIndex() {
  const [params, setParams] = useSearchParams();
  const topic = getBlogTopic(params.toString());
  const sorted = sortBlogPosts(posts);
  const available = TOPICS.map(item => ({ ...item, count: posts.filter(post => post.tags.includes(item.label)).length })).filter(item => item.count > 0);
  const selected = TOPICS.find(item => item.key === topic);
  const list = selected ? sorted.filter(post => post.tags.includes(selected.label)) : sorted;
  const chooseTopic = (value: BlogTopic) => {
    if (value === topic && params.get("topic") === (value === "all" ? null : value)) return;
    const next = new URLSearchParams(params);
    if (value === "all") next.delete("topic"); else next.set("topic", value);
    setParams(next);
  };

  return <>
    <Seo title={metadata.title} description={metadata.description} ogImage={metadata.image} url={metadata.url} jsonLd={blogCollectionJsonLd(posts)} />
    <div className="hq-blog">
      <header className="hq-blog-intro"><h1>Blog</h1><p>{metadata.intro}</p></header>
      <div className="hq-blog-toolbar">
        <div className="hq-blog-topics" role="group" aria-label="Article topics">
          <button type="button" className="hq-blog-topic" aria-label={`All, ${posts.length} articles`} aria-pressed={topic === "all"} onClick={() => chooseTopic("all")}>All <span aria-hidden="true">{posts.length}</span><span className="sr-only">, {posts.length} articles</span></button>
          {available.map(item => <button type="button" key={item.key} className="hq-blog-topic" aria-label={`${item.shortLabel}, ${item.count} ${item.count === 1 ? "article" : "articles"}`} aria-pressed={topic === item.key} onClick={() => chooseTopic(item.key)}>{item.shortLabel} <span aria-hidden="true">{item.count}</span><span className="sr-only">, {item.count} {item.count === 1 ? "article" : "articles"}</span></button>)}
        </div>
        <p className="hq-blog-count" role="status" aria-live="polite" aria-atomic="true">{list.length} {list.length === 1 ? "article" : "articles"}{selected ? ` · ${selected.shortLabel}` : ""}</p>
      </div>
      {list.length ? <div className="hq-blog-grid">
        {list.map((post, index) => <article className="hq-blog-card" key={post.slug}>
          <Link to={`/blog/${post.slug}`} state={{ blogReturn: blogTopicUrl(topic) }} className="hq-blog-card-link" aria-labelledby={`title-${post.slug}`}>
            <ListingCover images={listingImages(post)} priority={index === 0} />
            <div className="hq-blog-card-body">
              <p className="hq-blog-card-topic">{primaryTopic(post)?.shortLabel ?? "Article"}</p>
              <h2 id={`title-${post.slug}`}>{post.title}</h2>
              <p className="hq-blog-excerpt">{post.excerpt}</p>
              <div className="hq-blog-card-footer">
                {post.archiveYear && <span className="hq-blog-archive">{post.archiveYear} archive</span>}
                <div className="hq-blog-card-meta"><time dateTime={post.date}>{formatBlogDate(post.date)}</time>{readingEstimate(post.readingMinutes) && <span>{readingEstimate(post.readingMinutes)}</span>}</div>
              </div>
            </div>
          </Link>
        </article>)}
      </div> : <section className="hq-blog-empty" aria-labelledby="blog-empty-title"><h2 id="blog-empty-title">No articles in this topic yet</h2><p>Explore the other movie guides and film explainers.</p><button type="button" className="hq-primary" onClick={() => chooseTopic("all")}>Show all articles</button></section>}
      <section className="hq-blog-play" aria-labelledby="blog-play-title">
        <div><h2 id="blog-play-title">Put your movie knowledge to the test</h2><p>Choose a quiz, or try today’s Daily Challenge.</p></div>
        <div className="hq-blog-play-actions"><Link to="/" className="hq-primary">Play a movie quiz</Link><Link to="/daily" className="hq-secondary">Daily Challenge</Link></div>
      </section>
    </div>
  </>;
}
