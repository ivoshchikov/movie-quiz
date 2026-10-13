import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mockQuizApi } from "./fixtures";

const slug = "best-horror-movies-2026";
const title = "Best Horror Movies of 2026 So Far: A Spoiler-Free Watchlist";
const image = "/blog-assets/best-horror-movies-2026-cover.webp";
const socialImage = "/blog-assets/best-horror-movies-2026-social.webp";

test("the new watchlist serves its complete text, own share image and canonical without JavaScript", async ({ browser }) => {
  const html = readFileSync(path.resolve(`dist/blog/${slug}.html`), "utf8");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route("**/assets/**", route => route.abort());
  await page.route("**" + image, route => route.fulfill({ contentType: "image/webp", path: "public" + image }));
  await page.route(`http://localhost:5173/blog/${slug}`, route => route.fulfill({ contentType: "text/html", body: html }));
  await page.goto(`/blog/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator(".hq-watchlist-entry")).toHaveCount(7);
  await expect(page.locator(".hq-release-index tbody tr")).toHaveCount(7);
  await expect(page).toHaveTitle("Best Horror Movies of 2026 So Far | Hard Quiz");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://hard-quiz.com/blog/${slug}`);
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) await expect(page.locator(selector)).toHaveAttribute("content", "https://hard-quiz.com" + socialImage);
  const cover = page.locator(`img[src="${image}"]`);
  await expect.poll(() => cover.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(1200);
  await expect(cover).toHaveAttribute("loading", "eager");
  await expect(page.locator(".hq-film-still")).toHaveCount(7);
  for (const still of await page.locator(".hq-film-still img").all()) {
    await expect(still).toHaveAttribute("loading", "lazy");
    await expect(still).toHaveAttribute("alt", /\S/);
    await expect(still).toHaveAttribute("width", /^[1-9]\d+$/);
    await expect(still).toHaveAttribute("height", /^[1-9]\d+$/);
  }
  const json = await page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.map(element => JSON.parse(element.textContent || "{}")).find(item => item["@type"] === "BlogPosting"));
  expect(json).toMatchObject({ headline: title, datePublished: "2026-10-12", dateModified: "2026-10-14", image: "https://hard-quiz.com" + socialImage, publisher: { name: "Hard Quiz" } });
  const sharePage = await context.newPage();
  await sharePage.route("**" + socialImage, route => route.fulfill({ contentType: "image/webp", path: "public" + socialImage }));
  await sharePage.setContent('<img src="https://hard-quiz.com' + socialImage + '" alt="Social cover">');
  await expect.poll(() => sharePage.locator("img").evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(Number(articleImageWidth(html)));
  const dimensions = await sharePage.locator("img").evaluate(element => ({ width: (element as HTMLImageElement).naturalWidth, height: (element as HTMLImageElement).naturalHeight }));
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", String(dimensions.width));
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", String(dimensions.height));
  expect(json.author).toBeUndefined();
  for (const file of ["sitemap.xml", "feed.xml"]) expect(readFileSync(path.resolve("dist/" + file), "utf8")).toContain(`https://hard-quiz.com/blog/${slug}`);
  await context.close();
});

function articleImageWidth(html: string) {
  return html.match(/property="og:image:width" content="(\d+)"/)?.[1] || "0";
}

for (const width of [1440, 390, 320]) test(`watchlist links, image and comparison remain usable at ${width}px`, async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/blog/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const rows = page.locator(".hq-release-index tbody tr");
  for (const row of await rows.all()) {
    const hash = await row.getByRole("link").getAttribute("href");
    await expect(page.locator(hash!)).toHaveCount(1);
  }
  await rows.first().getByRole("link").click();
  await expect(page.locator("#resident-evil")).toBeFocused();
  await expect(page.locator("#resident-evil")).toBeInViewport();
  for (const still of await page.locator(".hq-film-still img").all()) {
    await still.scrollIntoViewIfNeeded();
    await expect.poll(() => still.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const size = await still.evaluate(element => {
      const img = element as HTMLImageElement;
      return { actual: [img.naturalWidth, img.naturalHeight], declared: [Number(img.getAttribute("width")), Number(img.getAttribute("height"))], displayedHeight: img.getBoundingClientRect().height };
    });
    expect(size.actual).toEqual(size.declared);
    expect(size.displayedHeight).toBeLessThanOrEqual(361);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: "guide to aspect ratios and composition", exact: true })).toHaveAttribute("href", "/blog/why-2-39-1-feels-more-cinematic");
  await expect(page.getByRole("link", { name: "Hard Quiz's movie and actor quizzes", exact: true })).toHaveAttribute("href", "/");
  expect(calls).toEqual([]);
});
