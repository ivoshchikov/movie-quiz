import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { mockQuizApi } from "./fixtures";

const articles = [
  { slug: "august-2025-new-movies-guide", title: "August 2025 Movie Releases: 7 Picks (US)", date: "2025-08-13", films: 7 },
  { slug: "september-2025-new-movies-guide", title: "September 2025 Movie Releases: 9 Picks (US)", date: "2025-09-01", films: 9 },
  { slug: "why-2-39-1-feels-more-cinematic", title: "Why 2.39:1 Feels More Cinematic", date: "2025-08-15", films: 0 },
];
const url = (index: number) => "/blog/" + articles[index].slug;
async function open(page: Page, index = 0, suffix = "") {
  const calls = await mockQuizApi(page);
  await page.goto(url(index) + suffix);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(articles[index].title);
  return calls;
}
async function structuredArticle(page: Page) {
  return page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.map(element => JSON.parse(element.textContent || "{}")).filter(item => item["@type"] === "BlogPosting"));
}

for (const [index, article] of articles.entries()) {
  test(article.slug + " has a clear header, true dates, contents and official sources", async ({ page }) => {
    const calls = await open(page, index);
    await expect(page.locator(".hq-article-meta time").first()).toHaveAttribute("datetime", article.date);
    await expect(page.locator(".hq-article-meta")).toContainText("Updated Oct 9, 2026");
    await expect(page.locator(".hq-article-meta")).toContainText(/~[1-9]\d* min read/);
    await expect(page.locator(".hq-article-topic")).toHaveText(article.films ? "Movie guides" : "Explainers");
    await expect(page.getByRole("complementary", { name: "Archive notice" })).toHaveCount(article.films ? 1 : 0);
    if (article.films) await expect(page.locator(".hq-article-archive")).toContainText("Dates are historical");
    const contents = page.getByRole("navigation", { name: "Article contents" });
    await contents.locator("summary").click();
    const targets = await contents.getByRole("link").evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).hash.slice(1)));
    expect(targets.length).toBe(article.films ? article.films + 3 : 7);
    for (const id of targets) await expect(page.locator('[id="' + id + '"]')).toHaveCount(1);
    const sources = page.locator(".hq-article-sources a");
    expect(await sources.count()).toBeGreaterThanOrEqual(3);
    for (const link of await sources.all()) expect(await link.getAttribute("href")).toMatch(/^https:\/\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(calls).toEqual([]);
  });

  test(article.slug + " has the same clean SEO after JavaScript starts", async ({ page }) => {
    await open(page, index, "/?utm_source=fixture#sources");
    const canonical = "https://hard-quiz.com" + url(index);
    await expect(page).toHaveTitle(article.title + " | Hard Quiz");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(new URL(image!).origin).toBe("https://hard-quiz.com");
    expect(new URL(image!).searchParams.get("title")).toBe(article.title);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", image!);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    const json = await structuredArticle(page);
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({ headline: article.title, url: canonical, datePublished: article.date, dateModified: "2026-10-09", publisher: { name: "Hard Quiz" } });
    expect(json[0].author).toBeUndefined();
  });
}

test("release overviews link to all seven and nine films and reuse the same release dates", async ({ page }) => {
  await mockQuizApi(page);
  for (const [index, article] of articles.slice(0, 2).entries()) {
    await page.goto(url(index));
    const rows = page.locator(".hq-release-index tbody tr");
    await expect(rows).toHaveCount(article.films);
    await expect(page.locator(".hq-movie")).toHaveCount(article.films);
    for (const row of await rows.all()) {
      const hash = await row.getByRole("link").getAttribute("href");
      const movie = page.locator(".hq-movie").filter({ has: page.locator(hash!) });
      await expect(movie.locator("time")).toHaveAttribute("datetime", (await row.locator("time").getAttribute("datetime"))!);
    }
  }
});

