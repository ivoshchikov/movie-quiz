import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { mockQuizApi } from "./fixtures";
const metadata = JSON.parse(readFileSync(path.resolve("src/blogMetadata.json"), "utf8")) as { title: string; description: string; intro: string; url: string };

const september = "New Movies in September 2025: 9 Biggest Theatrical Releases (US)";
const august = "New Movies in August 2025: The Only Guide You Need";
const explainer = "Why 2.39:1 Feels More Cinematic";
const cards = (page: Page) => page.locator(".hq-blog-card");
const guides = (page: Page) => page.getByRole("button", { name: "Movie guides, 2 articles", exact: true });
const explainers = (page: Page) => page.getByRole("button", { name: "Explainers, 1 article", exact: true });
const all = (page: Page) => page.getByRole("button", { name: "All, 3 articles", exact: true });

async function open(page: Page, url = "/blog") {
  const calls = await mockQuizApi(page);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();
  return calls;
}

async function collection(page: Page) {
  return page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.map(element => JSON.parse(element.textContent || "{}")).find(item => item["@type"] === "CollectionPage"));
}

test("the collection has accurate copy, chronological cards, counted topics and selective archives", async ({ page }) => {
  const calls = await open(page);
  await expect(page.locator(".hq-blog-intro")).toContainText(metadata.intro);
  await expect(cards(page).getByRole("heading", { level: 2 })).toHaveText([september, explainer, august]);
  await expect(page.getByRole("group", { name: "Article topics" }).getByRole("button")).toHaveCount(3);
  await expect(all(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".hq-blog-count")).toHaveText("3 articles");
  await expect(page.locator(".hq-blog-archive")).toHaveText(["2025 archive", "2025 archive"]);
  await expect(cards(page).filter({ hasText: explainer }).locator(".hq-blog-archive")).toHaveCount(0);
  await expect(cards(page).locator(".hq-blog-card-topic")).toHaveText(["Movie guides", "Explainers", "Movie guides"]);
  await expect(cards(page).locator("time")).toHaveText(["Sep 1, 2025", "Aug 15, 2025", "Aug 13, 2025"]);
  await expect(cards(page).first()).toContainText("~9 min read");
  expect(calls).toEqual([]);
});

test("filters survive reload and browser back/forward", async ({ page }) => {
  await open(page);
  await guides(page).click(); await expect(page).toHaveURL(/\/blog\?topic=streaming$/);
  await expect(cards(page)).toHaveCount(2); await expect(guides(page)).toHaveAttribute("aria-pressed", "true");
  await page.reload(); await expect(cards(page)).toHaveCount(2);
  await explainers(page).click(); await expect(cards(page)).toHaveCount(1);
  await expect(page.locator(".hq-blog-count")).toHaveText("1 article · Explainers");
  await page.goBack(); await expect(guides(page)).toHaveAttribute("aria-pressed", "true"); await expect(cards(page)).toHaveCount(2);
  await page.goForward(); await expect(explainers(page)).toHaveAttribute("aria-pressed", "true");
  await all(page).click(); await expect(page).toHaveURL("http://localhost:5173/blog"); await expect(cards(page)).toHaveCount(3);
});

