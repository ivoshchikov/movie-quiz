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
const SITE_URL = new URL(process.env.VITE_SITE_URL || "https://hard-quiz.com").origin;
const SITE_DEFINE = { "import.meta.env.VITE_SITE_URL": JSON.stringify(SITE_URL) };

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
    define: SITE_DEFINE,
    jsx: "automatic",
    loader: { ".ts": "ts", ".tsx": "tsx" },
    logLevel: "silent",
  });

  const { posts } = require(BUNDLE);
  if (!Array.isArray(posts)) throw new Error("posts export not found");
  await esbuild.build({
    entryPoints: [path.resolve(ROOT, "src/blog/presentation.ts")], outfile: PRESENTATION_BUNDLE,
    platform: "node", format: "cjs", bundle: true, define: SITE_DEFINE, logLevel: "silent",
  });
  const { validateBlogPosts, sortBlogPosts, blogCollectionJsonLd, articleMetadata, articleJsonLd } = require(PRESENTATION_BUNDLE);
  validateBlogPosts(posts);
  const featured = JSON.parse(fs.readFileSync(path.join(ROOT, "src/featuredPostMetadata.json"), "utf8"));
  if (!posts.some(post => post.slug === featured.slug && post.title === featured.title)) throw new Error("Homepage featured article metadata is out of date");
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
  const staticPaths = ["/", "/how-to-play", "/blog", "/leaderboard", "/daily", "/time-attack", "/this-or-that"];
  const paths = [...staticPaths.map(url => ({ url })), ...sorted.map(post => ({ url: `/blog/${post.slug}`, lastmod: post.modified || post.date }))];
  const urls = paths
    .map(
      ({ url, lastmod }) =>
        `<url><loc>${escape(SITE_URL + url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`,
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
    const revision = process.env.SEO_BUILD_REVISION || process.env.VERCEL_GIT_COMMIT_SHA || process.env.VITE_VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
    if (revision && !/^[a-f0-9]{40}$/.test(revision)) throw new Error("SEO build revision must be a full Git SHA");
    // Start from an application shell, including when the generator is run twice.
    const template = fs.readFileSync(path.join(DEST_DIR, "index.html"), "utf8")
      .replace(/<div id="root">[\s\S]*<\/div>\s*(?=<script|<\/body>)/, '<div id="root"></div>\n    ')
      .replace(/<link\b[^>]*rel="canonical"[^>]*>/g, "")
      .replace(/<meta\b[^>]*property="og:url"[^>]*>/g, "")
      .replace(/<meta\b[^>]*name="hardquiz:revision"[^>]*>/g, "")
      .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[^<]*"@type":"WebSite"[^<]*<\/script>/g, "");
    const prerenderBundle = path.join(CACHE_DIR, "blog-prerender.cjs");
    await esbuild.build({
      entryPoints: [path.resolve(ROOT, "src/blog/prerender.tsx")], outfile: prerenderBundle,
      platform: "node", format: "cjs", bundle: true, packages: "external", jsx: "automatic", define: SITE_DEFINE,
      loader: { ".css": "empty" }, logLevel: "silent",
    });
    const { renderBlogCollection, renderBlogArticle, renderNotFoundPage } = require(prerenderBundle);
    const publicBundle = path.join(CACHE_DIR, "public-prerender.cjs");
    await esbuild.build({
      entryPoints: [path.resolve(ROOT, "src/publicPrerender.tsx")], outfile: publicBundle,
      platform: "node", format: "cjs", bundle: true, packages: "external", jsx: "automatic",
      // Rendering only reads initial hook state. No API requests or credentials are used.
      define: { ...SITE_DEFINE, "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://prerender.invalid"), "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("prerender-placeholder"), "import.meta.env.VITE_SUPABASE_BUCKET": JSON.stringify("movies") },
      loader: { ".css": "empty" }, logLevel: "silent",
    });
    const { renderPublicPage } = require(publicBundle);
    const pageStyles = (html, name) => {
      // Lazy route CSS must also style the content served before JavaScript starts.
      const prefixes = { "how-to-play": ["HowToPlay"], blog: ["BlogIndex"], article: ["BlogPost"], daily: ["DailyPage", "game"], leaderboard: ["LeaderboardPage"], "time-attack": ["TimeAttackPage", "time-attack"], "this-or-that": ["ThisThatPage", "this-that"] }[name] || [];
      const assetDir = path.join(DEST_DIR, "assets");
      if (!fs.existsSync(assetDir)) return html;
      const tags = fs.readdirSync(assetDir).filter(file => file.endsWith(".css") && prefixes.some(prefix => file.startsWith(prefix + "-"))).map(file => `<link rel="stylesheet" crossorigin href="/assets/${file}" />`).join("");
      return html.replace("</head>", `${tags}</head>`);
    };
    const pages = JSON.parse(fs.readFileSync(path.join(ROOT, "src/pageMetadata.json"), "utf8"));
    for (const [name, file, noindex] of [["how-to-play", "howToPlayMetadata.json", false], ["login", "loginMetadata.json", true], ["setup-profile", "profileSetupMetadata.json", true], ["blog", "blogMetadata.json", false], ["admin/daily", "adminDailyMetadata.json", true], ["admin/questions", "adminQuestionsMetadata.json", true], ["admin/questions/new", "adminQuestionsNewMetadata.json", true]]) {
      const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, "src", file), "utf8"));
      metadata.url = SITE_URL + new URL(metadata.url).pathname;
      let html = template;
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
      if (name === "how-to-play") html = html.replace('<div id="root"></div>', `<div id="root">${renderPublicPage("/how-to-play")}</div>`);
      if (name === "blog") {
        html = html.replace('<div id="root"></div>', `<div id="root">${renderBlogCollection()}</div>`);
        const jsonLd = JSON.stringify(blogCollectionJsonLd(posts)).replace(/</g, "\\u003c");
        html = html.replace("</head>", `  <script data-rh="true" type="application/ld+json">${jsonLd}</script>\n</head>`);
      }
      const output = path.join(DEST_DIR, `${name}.html`);
      ensureDir(path.dirname(output));
      fs.writeFileSync(output, pageStyles(html, name), "utf8");
    }

    const baseHtml = template;
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
      const route = routes.find(rule => !rule.has && rule.src && new RegExp(rule.src).test(`/blog/${post.slug}`));
      if (!route || route.status || !route.dest?.endsWith("$1.html")) throw new Error(`Missing article HTML route for ${post.slug} in vercel.json`);
      const body = renderBlogArticle(post.slug);
      for (const item of post.contents ?? []) {
        if (body.split(`id="${item.id}"`).length !== 2) throw new Error(`Missing or duplicate section ${item.id} in ${post.slug}`);
      }
      fs.writeFileSync(path.join(blogDir, `${post.slug}.html`), pageStyles(withArticleMetadata(articleMetadata(post), body, articleJsonLd(post)), "article"), "utf8");
    }
    fs.writeFileSync(path.join(blogDir, "_not-found.html"), withArticleMetadata({
      title: "Article not found | Hard Quiz", description: "This article is unavailable. Browse movie guides and film explainers on the Hard Quiz blog.", image: `${SITE_URL}/og/logo.webp?v=og2`,
    }, renderBlogArticle("_not-found.html"), null, true), "utf8");

    fs.writeFileSync(path.join(DEST_DIR, "404.html"), withArticleMetadata({
      title: "Page not found | Hard Quiz", description: "This page is unavailable. Choose a movie quiz or explore the Hard Quiz blog.", image: `${SITE_URL}/og/logo.webp?v=og2`,
    }, renderNotFoundPage(), null, true), "utf8");
    for (const [name, meta] of Object.entries(pages)) {
      const routePath = new URL(meta.url).pathname;
      const metadata = { ...meta, url: SITE_URL + routePath, image: `${SITE_URL}/og/logo.webp?v=og2` };
      const body = meta.noindex ? "" : renderPublicPage(routePath);
      const structured = name === "home" ? { "@context": "https://schema.org", "@type": "WebSite", name: "Hard Quiz", url: `${SITE_URL}/` } : null;
      ensureDir(path.dirname(path.join(DEST_DIR, `${name}.html`)));
      fs.writeFileSync(path.join(DEST_DIR, name === "home" ? "index.html" : `${name}.html`), pageStyles(withArticleMetadata(metadata, body, structured, !!meta.noindex).replace('property="og:type" content="article"', 'property="og:type" content="website"'), name), "utf8");
    }
    for (const entry of ["/", "/play", "/result", "/daily", "/leaderboard", "/profile", "/time-attack", "/time-attack/play", "/this-or-that", "/this-or-that/play"]) {
      const route = routes.find(rule => !rule.has && rule.src && new RegExp(rule.src).test(entry));
      if (!route || route.status || route.dest !== (entry === "/" ? "/index.html" : "/$1.html")) throw new Error(`Missing application entry route for ${entry} in vercel.json`);
    }

    // Public release identity lets the post-deployment check reject an older deploy.
    // The catalog comes from the same entries as sitemap/RSS; Google index status is separate.
    const publicationPages = paths.map(({ url }) => ({
      path: url,
      file: url === "/" ? "index.html" : `${url.slice(1)}.html`,
      kind: url.startsWith("/blog/") ? "article" : url === "/blog" ? "collection" : "page",
      ...(url.startsWith("/blog/") ? (() => {
        const post = sorted.find(item => url === `/blog/${item.slug}`);
        return { slug: post.slug, publishedOn: post.date, modifiedOn: post.modified || null };
      })() : {}),
    }));
    for (const entry of publicationPages) {
      const output = path.join(DEST_DIR, entry.file);
      if (revision) fs.writeFileSync(output, fs.readFileSync(output, "utf8").replace("</head>", `<meta name="hardquiz:revision" content="${revision}" /></head>`));
    }
    fs.writeFileSync(path.join(DEST_DIR, "seo-release.json"), JSON.stringify({
      schemaVersion: 1, revision, canonicalOrigin: SITE_URL, pages: publicationPages,
    }, null, 2) + "\n");

  }

  console.log(`✓ Generated in ${DEST}/: feed.xml, sitemap.xml${DEST === "dist" ? ", page and article HTML" : ""}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