test("the archived guides have verified directors, cast, titles and spoiler-free premises", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("region", { name: "Nobody 2", exact: true })).toContainText("Timo Tjahjanto");
  await expect(page.getByRole("heading", { name: "Freakier Friday", exact: true })).toBeAttached();
  await expect(page.getByRole("region", { name: "Honey Don't!", exact: true })).toContainText("Aubrey Plaza, Chris Evans, Charlie Day");
  await expect(page.getByRole("region", { name: "Ne Zha II", exact: true })).toContainText("English-language version");
  await expect(page.getByRole("region", { name: "Ne Zha II", exact: true }).locator("time")).toHaveAttribute("datetime", "2025-08-22");
  await page.goto(url(1));
  await expect(page.getByRole("region", { name: "HIM", exact: true })).toContainText("young quarterback");
  await expect(page.getByRole("region", { name: "HIM", exact: true })).toContainText("Monkeypaw Productions");
  await expect(page.getByRole("region", { name: "The Long Walk", exact: true })).toContainText("Cooper Hoffman, David Jonsson, Mark Hamill");
  await expect(page.getByRole("region", { name: "Gabby's Dollhouse: The Movie", exact: true })).toContainText("Ryan Crego");
  await expect(page.getByRole("heading", { name: "Spinal Tap II: The End Continues", exact: true })).toBeAttached();
  await expect(page.locator(".hq-article-prose")).not.toContainText(/\bTBA\b|\bTBD\b|Blumhouse|supernatural-family|box.office forecast/i);
});

test("direct sections, keyboard contents and browser history retain usable focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, 0, "#nobody-2");
  const nobody = page.getByRole("heading", { name: "Nobody 2", exact: true });
  await expect(nobody).toBeInViewport(); await expect(nobody).toBeFocused();
  await page.reload(); await expect(nobody).toBeFocused();
  const contents = page.getByRole("navigation", { name: "Article contents" });
  await contents.locator("summary").focus(); await page.keyboard.press("Enter");
  const link = contents.getByRole("link", { name: "Weapons", exact: true });
  await link.focus(); expect(await link.evaluate(element => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#weapons$/);
  await expect(page.getByRole("heading", { name: "Weapons", exact: true })).toBeFocused();
  await page.goBack(); await expect(nobody).toBeInViewport(); await expect(nobody).toBeFocused();
  await page.goForward(); await expect(page.getByRole("heading", { name: "Weapons", exact: true })).toBeInViewport();
});

test("the explainer compares one image early, keeps shapes intact, and explains the capture math", async ({ page }) => {
  await open(page, 2);
  const panels = page.locator(".hq-frame-pair img");
  await expect(panels).toHaveCount(2);
  expect(await panels.nth(0).getAttribute("src")).toBe(await panels.nth(1).getAttribute("src"));
  const wide = await panels.nth(0).boundingBox(), narrow = await panels.nth(1).boundingBox();
  expect(wide!.width / wide!.height).toBeCloseTo(2.39, 2);
  expect(narrow!.width / narrow!.height).toBeCloseTo(1.778, 2);
  expect(wide!.height).toBeCloseTo(narrow!.height, 0);
  expect(wide!.y).toBeLessThan((await page.locator("#what-scope-means").boundingBox())!.y);
  for (const panel of await panels.all()) expect(await panel.evaluate(element => getComputedStyle(element).objectFit)).toBe("cover");
  await expect(page.locator("#scope-today + ul")).toContainText("Expanding a full 4:3 image by 2 gives about 2.67:1");
  await expect(page.locator(".hq-optics figcaption")).toContainText("Schematic illustrations");
  await expect(page.locator(".hq-optics [role=img]")).toHaveCount(2);
});

test("related articles use a common topic and the explainer honestly offers more articles", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { name: "Related articles", exact: true })).toBeVisible();
  await expect(page.locator(".hq-article-card")).toHaveCount(1);
  await page.locator(".hq-article-card").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(articles[1].title);
  const json = await structuredArticle(page); expect(json).toHaveLength(1); expect(json[0].headline).toBe(articles[1].title);
  await page.goto(url(2));
  await expect(page.getByRole("heading", { name: "More articles", exact: true })).toBeVisible();
  await expect(page.locator(".hq-article-card")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Related articles", exact: true })).toHaveCount(0);
});

