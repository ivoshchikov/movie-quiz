import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import BlogIndex from "../pages/BlogIndex";

/** The same cards are readable in the first response and after React starts. */
export function renderBlogCollection(): string {
  return renderToStaticMarkup(<HelmetProvider context={{}}><StaticRouter location="/blog"><div className="hq-site"><main className="hq-shell hq-blog-main"><BlogIndex /></main></div></StaticRouter></HelmetProvider>);
}
