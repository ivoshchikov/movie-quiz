import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import BlogIndex from "../pages/BlogIndex";
import BlogPostPage from "../pages/BlogPost";

/** The same cards are readable in the first response and after React starts. */
export function renderBlogCollection(): string {
  return renderToStaticMarkup(<HelmetProvider context={{}}><StaticRouter location="/blog"><div className="hq-site"><main className="hq-shell hq-blog-main"><BlogIndex /></main></div></StaticRouter></HelmetProvider>);
}

export function renderBlogArticle(slug: string): string {
  return renderToStaticMarkup(<HelmetProvider context={{}}><StaticRouter location={`/blog/${slug}`}><div className="hq-site"><main className="hq-shell hq-article-main"><Routes><Route path="/blog/:slug" element={<BlogPostPage />} /></Routes></main></div></StaticRouter></HelmetProvider>);
}