test("a failed image reserves its space, stops requests and resets on article navigation", async ({ page }) => {
  await mockQuizApi(page);
  let requests = 0;
  await page.route("**/bad-guys-2.webp", route => { requests++; return route.abort(); });
  await page.goto(url(0));
  const figure = page.getByRole("region", { name: "The Bad Guys 2", exact: true }).locator("figure");
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByRole("img", { name: /Image unavailable/ })).toBeVisible();
  const box = await figure.locator(".hq-article-image").boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(2 / 3, 2);
  await page.locator(".hq-article-card").click();
  await page.locator(".hq-movie-poster").first().scrollIntoViewIfNeeded();
  await expect(page.locator(".hq-movie-poster img").first()).toBeVisible();
  await expect(page.locator(".hq-movie-poster img").first()).toHaveAttribute("loading", "lazy");
  await expect(page.locator(".hq-movie-poster img").first()).toHaveAttribute("decoding", "async");
  await expect(page.locator(".hq-article-image-fallback")).toHaveCount(0);
  expect(requests).toBe(1);
});

test("failed comparison images preserve both ratios and still explain the example", async ({ page }) => {
  await mockQuizApi(page);
  await page.route("**/composition-staging.webp", route => route.abort());
  await page.goto(url(2));
  await expect(page.locator(".hq-frame-pair .hq-article-image-fallback")).toHaveCount(2);
  await expect(page.locator(".hq-frame-comparison figcaption")).toContainText("same scene");
  const boxes = await page.locator(".hq-frame-pair .hq-article-image").all();
  expect((await boxes[0].boundingBox())!.width / (await boxes[0].boundingBox())!.height).toBeCloseTo(2.39, 2);
});

test("reading estimates follow rendered prose and agree with the collection", async ({ page }) => {
  await open(page, 1);
  const values = await page.evaluate(async () => {
    const { posts } = await import(new URL("/src/blog/index.ts", location.origin).href);
    const { estimateReadingMinutes } = await import(new URL("/src/blog/reading.ts", location.origin).href);
    return { minutes: posts.map((post: { readingMinutes: number }) => post.readingMinutes), short: estimateReadingMinutes("words ".repeat(100)), long: estimateReadingMinutes("words ".repeat(601)) };
  });
  expect(values.short).toBe(1); expect(values.long).toBe(4);
  const text = await page.locator(".hq-article-meta").innerText();
  await page.getByRole("link", { name: "← Back to blog" }).first().click();
  const card = page.locator(".hq-blog-card").filter({ hasText: articles[1].title });
  const minutes = (await card.innerText()).match(/~\d+ min read/)![0];
  expect(text).toContain(minutes);
  expect(values.minutes.every((value: number) => value > 0 && value < 8)).toBe(true);
});

test("editorial data checks reject impossible update dates, duplicate sections and unsafe sources", async ({ page }) => {
  await open(page);
  const failures = await page.evaluate(async () => {
    const { posts } = await import(new URL("/src/blog/index.ts", location.origin).href);
    const { validateBlogPosts } = await import(new URL("/src/blog/presentation.ts", location.origin).href);
    const failures: string[] = [];
    for (const change of [{ modified: "2026-02-30" }, { modified: "2024-01-01" }, { contents: [{ id: "one", label: "One" }, { id: "one", label: "Again" }] }, { sources: [{ label: "Unsafe", url: "javascript:alert(1)" }] }]) {
      try { validateBlogPosts([{ ...posts[0], ...change }]); } catch (error) { failures.push(String(error)); }
    }
    return failures;
  });
  expect(failures).toHaveLength(4);
});

