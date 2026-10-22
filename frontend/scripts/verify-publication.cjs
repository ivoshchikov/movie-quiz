#!/usr/bin/env node
// Read-only HTTP/HTML checks. App JavaScript, auth and gameplay RPCs are never run.
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { createHash } = require("node:crypto");
const { chromium } = require("playwright");

const normalize = value => String(value || "").replace(/\s+/g, " ").trim();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = values => [...values].sort();
const shaPattern = /^[a-f0-9]{40}$/;
const blocksIndexing = value => /\bnoindex\b|(?:^|,)\s*(?:(?:googlebot|bingbot)\s*:\s*)?none\s*(?:,|$)/i.test(value);
const writeJson = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n"); };
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const catalog = manifest => manifest.pages.map(({ path: route, kind, slug, publishedOn, modifiedOn }) => ({
  path: route, url: manifest.canonicalOrigin + route, kind,
  ...(kind === "article" ? { slug, publishedOn, modifiedOn } : {}),
}));

function synchronizeRegistry(manifest, previous = { schemaVersion: 1, pages: [] }) {
  if (previous.schemaVersion !== 1 || !Array.isArray(previous.pages)) throw new Error("Unsupported publication registry");
  const paths = previous.pages.map(row => row.path);
  if (new Set(paths).size !== paths.length) throw new Error("Duplicate registry URL");
  const expected = catalog(manifest);
  for (const row of previous.pages) if (!expected.some(item => item.path === row.path)) throw new Error(`Removed URL ${row.path}: review redirects and registry explicitly before removing it`);
  return { schemaVersion: 1, pages: expected.map(row => {
    const old = previous.pages.find(item => item.path === row.path);
    return { ...row,
      publication: old?.publication || { status: "not_checked", lastCheckedAt: null, lastVerifiedAt: null, revision: null },
      google: old?.google || { status: "unknown", checkedOn: null, source: null, lastCrawlOn: null, lastRequestOn: null, requestStatus: null },
    };
  }) };
}

async function inspectHtml(page, html) {
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  return page.evaluate(() => {
    const text = value => (value || "").replace(/\s+/g, " ").trim();
    const values = (selector, attribute) => [...document.querySelectorAll(selector)].map(el => attribute ? el.getAttribute(attribute) : text(el.textContent));
    const main = document.querySelector("main");
    const prose = document.querySelector(".hq-article-prose");
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(el => {
      try { return JSON.parse(el.textContent); } catch { return { parseError: true }; }
    });
    return {
      lang: document.documentElement.lang, titles: values("title"), descriptions: values('meta[name="description"]', "content"),
      canonicals: values('link[rel="canonical"]', "href"), robots: values('meta[name="robots"]', "content"),
      revisions: values('meta[name="hardquiz:revision"]', "content"), h1: values("h1"),
      meta: Object.fromEntries(["og:title", "og:description", "og:url", "og:image", "og:type", "twitter:title", "twitter:description", "twitter:image", "twitter:card"].map(key => [key, values(`meta[${key.startsWith("og:") ? "property" : "name"}="${key}"]`, "content")])),
      main: text(main?.textContent), prose: text(prose?.textContent), jsonLd: ld,
      links: values("a[href]", "href"), ids: values("[id]", "id"),
      images: [...document.querySelectorAll("img")].map(el => ({ src: el.getAttribute("src"), srcset: el.getAttribute("srcset"), alt: el.getAttribute("alt"), width: el.getAttribute("width"), height: el.getAttribute("height"), decorative: !!el.closest('[aria-hidden="true"]') })),
    };
  });
}