test("an article and related article retain the selected collection after reload", async ({ page }) => {
  await open(page, "/blog?topic=streaming");
  await page.getByRole("link", { name: august, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(august);
  await page.reload();
  await expect(page.getByRole("link", { name: "← Back to blog" }).first()).toHaveAttribute("href", "/blog?topic=streaming");
  await page.getByRole("link", { name: /New Movies in September 2025:/ }).click();
  await page.getByRole("link", { name: "← Back to blog" }).first().click();
  await expect(page).toHaveURL(/\/blog\?topic=streaming$/); await expect(cards(page)).toHaveCount(2);
});

test("the cover and excerpt open the same native whole-card link", async ({ page }) => {
  await open(page);
  await expect(cards(page).first().getByRole("link")).toHaveCount(1);
  await expect(cards(page).first().getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("link", { name: september, exact: true })).toHaveAttribute("href", "/blog/september-2025-new-movies-guide");
  await cards(page).first().locator("img").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(september);
  await page.goBack(); await cards(page).last().locator(".hq-blog-excerpt").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(august);
});

test("card keyboard activation and a new tab use existing readable article URLs", async ({ page }) => {
  await open(page, "/blog?topic=explainers");
  const card = page.getByRole("link", { name: explainer, exact: true });
  await card.focus(); await expect(card).toBeFocused();
  expect(await card.evaluate(element => getComputedStyle(element).outlineStyle)).toBe("solid");
  const popupPromise = page.context().waitForEvent("page");
  await card.click({ modifiers: ["ControlOrMeta"] });
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/\/blog\/why-2-39-1-feels-more-cinematic$/);
  await expect(popup.getByRole("heading", { level: 1 })).toHaveText(explainer);
  await popup.close();
  await card.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(explainer);
});

for (const query of ["topic=unknown", "topic=", "topic=all", "topic=%3Cscript%3E", "topic=STREAMING"]) test(`unknown topic ${query} safely shows all articles`, async ({ page }) => {
  await open(page, `/blog?${query}`);
  await expect(cards(page)).toHaveCount(3); await expect(all(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", metadata.url);
});

test("a direct link to the empty known topic has an honest explanation and a way back", async ({ page }) => {
  await open(page, "/blog?topic=quizzes");
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No articles in this topic yet" })).toBeVisible();
  await expect(page.locator(".hq-blog-count")).toHaveText("0 articles · Stills & Faces");
  await page.getByRole("button", { name: "Show all articles" }).click();
  await expect(page).toHaveURL("http://localhost:5173/blog"); await expect(cards(page)).toHaveCount(3);
});

test("a trailing slash keeps the same filtered collection and clean canonical", async ({ page }) => {
  await open(page, "/blog/?topic=streaming");
  await expect(cards(page)).toHaveCount(2);
  await expect(page.locator("main")).toHaveClass(/hq-blog-main/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", metadata.url);
});

test("covers use three real declared assets, reserved space and lazy decoding", async ({ page }) => {
  await open(page);
  const images = cards(page).locator("img");
  await expect(images).toHaveCount(3);
  await expect(images.nth(0)).toHaveAttribute("src", /the-conjuring-last-rites\.webp$/);
  await expect(images.nth(1)).toHaveAttribute("src", /flat-vs-scope\.webp$/);
  await expect(images.nth(2)).toHaveAttribute("src", /bad-guys-2\.webp$/);
  await expect(images.nth(0)).toHaveAttribute("loading", "eager");
  await expect(images.nth(1)).toHaveAttribute("loading", "lazy");
  await expect(images.nth(2)).toHaveAttribute("decoding", "async");
  await expect(images.nth(0)).toHaveAttribute("alt", "");
  const box = await page.locator(".hq-blog-cover").first().boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
});

test("one failed cover falls back to an existing gallery image", async ({ page }) => {
  await mockQuizApi(page);
  await page.route("**/the-conjuring-last-rites.webp", route => route.abort());
  await page.goto("/blog");
  await expect(cards(page).first().locator("img")).toHaveAttribute("src", /demon-slayer-infinity-castle\.webp$/);
  await cards(page).first().locator(".hq-blog-excerpt").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(september);
});

test("exhausted image fallbacks keep a stable clickable card without a retry loop", async ({ page }) => {
  await mockQuizApi(page);
  let requests = 0;
  await page.route("**/storage/v1/object/public/**", route => { requests++; return route.abort(); });
  await page.goto("/blog");
  await expect(cards(page).locator("img")).toHaveCount(0);
  await expect(cards(page).first().locator(".hq-blog-cover-fallback")).toBeVisible();
  const first = await cards(page).first().boundingBox();
  const stableRequests = requests;
  await guides(page).click(); await all(page).click();
  // Existing keyed cards retain their exhausted fallback state.
  expect(requests - stableRequests).toBeLessThanOrEqual(5);
  expect((await cards(page).first().boundingBox())!.height).toBe(first!.height);
});

for (const [timezoneId, locale] of [["America/Los_Angeles", "en-US"], ["Pacific/Honolulu", "ru-RU"], ["Pacific/Kiritimati", "de-DE"]]) test(`calendar dates stay English in ${timezoneId}`, async ({ browser }) => {
  const context = await browser.newContext({ timezoneId, locale });
  const page = await context.newPage(); await open(page);
  await expect(cards(page).first().locator("time")).toHaveText("Sep 1, 2025");
  await page.getByRole("link", { name: september, exact: true }).click();
  await expect(page.locator("article > div time")).toHaveText("Sep 1, 2025");
  await context.close();
});

test("malformed dates and reading estimates fail validation and never crash the runtime list", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await open(page);
  const reasons = await page.evaluate(async () => {
    const { posts } = await import(new URL("/src/blog/index.ts", location.origin).href);
    const { validateBlogPosts } = await import(new URL("/src/blog/presentation.ts", location.origin).href);
    const reasons: string[] = [];
    for (const change of [{ date: "2025-02-30" }, { date: "bad-date" }, { readingMinutes: -1 }, { readingMinutes: Infinity }, { listingCoverUrl: "javascript:alert(1)" }]) {
      try { validateBlogPosts([{ ...posts[0], ...change }]); } catch (error) { reasons.push(String(error)); }
    }
    posts[0].date = "bad-date"; posts[0].readingMinutes = -1;
    return reasons;
  });
  expect(reasons).toHaveLength(5);
  await guides(page).click();
  await expect(cards(page).filter({ hasText: september })).toContainText("Date unavailable");
  await expect(cards(page).filter({ hasText: september })).not.toContainText("-1 min");
  expect(errors).toEqual([]);
});

test("filtered metadata keeps the complete canonical collection and working image URLs", async ({ page }) => {
  await open(page, "/blog?topic=explainers");
  await expect(page).toHaveTitle(metadata.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", metadata.description);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", metadata.url);
  for (const selector of ['meta[property="og:url"]']) await expect(page.locator(selector)).toHaveAttribute("content", metadata.url);
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) await expect(page.locator(selector)).toHaveAttribute("content", metadata.title);
  const json = await collection(page);
  expect(json.mainEntity.numberOfItems).toBe(3);
  expect(json.mainEntity.itemListElement.map((entry: { item: { datePublished: string } }) => entry.item.datePublished)).toEqual(["2025-09-01", "2025-08-15", "2025-08-13"]);
  expect(JSON.stringify(json)).not.toContain("/cover.webp");
  await guides(page).click(); expect(await collection(page)).toEqual(json);
});

test("the primary and Daily links select a next step without starting a game", async ({ page }) => {
  const calls = await open(page);
  await page.getByRole("link", { name: "Play a movie quiz", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(page.getByRole("button", { name: "Play Movie Stills", exact: true })).toBeVisible();
  await page.goBack(); await page.getByRole("link", { name: "Daily Challenge", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:5173/daily");
  expect(calls.filter(call => ["get_question", "start_daily_session", "submit_daily_result", "upsert_user_best"].includes(call.name))).toEqual([]);
});

for (const size of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) test(`cards, filters and actions remain usable at ${size.width}×${size.height}`, async ({ page }) => {
  await page.setViewportSize(size); await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const columns = await page.locator(".hq-blog-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(size.width <= 580 ? 1 : size.width <= 850 ? 2 : 3);
  for (const button of await page.locator(".hq-blog-topics button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  for (const link of await page.locator(".hq-blog-play-actions a").all()) { await link.scrollIntoViewIfNeeded(); expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44); }
  await expect(page.getByRole("link", { name: "Daily Challenge", exact: true })).toBeVisible();
});

test("reduced motion and large text preserve titles, focus and all actions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.setViewportSize({ width: 320, height: 568 }); await open(page);
  await page.addStyleTag({ content: ".hq-blog h2 { font-size:34px !important } .hq-blog-excerpt, .hq-blog-topic { font-size:26px !important }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await cards(page).first().getByRole("link").evaluate(element => getComputedStyle(element).transitionDuration)).toBe("0s");
  await guides(page).focus(); await page.keyboard.press("Enter"); await expect(cards(page)).toHaveCount(2);
  await cards(page).first().getByRole("link").focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(september);
});

test("the production HTML contains collection metadata, native article links and the specific Vercel route", () => {
  const htmlPath = path.resolve("dist/blog.html");
  test.skip(!existsSync(htmlPath), "The dedicated CI build job checks the generated production HTML.");
  const html = readFileSync(htmlPath, "utf8");
  expect(html).toContain('<title data-rh="true">Movie guides &amp; film explainers | Hard Quiz</title>');
  expect(html).toContain(`rel="canonical" href="${metadata.url}"`);
  expect(html).toContain('"@type":"CollectionPage"');
  expect(html).toContain('"numberOfItems":3');
  for (const slug of ["september-2025-new-movies-guide", "august-2025-new-movies-guide", "why-2-39-1-feels-more-cinematic"]) expect(html).toContain(`href="/blog/${slug}"`);
  expect(html).not.toContain("/cover.webp");
  const routes = JSON.parse(readFileSync(path.resolve("vercel.json"), "utf8")).routes;
  expect(routes.find((route: { src: string; dest?: string }) => route.src === "^/blog/?$")?.dest).toBe("/blog.html");
});