for (const missing of ["not-a-real-article", "nested/missing", "_not-found.html"]) test("unknown article " + missing + " remains a readable noindex page", async ({ page }) => {
  await mockQuizApi(page); await page.goto("/blog/" + missing);
  await expect(page).toHaveURL("http://localhost:5173/blog/" + missing);
  await expect(page.getByRole("heading", { name: "Article not found", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  expect(await structuredArticle(page)).toEqual([]);
  await page.getByRole("link", { name: "Back to blog", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:5173/blog");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
});

test("article actions explain guest access and do not start a quiz or Daily attempt", async ({ page }) => {
  const calls = await open(page);
  await expect(page.locator(".hq-article-cta")).toContainText("Movie quizzes are open to guests. Daily requires an account.");
  await page.getByRole("link", { name: "Choose a quiz", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play Movie Stills", exact: true })).toBeVisible();
  await page.goBack(); await page.getByRole("link", { name: "Try Daily", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:5173/daily");
  expect(calls.filter(call => ["get_question", "start_daily_session", "submit_daily_result", "upsert_user_best"].includes(call.name))).toEqual([]);
});

for (const size of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  for (const [index, article] of articles.entries()) test(article.slug + " reflows at " + size.width + "x" + size.height, async ({ page }) => {
    await page.setViewportSize(size); await open(page, index);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(".hq-article-contents summary").click();
    for (const link of await page.locator(".hq-article-contents a").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (article.films) {
      const poster = await page.locator(".hq-movie-poster").first().boundingBox();
      expect(poster!.width).toBeLessThanOrEqual(152);
      expect((await page.locator(".hq-movie-heading").first().boundingBox())!.y).toBeLessThan(poster!.y);
    } else {
      const round = await page.locator(".hq-optics-lights:not(.hq-optics-ovals) span").first().boundingBox();
      const oval = await page.locator(".hq-optics-ovals span").first().boundingBox();
      expect(round!.width / round!.height).toBeCloseTo(1, 2);
      expect(oval!.height / oval!.width).toBeCloseTo(2, 2);
    }
    for (const link of await page.locator(".hq-article-actions a").all()) { await link.scrollIntoViewIfNeeded(); expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("large text reflows in the smallest layout without clipping facts, comparison or actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await mockQuizApi(page);
  for (const [index] of articles.entries()) {
    await page.goto(url(index));
    await page.addStyleTag({ content: ".hq-article-prose, .hq-movie-facts, .hq-release-index th, .hq-release-index td { font-size: 26px !important } .hq-article h1 { font-size: 42px !important } .hq-article-meta { font-size: 24px !important }" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(articles[index].title);
    await page.getByRole("link", { name: "Choose a quiz", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: "Choose a quiz", exact: true })).toBeInViewport();
  }
});

test("generated articles are complete without JavaScript, preserve RSS URLs, and route unknown articles to HTTP 404", async ({ browser }) => {
  test.skip(!existsSync(path.resolve("dist/blog/" + articles[0].slug + ".html")), "The build job checks generated article HTML.");
  const routes = JSON.parse(readFileSync(path.resolve("vercel.json"), "utf8")).routes as { src?: string; dest?: string; status?: number; headers?: Record<string, string> }[];
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route("**/assets/**", route => route.abort());
  await page.route("**/storage/**", route => route.abort());
  await page.route("http://localhost:5173/blog/**", route => {
    const pathname = new URL(route.request().url()).pathname;
    const rule = routes.find(rule => rule.src && new RegExp(rule.src).test(pathname));
    if (!rule?.dest) return route.abort();
    const destination = pathname.replace(new RegExp(rule.src!), rule.dest);
    return route.fulfill({ status: rule.status || 200, contentType: "text/html", body: readFileSync(path.resolve("dist" + destination), "utf8") });
  });
  for (const [index, article] of articles.entries()) {
    await page.goto(url(index));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(article.title);
    await expect(page.locator(".hq-movie")).toHaveCount(article.films);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://hard-quiz.com" + url(index));
    const json = await structuredArticle(page); expect(json).toHaveLength(1); expect(json[0].datePublished).toBe(article.date);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    expect(readFileSync(path.resolve("dist/feed.xml"), "utf8")).toContain("https://hard-quiz.com" + url(index));
    const redirect = routes.find(rule => rule.src && new RegExp(rule.src).test(url(index) + ".html"));
    expect(redirect?.status).toBe(301);
    const sitemap = readFileSync(path.resolve("dist/sitemap.xml"), "utf8");
    expect(sitemap).toContain("<loc>https://hard-quiz.com" + url(index) + "</loc><lastmod>2026-10-09</lastmod>");
    await expect(page.locator(".hq-article-sources a").first()).toBeVisible();
  }
  const response = await page.goto("/blog/not-a-real-article");
  expect(response!.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Article not found", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  expect(await structuredArticle(page)).toEqual([]);
  await context.close();
});