function checkDocument(actual, expected, entry, revision, fail) {
  const code = (condition, name, message) => { if (!condition) fail(name, message); };
  for (const key of ["titles", "descriptions", "canonicals", "robots", "h1"]) code(actual[key].length === 1 && !!actual[key][0], "metadata", `Expected one nonempty ${key}`);
  for (const key of ["titles", "descriptions", "canonicals", "h1", "main", "prose", "lang", "images"]) code(equal(actual[key], expected[key]), "content", `Published ${key} differs from this build`);
  code(actual.lang === "en" && !!actual.main, "html", "Readable English main content is required before JavaScript");
  code(actual.canonicals[0] === entry.url, "canonical", "Canonical must be the clean production URL");
  code(!blocksIndexing(actual.robots.join(",")), "indexability", "Public page must allow indexing");
  if (revision) code(equal(actual.revisions, [revision]), "revision", "Page is not from the expected deployment");
  for (const [key, values] of Object.entries(actual.meta)) code(values.length === 1 && !!values[0] && equal(values, expected.meta[key]), "social", `Missing, duplicate or stale ${key}`);
  code(actual.meta["og:url"][0] === entry.url, "canonical", "OG URL and canonical must agree");
  code(actual.jsonLd.length > 0 && actual.jsonLd.every(item => !item.parseError), "jsonld", "Structured data must be valid JSON");
  code(equal(actual.jsonLd, expected.jsonLd), "jsonld", "Published structured data differs from this build");
  if (entry.kind === "article") {
    const articles = actual.jsonLd.filter(item => item["@type"] === "BlogPosting");
    code(!!actual.prose && articles.length === 1, "article", "Full article prose and one BlogPosting are required");
    const ld = articles[0] || {};
    code(ld.url === entry.url && ld.datePublished === entry.publishedOn && ld.mainEntityOfPage?.["@id"] === entry.url, "article", "BlogPosting URL/date must match the article catalog");
  }
  for (const image of actual.images) code(image.alt !== null && (image.decorative || Number(image.width) > 0 && Number(image.height) > 0), "image", "Content images need alt and stable dimensions");
}

async function inspectXml(page, xml, type) {
  return page.evaluate(({ xml, type }) => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("Malformed XML");
    const text = (el, selector) => el.querySelector(selector)?.textContent?.trim() || "";
    if (type === "sitemap") {
      if (doc.documentElement.localName !== "urlset") throw new Error("Expected sitemap urlset");
      return [...doc.querySelectorAll("url")].map(el => ({ url: text(el, "loc"), modified: text(el, "lastmod") }));
    }
    if (doc.documentElement.localName !== "rss") throw new Error("Expected RSS");
    return [...doc.querySelectorAll("item")].map(el => ({ url: text(el, "link"), guid: text(el, "guid"), title: text(el, "title"), date: text(el, "pubDate"), description: text(el, "description") }));
  }, { xml, type });
}

