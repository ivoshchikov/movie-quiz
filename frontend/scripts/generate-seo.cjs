// scripts/generate-seo.cjs
// Генерит feed.xml (RSS) и sitemap.xml на основе src/blog/index.ts
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
require("dotenv").config();

const ROOT = process.cwd();
const DEST = process.argv[2] || "public"; // public | dist
const DEST_DIR = path.join(ROOT, DEST);
const CACHE_DIR = path.join(ROOT, ".cache");
const BUNDLE = path.join(CACHE_DIR, "posts.cjs");
const SRC_POSTS = path.resolve(ROOT, "src/blog/index.ts"); // ← ТУТ НОВЫЙ ПУТЬ
const PRESENTATION_BUNDLE = path.join(CACHE_DIR, "blog-presentation.cjs");

// Всегда генерим ссылки под apex-домен.
// При необходимости можно переопределить через VITE_SITE_URL.
const SITE_URL = process.env.VITE_SITE_URL || "https://hard-quiz.com";

const ensureDir =
  (p) => fs.existsSync(p) || fs.mkdirSync(p, { recursive: true });

(async () => {
  ensureDir(CACHE_DIR);
  ensureDir(DEST_DIR);

  if (!fs.existsSync(SRC_POSTS)) {
    throw new Error(`blog index not found at: ${SRC_POSTS}`);
  }

  await esbuild.build({
    entryPoints: [SRC_POSTS],
    outfile: BUNDLE,
    absWorkingDir: ROOT,
    platform: "node",
    format: "cjs",
    bundle: true,
    jsx: "automatic",
    loader: { ".ts": "ts", ".tsx": "tsx" },
    logLevel: "silent",
  });

  const { posts } = require(BUNDLE);
  if (!Array.isArray(posts)) throw new Error("posts export not found");
  await esbuild.build({
    entryPoints: [path.resolve(ROOT, "src/blog/presentation.ts")], outfile: PRESENTATION_BUNDLE,
    platform: "node", format: "cjs", bundle: true, logLevel: "silent",
  });
  const { validateBlogPosts, sortBlogPosts, blogCollectionJsonLd, articleMetadata, articleJsonLd } = require(PRESENTATION_BUNDLE);
  validateBlogPosts(posts);
  const sorted = sortBlogPosts(posts);

  const escape = (s = "") =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // RSS
  const items = sorted
    .map((p) => {
      const link = `${SITE_URL}/blog/${p.slug}`;
      const pubDate = new Date(p.date).toUTCString();
      const cats = (p.tags || [])
        .map((t) => `<category>${escape(t)}</category>`)
        .join("");
      return `
  <item>
    <title>${escape(p.title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <description><![CDATA[${p.excerpt || ""}]]></description>
    ${cats}
  </item>`.trim();
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Hard Quiz — Blog</title>
  <link>${SITE_URL}/blog</link>
  <description>Movie guides and stories behind the screen.</description>
  <language>en</language>
  ${items}
</channel>
</rss>`.trim();

  fs.writeFileSync(path.join(DEST_DIR, "feed.xml"), rss, "utf8");

  // Sitemap
  const staticPaths = ["/", "/how-to-play", "/blog", "/leaderboard", "/play", "/result"];
  const paths = [...staticPaths.map(url => ({ url })), ...sorted.map(post => ({ url: `/blog/${post.slug}`, lastmod: post.modified || post.date }))];
  const urls = paths
    .map(
      ({ url, lastmod }) =>
        `<url><loc>${SITE_URL}${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    )
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!--  Hard-Quiz – static sitemap   -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`.trim();

  fs.writeFileSync(path.join(DEST_DIR, "sitemap.xml"), sitemap, "utf8");

  // Serve page metadata in the first HTTP response, before React.
  if (DEST === "dist") {
    const prerenderBundle = path.join(CACHE_DIR, "blog-prerender.cjs");
    await esbuild.build({
      entryPoints: [path.resolve(ROOT, "src/blog/prerender.tsx")], outfile: prerenderBundle,
      platform: "node", format: "cjs", bundle: true, packages: "external", jsx: "automatic",
      loader: { ".css": "empty" }, logLevel: "silent",
    });
    const { renderBlogCollection, renderBlogArticle } = require(prerenderBundle);
    for (const [name, file, noindex] of [["how-to-play", "howToPlayMetadata.json", false], ["login", "loginMetadata.json", true], ["setup-profile", "profileSetupMetadata.json", true], ["blog", "blogMetadata.json", false]]) {
      const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, "src", file), "utf8"));
      let html = fs.readFileSync(path.join(DEST_DIR, "index.html"), "utf8");
      html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/, `<title data-rh="true">${escape(metadata.title)}</title>`);
      for (const [attribute, key, value] of [
        ["name", "description", metadata.description],
        ["property", "og:title", metadata.title],
        ["property", "og:description", metadata.description],
        ["name", "twitter:title", metadata.title],
        ["name", "twitter:description", metadata.description],
        ["name", "robots", noindex ? "noindex, nofollow" : "index, follow"],
      ]) {
        const tag = new RegExp(`<meta\\b[^>]*\\b${attribute}="${key}"[^>]*>`, "g");
        html = html.replace(tag, `<meta data-rh="true" ${attribute}="${key}" content="${escape(value)}" />`);
      }
      html = html.replace("</head>", `  <link data-rh="true" rel="canonical" href="${escape(metadata.url)}" />
      <meta data-rh="true" property="og:url" content="${escape(metadata.url)}" />
    </head>`);
      if (name === "blog") {
        html = html.replace('<div id="root"></div>', `<div id="root">${renderBlogCollection()}</div>`);
        const jsonLd = JSON.stringify(blogCollectionJsonLd(posts)).replace(/</g, "\\u003c");
        html = html.replace("</head>", `  <script data-rh="true" type="application/ld+json">${jsonLd}</script>\n</head>`);
      }
      fs.writeFileSync(path.join(DEST_DIR, `${name}.html`), html, "utf8");
    }

    const baseHtml = fs.readFileSync(path.join(DEST_DIR, "index.html"), "utf8");
    const withArticleMetadata = (meta, body, jsonLd, noindex = false) => {
      let html = baseHtml.replace(/<title\b[^>]*>[\s\S]*?<\/title>/, `<title data-rh="true">${escape(meta.title)}</title>`);
      for (const [attribute, key, value] of [
        ["name", "description", meta.description], ["name", "robots", noindex ? "noindex, nofollow" : "index, follow"],
        ["property", "og:title", meta.title], ["property", "og:description", meta.description],
        ["property", "og:type", noindex ? "website" : "article"], ["property", "og:image", meta.image],
        ["name", "twitter:title", meta.title], ["name", "twitter:description", meta.description], ["name", "twitter:image", meta.image],
      ]) {
        html = html.replace(new RegExp(`<meta\\b[^>]*\\b${attribute}="${key}"[^>]*>`, "g"), `<meta data-rh="true" ${attribute}="${key}" content="${escape(value)}" />`);
      }
      const extra = meta.url ? `<link data-rh="true" rel="canonical" href="${escape(meta.url)}" /><meta data-rh="true" property="og:url" content="${escape(meta.url)}" />` : "";
      const structured = jsonLd ? `<script data-rh="true" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : "";
      return html.replace("</head>", `${extra}${structured}</head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    };
    const routes = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")).routes;
    const blogDir = path.join(DEST_DIR, "blog");
    ensureDir(blogDir);
    for (const post of sorted) {
      const route = routes.find(rule => rule.src && new RegExp(rule.src).test(`/blog/${post.slug}`));
      if (!route || route.status || !route.dest?.endsWith("$1.html")) throw new Error(`Missing article HTML route for ${post.slug} in vercel.json`);
      const body = renderBlogArticle(post.slug);
      for (const item of post.contents ?? []) {
        if (body.split(`id="${item.id}"`).length !== 2) throw new Error(`Missing or duplicate section ${item.id} in ${post.slug}`);
      }
      fs.writeFileSync(path.join(blogDir, `${post.slug}.html`), withArticleMetadata(articleMetadata(post), body, articleJsonLd(post)), "utf8");
    }
    fs.writeFileSync(path.join(blogDir, "_not-found.html"), withArticleMetadata({
      title: "Article not found | Hard Quiz", description: "This article is unavailable. Browse movie guides and film explainers on the Hard Quiz blog.", image: `${SITE_URL}/og/logo.webp?v=og2`,
    }, renderBlogArticle("_not-found.html"), null, true), "utf8");

  }

  console.log(`✓ Generated in ${DEST}/: feed.xml, sitemap.xml${DEST === "dist" ? ", page and article HTML" : ""}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
