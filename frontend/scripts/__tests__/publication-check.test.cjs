const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { runChecks, synchronizeRegistry } = require("../verify-publication.cjs");

const revision = "1".repeat(40), canonicalOrigin = "https://hard-quiz.com";
const manifest = { schemaVersion: 1, revision, canonicalOrigin, pages: [
  { path: "/", file: "index.html", kind: "page" },
  { path: "/blog", file: "blog.html", kind: "collection" },
  { path: "/blog/test-film", file: "blog/test-film.html", kind: "article", slug: "test-film", publishedOn: "2026-10-22", modifiedOn: null },
] };
function document(route, kind) {
  const url = canonicalOrigin + route, title = route === "/" ? "Movie Quiz" : kind === "article" ? "A film guide" : "Blog";
  const article = { "@context": "https://schema.org", "@type": "BlogPosting", url, datePublished: "2026-10-22", mainEntityOfPage: { "@id": url } };
  const collection = { "@context": "https://schema.org", "@type": "CollectionPage", mainEntity: { numberOfItems: 1, itemListElement: [{ item: { url: canonicalOrigin + "/blog/test-film" } }] } };
  const ld = kind === "article" ? article : kind === "collection" ? collection : { "@type": "WebSite", name: "Hard Quiz" };
  return `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="A useful description."><meta name="robots" content="index, follow, max-image-preview:none"><link rel="canonical" href="${url}"><meta name="hardquiz:revision" content="${revision}">
${["og:title", "twitter:title"].map(key => `<meta ${key.startsWith("og:") ? "property" : "name"}="${key}" content="${title}">`).join("")}
${["og:description", "twitter:description"].map(key => `<meta ${key.startsWith("og:") ? "property" : "name"}="${key}" content="A useful description.">`).join("")}
<meta property="og:url" content="${url}"><meta property="og:type" content="${kind === "article" ? "article" : "website"}"><meta property="og:image" content="${canonicalOrigin}/cover.svg"><meta name="twitter:image" content="${canonicalOrigin}/cover.svg"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body><main><h1>${title}</h1><div class="hq-article-prose" id="answer">A complete researched article.</div><a href="/">Games</a><a href="/blog">Blog</a><a href="/login">Log in</a>${kind === "collection" ? '<a href="/blog/test-film">Read the guide</a>' : ""}<a href="#answer">Answer</a><img src="/cover.svg" width="1200" height="630" alt="An original film illustration"></main></body></html>`;
}
async function fixture(mutation, action) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hardquiz-publication-test-"));
  const registryPath = path.join(directory, "registry.json");
  const write = (file, body) => { fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true }); fs.writeFileSync(path.join(directory, file), body); };
  write("seo-release.json", JSON.stringify(manifest));
  for (const page of manifest.pages) write(page.file, document(page.path, page.kind));
  write("login.html", '<html><head><link rel="canonical" href="https://hard-quiz.com/login"><meta name="robots" content="noindex, nofollow"></head><body>Log in</body></html>');
  write("robots.txt", "User-agent: *\nAllow: /\nSitemap: https://hard-quiz.com/sitemap.xml\n");
  write("sitemap.xml", '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + manifest.pages.map(page => `<url><loc>${canonicalOrigin + page.path}</loc></url>`).join("") + "</urlset>");
  write("feed.xml", '<rss version="2.0"><channel><item><title>A film guide</title><link>https://hard-quiz.com/blog/test-film</link><guid>https://hard-quiz.com/blog/test-film</guid><pubDate>Thu, 22 Oct 2026 00:00:00 GMT</pubDate><description>A useful description.</description></item></channel></rss>');
  write("cover.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#31204a"/></svg>');
  const registry = synchronizeRegistry(manifest);
  registry.pages[2].google = { status: "not_indexed", checkedOn: "2026-10-22", source: "Fixture URL Inspection", lastCrawlOn: null, lastRequestOn: "2026-10-22", requestStatus: "accepted" };
  write("registry.json", JSON.stringify(registry));
  const server = http.createServer((request, response) => {
    const route = new URL(request.url, "http://localhost").pathname;
    const entry = manifest.pages.find(page => page.path === route);
    const file = route === "/seo-release.json" ? "seo-release.json" : entry?.file || route.slice(1) + (route === "/login" ? ".html" : "");
    let result = fs.existsSync(path.join(directory, file)) && fs.statSync(path.join(directory, file)).isFile()
      ? { status: 200, type: file.endsWith(".html") ? "text/html" : file.endsWith(".xml") ? "application/xml" : file.endsWith(".svg") ? "image/svg+xml" : file.endsWith(".json") ? "application/json" : "text/plain", body: fs.readFileSync(path.join(directory, file), "utf8"), headers: {} }
      : { status: 404, type: "text/html", body: '<html><head><meta name="robots" content="noindex, nofollow"></head><body><h1>Page not found</h1></body></html>', headers: {} };
    result = mutation ? mutation(route, result) : result;
    response.writeHead(result.status, { "Content-Type": result.type, ...result.headers }); response.end(result.body);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try { return await action({ directory, registryPath, origin: `http://127.0.0.1:${server.address().port}`, revision, registry }); }
  finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); }
}

test("sync adds a new URL without erasing Google or HTTP evidence; repeat is idempotent", () => {
  const previous = synchronizeRegistry({ ...manifest, pages: manifest.pages.slice(0, 2) });
  previous.pages[0].google = { status: "indexed", checkedOn: "2026-10-21", source: "URL Inspection" };
  previous.pages[0].publication = { status: "verified", revision: "2".repeat(40), lastVerifiedAt: "2026-10-21T12:00:00Z" };
  const result = synchronizeRegistry(manifest, previous);
  assert.deepEqual(result.pages[0].google, previous.pages[0].google);
  assert.deepEqual(result.pages[0].publication, previous.pages[0].publication);
  assert.equal(result.pages[2].google.status, "unknown");
  assert.deepEqual(synchronizeRegistry(manifest, result), result);
});
test("sync rejects duplicate and removed URL records instead of silently deleting history", () => {
  const previous = synchronizeRegistry(manifest);
  assert.throws(() => synchronizeRegistry(manifest, { ...previous, pages: [...previous.pages, previous.pages[0]] }), /Duplicate/);
  assert.throws(() => synchronizeRegistry({ ...manifest, pages: manifest.pages.slice(0, 2) }, previous), /Removed URL/);
});
test("valid live release verifies publication and records it without inferring Google indexing", async () => {
  await fixture(null, async options => {
    const report = await runChecks({ ...options, recordRegistry: true });
    assert.equal(report.status, "passed", JSON.stringify(report.errors));
    assert.equal(report.pages.length, 3);
    assert.equal(report.images[0].result, "passed");
    assert.equal(report.registry.pages[2].publication.status, "verified");
    assert.deepEqual(report.registry.pages[2].google, options.registry.pages[2].google);
    assert.equal(report.registry.pages[0].google.status, "unknown");
    assert.deepEqual(JSON.parse(fs.readFileSync(options.registryPath)), report.registry);
  });
});
test("local build check does not claim a verified production publication", async () => {
  await fixture(null, async options => {
    const report = await runChecks({ directory: options.directory, registryPath: options.registryPath });
    assert.equal(report.status, "passed", JSON.stringify(report.errors));
    assert.equal(report.registry.pages[0].publication.status, "not_checked");
  });
});
test("a preview URL cannot be recorded as production verification", async () => {
  await fixture(null, async options => {
    const before = fs.readFileSync(options.registryPath, "utf8");
    const report = await runChecks({ ...options, origin: "https://movie-quiz-preview.vercel.app", recordRegistry: true });
    assert.equal(report.status, "failed");
    assert.match(report.errors[0].message, /canonical production origin/);
    assert.equal(fs.readFileSync(options.registryPath, "utf8"), before);
  });
});
const failures = [
  ["stale deployment manifest", (route, result) => route === "/seo-release.json" ? { ...result, body: JSON.stringify({ ...manifest, revision: "2".repeat(40) }) } : result, "configuration_or_release"],
  ["truncated article and X-Robots-Tag noindex", (route, result) => route === "/blog/test-film" ? { ...result, body: result.body.replace("A complete researched article.", "Truncated."), headers: { "X-Robots-Tag": "googlebot: noindex" } } : result, "indexability"],
  ["duplicate canonical", (route, result) => route === "/blog/test-film" ? { ...result, body: result.body.replace("</head>", '<link rel="canonical" href="https://hard-quiz.com/blog/test-film"></head>') } : result, "metadata"],
  ["missing RSS item", (route, result) => route === "/feed.xml" ? { ...result, body: '<rss version="2.0"><channel></channel></rss>' } : result, "rss"],
  ["HTML returned for an image", (route, result) => route === "/cover.svg" ? { ...result, type: "text/html", body: "<html>Not an image</html>" } : result, "image"],
  ["corrupt image bytes", (route, result) => route === "/cover.svg" ? { ...result, body: "corrupt bytes" } : result, "image"],
  ["stale but valid image bytes", (route, result) => route === "/cover.svg" ? { ...result, body: result.body.replace("#31204a", "#000000") } : result, "image"],
  ["soft 404", (route, result) => route.startsWith("/seo-publication-missing") || route.startsWith("/blog/seo-publication-missing") ? { ...result, status: 200 } : result, "404"],
  ["article missing from the listing", (route, result) => route === "/blog" ? { ...result, body: result.body.replace('<a href="/blog/test-film">Read the guide</a>', "") } : result, "internal_link"],
];
for (const [name, mutation, expectedCode] of failures) test(`rejects ${name}; failed checks cannot overwrite last good evidence`, async () => {
  await fixture(mutation, async options => {
    const before = fs.readFileSync(options.registryPath, "utf8");
    const report = await runChecks({ ...options, recordRegistry: true, reportPath: path.join(options.directory, "partial-report.json") });
    assert.equal(report.status, "failed");
    assert.ok(report.errors.some(error => error.code === expectedCode), JSON.stringify(report.errors));
    assert.equal(fs.readFileSync(options.registryPath, "utf8"), before);
    assert.equal(JSON.parse(fs.readFileSync(path.join(options.directory, "partial-report.json"))).status, "failed");
  });
});

test("repeating the real SEO generator preserves HTML and a single release marker", { skip: !fs.existsSync("dist/seo-release.json") }, () => {
  const release = JSON.parse(fs.readFileSync("dist/seo-release.json", "utf8"));
  const hash = file => createHash("sha256").update(fs.readFileSync(path.join("dist", file))).digest("hex");
  const before = release.pages.map(row => hash(row.file));
  execFileSync(process.execPath, ["scripts/generate-seo.cjs", "dist"], { stdio: "pipe", env: { ...process.env, SEO_BUILD_REVISION: release.revision || "" } });
  assert.deepEqual(release.pages.map(row => hash(row.file)), before);
  execFileSync(process.execPath, ["scripts/generate-seo.cjs", "dist"], { stdio: "pipe", env: { ...process.env, SEO_BUILD_REVISION: "", VERCEL_GIT_COMMIT_SHA: "", GITHUB_SHA: "", VITE_VERCEL_GIT_COMMIT_SHA: release.revision || "" } });
  assert.deepEqual(release.pages.map(row => hash(row.file)), before);
  for (const row of release.pages) {
    const html = fs.readFileSync(path.join("dist", row.file), "utf8");
    assert.equal((html.match(/name="hardquiz:revision"/g) || []).length, release.revision ? 1 : 0);
  }
});

