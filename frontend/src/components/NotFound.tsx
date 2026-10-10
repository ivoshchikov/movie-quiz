import { Link } from "react-router-dom";
import Seo from "./Seo";
import SiteIcon from "./SiteIcon";

export default function NotFound({ article = false, blogReturn = "/blog" }: { article?: boolean; blogReturn?: string }) {
  const title = article ? "Article not found" : "Page not found";
  return <section className="hq-panel hq-fallback-card" aria-labelledby="not-found-title">
    <Seo title={`${title} | Hard Quiz`} description={article
      ? "This article is unavailable. Browse movie guides and film explainers on the Hard Quiz blog."
      : "This page is unavailable. Choose a movie quiz or explore the Hard Quiz blog."} noindex />
    <span className="hq-fallback-symbol"><SiteIcon name="film" /></span>
    <p className="hq-eyebrow">404 · Hard Quiz</p>
    <h1 id="not-found-title" className="hq-page-heading">{title}</h1>
    <p className="hq-page-copy">{article
      ? "We couldn't find an article at this address. Explore our movie guides and film explainers instead."
      : "We couldn't find a page at this address. The link may be outdated, or the address may be incomplete."}</p>
    <div className="hq-fallback-actions">
      <Link to={article ? blogReturn : "/"} className="hq-primary">{article ? "Back to blog" : "Choose a quiz"}</Link>
      <Link to={article ? "/" : "/blog"} className="hq-secondary">{article ? "Choose a quiz" : "Explore the blog"}</Link>
    </div>
  </section>;
}