async function runChecks(options = {}) {
  const directory = path.resolve(options.directory || "dist");
  const registryPath = path.resolve(options.registryPath || "../docs/seo/publication-registry.json");
  const report = { schemaVersion: 1, checkedAt: new Date().toISOString(), mode: options.origin ? "published_http" : "local_build", status: "running", revision: options.revision || null, errors: [], pages: [], images: [], registry: null };
  const safeOrigin = (() => { try { return new URL(options.origin).origin; } catch { return "invalid origin"; } })();
  const checkpoint = () => { if (options.reportPath) writeJson(options.reportPath, report); };
  checkpoint();
  let browser, context, imageContext;
  const fail = (code, url, message) => report.errors.push({ code, url, message });
  try {
    const manifest = readJson(path.join(directory, "seo-release.json"));
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.pages) || manifest.pages.length === 0 || manifest.pages.length > 200) throw new Error("Invalid SEO release manifest");
    const canonicalOrigin = new URL(manifest.canonicalOrigin).origin;
    if (canonicalOrigin !== manifest.canonicalOrigin || !canonicalOrigin.startsWith("https://")) throw new Error("Manifest needs the HTTPS canonical origin");
    const manifestPaths = manifest.pages.map(row => row.path);
    if (new Set(manifestPaths).size !== manifestPaths.length) throw new Error("Duplicate manifest URL");
    for (const entry of manifest.pages) {
      if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(entry.path) || entry.file !== (entry.path === "/" ? "index.html" : entry.path.slice(1) + ".html")) throw new Error("Unsafe manifest path");
    }
    const previous = fs.existsSync(registryPath) ? readJson(registryPath) : { schemaVersion: 1, pages: [] };
    const registry = synchronizeRegistry(manifest, previous);
    if (options.syncRegistry) { writeJson(registryPath, registry); report.status = "catalog_synced"; return report; }
    if (!equal(catalog(manifest), previous.pages.map(({ publication: _publication, google: _google, ...rest }) => rest))) throw new Error("Publication catalog is stale. Run npm run seo:sync and commit the registry with the article.");
    for (const row of registry.pages) {
      if (!["unknown", "indexed", "not_indexed"].includes(row.google.status)) throw new Error("Invalid Google index status");
      if (row.google.status !== "unknown" && (!/^\d{4}-\d{2}-\d{2}$/.test(row.google.checkedOn || "") || !row.google.source)) throw new Error("Google index status needs dated inspection evidence");
    }
    report.revision = options.revision || manifest.revision;
    if (report.revision && !shaPattern.test(report.revision)) throw new Error("Invalid build revision");
    if (options.origin && !shaPattern.test(report.revision || "")) throw new Error("Live verification requires a full --revision; HTTP 200 alone cannot identify the release");
    if (report.revision && manifest.revision !== report.revision) throw new Error("Local build revision differs from the requested deployment");
    const origin = options.origin ? new URL(options.origin).origin : null;
    if (options.origin && options.origin.replace(/\/$/, "") !== origin) throw new Error("--url must be an origin without credentials, path or query");
    if (origin && !origin.startsWith("https://") && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) throw new Error("Live origin must use HTTPS; loopback HTTP is for fixtures only");
    if (origin && origin !== canonicalOrigin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) throw new Error("Live checks target the canonical production origin; loopback is allowed for isolated fixtures only");
    report.origin = origin;
    const fetcher = async (url, image = false) => {
      let target = url;
      for (let redirect = 0; redirect < 4; redirect++) {
        let response;
        for (let attempt = 0; attempt < 2; attempt++) {
          response = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(20000), headers: { "User-Agent": "HardQuizPublicationCheck/1.0" } });
          if (attempt === 0 && (response.status === 429 || response.status >= 500)) { await response.body?.cancel(); await new Promise(resolve => setTimeout(resolve, 1500)); continue; }
          break;
        }
        if (image && [301, 302, 303, 307, 308].includes(response.status)) {
          const next = new URL(response.headers.get("location"), target);
          if (next.origin !== new URL(url).origin || next.username || next.password) throw new Error("Image redirect leaves its known source origin");
          await response.body?.cancel(); target = next.href; continue;
        }
        const contentLength = Number(response.headers.get("content-length"));
        if (contentLength > 8 * 1024 * 1024) { await response.body?.cancel(); throw new Error("Resource exceeds the 8 MiB check budget"); }
        const reader = response.body.getReader(), chunks = []; let size = 0;
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.length;
          if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error("Resource exceeds the 8 MiB check budget"); }
          chunks.push(value);
        }
        const bytes = Buffer.concat(chunks);
        return { status: response.status, type: response.headers.get("content-type") || "", robots: response.headers.get("x-robots-tag") || "", bytes, text: bytes.toString("utf8") };
      }
      throw new Error("Too many redirects");
    };
    const liveUrl = route => origin + route + (route.includes("?") ? "&" : "?") + "seo_check=" + report.revision;
    if (origin) {
      const deadline = Date.now() + Math.min(Number(options.waitSeconds || 0), 180) * 1000;
      let observed;
      do {
        try { const response = await fetcher(liveUrl("/seo-release.json")); observed = response.status === 200 ? JSON.parse(response.text) : { status: response.status }; } catch (error) { observed = { error: error.message }; }
        if (equal(observed, manifest)) break;
        if (Date.now() >= deadline) throw new Error(`Published release does not match ${report.revision}; observed revision: ${observed?.revision || "unavailable"}. No publication is marked verified.`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      } while (!equal(observed, manifest));
    }
    browser = await chromium.launch();
    context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "block" });
    await context.route("**/*", route => route.abort());
    const parser = await context.newPage();
    // Image callbacks need JS, so decode only data URLs in a separate blank,
    // network-blocked context. Site HTML never enters this context.
    imageContext = await browser.newContext({ serviceWorkers: "block" });
    await imageContext.route("**/*", route => route.abort());
    const imageDecoder = await imageContext.newPage();
    const parsed = new Map(), assets = new Set(), internal = new Map();
    for (const entry of registry.pages) {
      report.currentUrl = entry.url; checkpoint();
      const expected = await inspectHtml(parser, fs.readFileSync(path.join(directory, entry.path === "/" ? "index.html" : entry.path.slice(1) + ".html"), "utf8"));
      checkDocument(expected, expected, entry, report.revision, (code, message) => fail(code, entry.url, "Build: " + message));
      let actual = expected, status = 200;
      if (origin) {
        try {
          const response = await fetcher(liveUrl(entry.path)); status = response.status;
          if (status !== 200 || !response.type.includes("text/html")) throw new Error(`Expected HTML 200, got ${status} ${response.type}`);
          if (blocksIndexing(response.robots)) fail("indexability", entry.url, "HTTP X-Robots-Tag blocks indexing");
          actual = await inspectHtml(parser, response.text);
          checkDocument(actual, expected, entry, report.revision, (code, message) => fail(code, entry.url, message));
        } catch (error) { fail("http", entry.url, error.message); report.pages.push({ url: entry.url, status, result: "failed" }); continue; }
      }
      parsed.set(entry.path, actual);
      if (entry.kind === "collection") {
        const articleUrls = registry.pages.filter(row => row.kind === "article").map(row => row.url);
        const collection = actual.jsonLd.filter(item => item["@type"] === "CollectionPage");
        const items = collection[0]?.mainEntity?.itemListElement || [];
        if (collection.length !== 1 || collection[0]?.mainEntity?.numberOfItems !== articleUrls.length || !equal(sorted(items.map(item => item.item?.url)), sorted(articleUrls))) fail("collection", entry.url, "CollectionPage must list every article exactly once");
        const links = new Set(actual.links.map(href => new URL(href, entry.url).href));
        for (const url of articleUrls) if (!links.has(url)) fail("internal_link", entry.url, "Article is missing from the readable blog listing: " + url);
      }
      report.pages.push({ url: entry.url, status, result: report.errors.some(error => error.url === entry.url) ? "failed" : "passed" });
      checkpoint();
      for (const href of expected.links) {
        const url = new URL(href, entry.url);
        if (url.origin === canonicalOrigin) internal.set(url.href, url);
        if (!actual.links.includes(href)) fail("internal_link", entry.url, `Missing rendered link ${href}`);
      }
      for (const image of expected.images) {
        if (image.src) assets.add(new URL(image.src, entry.url).href);
        for (const candidate of (image.srcset || "").split(",").filter(Boolean)) assets.add(new URL(candidate.trim().split(/\s+/)[0], entry.url).href);
      }
      for (const key of ["og:image", "twitter:image"]) for (const url of expected.meta[key]) assets.add(new URL(url, entry.url).href);
    }
    for (const [type, file] of [["sitemap", "sitemap.xml"], ["rss", "feed.xml"]]) {
      try {
        const expected = await inspectXml(parser, fs.readFileSync(path.join(directory, file), "utf8"), type);
        const required = registry.pages.filter(row => type === "sitemap" || row.kind === "article").map(row => row.url);
        if (!equal(sorted(expected.map(row => row.url)), sorted(required))) fail(type, canonicalOrigin + "/" + file, "Missing, duplicate or unexpected catalog URLs in generated XML");
        if (type === "rss" && expected.some(row => row.guid !== row.url || !Number.isFinite(Date.parse(row.date)) || !row.title || !row.description)) fail("rss", file, "RSS needs permalink GUIDs, dates, titles and excerpts");
        if (origin) {
          const response = await fetcher(liveUrl("/" + file));
          if (response.status !== 200 || !/(?:xml|rss)/.test(response.type)) throw new Error("Expected XML 200");
          const actual = await inspectXml(parser, response.text, type);
          if (!equal(actual, expected)) fail(type, canonicalOrigin + "/" + file, "Published feed differs from this build");
        }
      } catch (error) { fail(type, canonicalOrigin + "/" + file, error.message); }
    }
    try {
      const expected = fs.readFileSync(path.join(directory, "robots.txt"), "utf8");
      if (!/User-agent:\s*\*/i.test(expected) || !/Allow:\s*\//i.test(expected) || /Disallow:\s*\S/i.test(expected) || !expected.includes(canonicalOrigin + "/sitemap.xml")) throw new Error("Review robots directives before publishing: public crawling and the canonical sitemap must remain allowed");
      if (origin) { const actual = await fetcher(liveUrl("/robots.txt")); if (actual.status !== 200 || !equal(normalize(actual.text), normalize(expected))) throw new Error("Published robots.txt differs from the checked build"); }
    } catch (error) { fail("robots", canonicalOrigin + "/robots.txt", error.message); }
    const extraPages = new Map();
    for (const url of internal.values()) {
      const route = url.pathname.replace(/\/$/, "") || "/";
      let target = parsed.get(route);
      if (!target && !extraPages.has(route)) {
        const file = path.join(directory, route.slice(1) + ".html");
        if (!fs.existsSync(file)) fail("internal_link", url.href, "Internal destination has no generated HTML");
        else if (origin) {
          try {
            const response = await fetcher(liveUrl(route));
            if (response.status !== 200 || !response.type.includes("text/html")) throw new Error("Linked page is not HTML 200");
            target = await inspectHtml(parser, response.text);
            if (!equal(target.canonicals, [canonicalOrigin + route]) || !target.robots.some(value => /noindex/i.test(value))) throw new Error("Linked private page needs a clean canonical and noindex");
          } catch (error) { fail("internal_link", url.href, error.message); }
        }
        extraPages.set(route, target);
      } else target ||= extraPages.get(route);
      if (url.hash && target && !target.ids.includes(decodeURIComponent(url.hash.slice(1)))) fail("anchor", url.href, "Anchor target is missing in published HTML");
    }
    if (origin) for (const route of ["/blog/seo-publication-missing-article", "/seo-publication-missing-page"]) {
      try {
        const response = await fetcher(liveUrl(route)), document = await inspectHtml(parser, response.text);
        if (response.status !== 404 || !document.robots.some(value => /noindex/i.test(value)) || document.canonicals.length) throw new Error("Missing URL must be HTTP 404, noindex and have no canonical");
      } catch (error) { fail("404", canonicalOrigin + route, error.message); }
    }
    // Fetch only image URLs from the trusted build, with deduplication and a bounded budget.
    if (assets.size > 150) throw new Error("Image budget exceeded; review the catalog before increasing it");
    for (const url of assets) {
      report.currentUrl = url; checkpoint();
      try {
        const resource = new URL(url);
        if (resource.protocol !== "https:" || resource.username || resource.password) throw new Error("Expected an absolute HTTPS image URL");
        let response;
        if (origin) response = await fetcher(resource.origin === canonicalOrigin ? origin + resource.pathname + resource.search : url, true);
        else if (resource.origin === canonicalOrigin) {
          const file = path.join(directory, resource.pathname);
          if (!fs.existsSync(file)) { if (resource.pathname.startsWith("/api/og/")) { report.images.push({ url, result: "requires_live_function" }); continue; } throw new Error("Local image file is missing"); }
          response = { bytes: fs.readFileSync(file), status: 200, type: ({ ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" })[path.extname(file)] || "" };
        } else { report.images.push({ url, result: "requires_live_check" }); continue; }
        if (response.status !== 200 || !response.type.startsWith("image/")) throw new Error(`Expected image 200, got ${response.status} ${response.type}`);
        const dimensions = await imageDecoder.evaluate(data => new Promise(resolve => {
          const image = new Image(); const timer = setTimeout(() => resolve([0, 0]), 5000);
          image.onload = () => { clearTimeout(timer); resolve([image.naturalWidth, image.naturalHeight]); };
          image.onerror = () => { clearTimeout(timer); resolve([0, 0]); }; image.src = data;
        }), "data:" + response.type.split(";")[0] + ";base64," + response.bytes.toString("base64"));
        if (!dimensions[0] || !dimensions[1]) throw new Error("Image bytes do not decode");
        const digest = bytes => createHash("sha256").update(bytes).digest("hex");
        const localFile = path.join(directory, resource.pathname);
        const sha256 = digest(response.bytes);
        if (origin && resource.origin === canonicalOrigin && fs.existsSync(localFile) && sha256 !== digest(fs.readFileSync(localFile))) throw new Error("Published image bytes differ from this build");
        report.images.push({ url, result: "passed", bytes: response.bytes.length, width: dimensions[0], height: dimensions[1], sha256 });
      } catch (error) { fail("image", url, error.message); report.images.push({ url, result: "failed" }); }
    }
    report.status = report.errors.length ? "failed" : "passed";
    report.registry = { schemaVersion: 1, pages: registry.pages.map(row => ({ ...row,
      publication: { status: origin ? (report.status === "passed" ? "verified" : "needs_review") : row.publication.status,
        lastCheckedAt: origin ? report.checkedAt : row.publication.lastCheckedAt,
        lastVerifiedAt: origin && report.status === "passed" ? report.checkedAt : row.publication.lastVerifiedAt,
        revision: origin ? report.revision : row.publication.revision },
      // HTTP success never updates these manual, dated Google observations.
      google: row.google,
    })) };
    if (options.recordRegistry) {
      if (!origin || report.status !== "passed") throw new Error("Registry evidence is only recorded after a successful live release check");
      writeJson(registryPath, report.registry);
    }
  } catch (error) { fail("configuration_or_release", options.origin ? safeOrigin : directory, error.message); report.status = "failed"; }
  finally { report.currentUrl = null; await context?.close().catch(() => {}); await imageContext?.close().catch(() => {}); await browser?.close().catch(() => {}); checkpoint(); }
  return report;
}

async function main() {
  const { values } = parseArgs({ options: { url: { type: "string" }, revision: { type: "string" }, report: { type: "string", default: "seo-reports/publication.json" }, dir: { type: "string", default: "dist" }, registry: { type: "string", default: "../docs/seo/publication-registry.json" }, "sync-registry": { type: "boolean" }, "record-registry": { type: "boolean" }, "wait-seconds": { type: "string", default: "0" } } });
  if (!/^\d+$/.test(values["wait-seconds"]) || Number(values["wait-seconds"]) > 180) throw new Error("--wait-seconds must be 0..180");
  const report = await runChecks({ origin: values.url, revision: values.revision, directory: values.dir, registryPath: values.registry, syncRegistry: values["sync-registry"], recordRegistry: values["record-registry"], waitSeconds: Number(values["wait-seconds"]), reportPath: path.resolve(values.report) });
  writeJson(path.resolve(values.report), report);
  const lines = [`SEO publication check: ${report.status}`, `Mode: ${report.mode}; revision: ${report.revision || "local/unidentified"}`, `Pages: ${report.pages.length}; image checks: ${report.images.filter(row => row.result === "passed").length}; errors: ${report.errors.length}`];
  for (const error of report.errors) lines.push(`- ${error.code}: ${error.url} — ${error.message}`);
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n\n") + "\n\nGoogle indexing is reported separately in the dated registry. HTTP success is not proof of indexing.\n");
  if (report.status === "failed") process.exitCode = 1;
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { runChecks, synchronizeRegistry, inspectHtml, checkDocument };

