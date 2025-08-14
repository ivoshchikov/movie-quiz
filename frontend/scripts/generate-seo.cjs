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

const SITE_URL =
  process.env.VITE_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://hard-quiz.com");


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

  const sorted = [...posts].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );

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
  <description>Updates, dev notes, and tips for movie quizzes.</description>
  <language>en</language>
  ${items}
</channel>
</rss>`.trim();

  fs.writeFileSync(path.join(DEST_DIR, "feed.xml"), rss, "utf8");

  // Sitemap
  const staticPaths = ["/", "/how-to-play", "/blog", "/play", "/result"];
  const postPaths = sorted.map((p) => `/blog/${p.slug}`);
  const urls = [...staticPaths, ...postPaths]
    .map(
      (u) =>
        `<url><loc>${SITE_URL}${u}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    )
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!--  Hard-Quiz – static sitemap   -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`.trim();

  fs.writeFileSync(path.join(DEST_DIR, "sitemap.xml"), sitemap, "utf8");

  console.log(`✓ Generated in ${DEST}/: feed.xml, sitemap.xml`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
