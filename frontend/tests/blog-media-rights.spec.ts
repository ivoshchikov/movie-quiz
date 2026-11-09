import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mockQuizApi } from "./fixtures";

const ledger = JSON.parse(readFileSync("../docs/blog/image-rights-ledger.json", "utf8")) as { retiredPublicFiles: string[] };
const retired = new Set(ledger.retiredPublicFiles);
const articles: Record<string, number> = {
  "sci-fi-mystery-movies": 10, "best-sci-fi-movies-2026": 7,
  "completed-miniseries-to-watch": 0, "movies-like-knives-out": 7,
  "november-2026-movie-releases": 0, "is-whalefall-based-on-a-book": 0,
  "best-horror-movies-2026": 7, "september-2025-new-movies-guide": 8,
  "august-2025-new-movies-guide": 7, "why-2-39-1-feels-more-cinematic": 0,
  "thanksgiving-movies-by-mood": 7, "best-thriller-movies-2026": 0,
};

for (const width of [320, 1440]) test(`real blog media keeps its credits and promotional context at ${width}px`, async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const calls = await mockQuizApi(page);
  await page.setViewportSize({ width, height: 900 });
  for (const [slug, posterCount] of Object.entries(articles)) {
    await page.goto(`/blog/${slug}`);
    if (slug !== "best-thriller-movies-2026") await expect(page.locator(".hq-article-meta time").last()).toHaveAttribute("datetime", "2026-11-09");
    await expect(page.locator(".hq-store-poster")).toHaveCount(posterCount);
    for (const image of await page.locator(".hq-article-prose img").all()) {
      const src = await image.getAttribute("src");
      expect(src).toMatch(/^\/blog-assets\//);
      expect(retired.has(src!)).toBe(false);
      for (const candidate of (await image.getAttribute("srcset") || "").split(",").filter(Boolean)) expect(retired.has(candidate.trim().split(/\s+/)[0])).toBe(false);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
      if (src!.startsWith("/blog-assets/posters/") || (src!.startsWith("/blog-assets/thanksgiving-") && src!.includes("-poster"))) {
        await expect(image).toHaveAttribute("alt", /^(Poster for|Promotional store poster)/);
        const figure = image.locator("xpath=ancestor::figure[1]");
        const layout = figure.locator("..");
        const copy = layout.locator(":scope > .hq-film-copy, :scope > .hq-movie-info");
        await expect(copy).toHaveCount(1);
        const posterBox = (await figure.boundingBox())!, copyBox = (await copy.boundingBox())!;
        if (width > 600) {
          expect(copyBox.x - (posterBox.x + posterBox.width)).toBeGreaterThanOrEqual(23);
          expect(Math.abs(copyBox.y - posterBox.y)).toBeLessThanOrEqual(1);
          expect(posterBox.width).toBeCloseTo(190, 0);
        } else {
          expect(copyBox.y - (posterBox.y + posterBox.height)).toBeGreaterThanOrEqual(17);
          expect(copyBox.width).toBeGreaterThan(posterBox.width);
          expect(posterBox.width).toBeCloseTo(180, 0);
        }
        await expect(figure.locator("figcaption")).toContainText("Promotional store poster via Apple iTunes");
        const posterLink = figure.locator(":scope > a").first();
        const badge = figure.locator(".hq-store-badge");
        await expect(posterLink).toHaveAttribute("href", /^https:\/\/itunes\.apple\.com\/us\/movie\/.+\/id\d+\?uo=4$/);
        await expect(badge).toHaveAttribute("href", (await posterLink.getAttribute("href"))!);
        const height = (await badge.locator("img").boundingBox())!.height;
        expect(height).toBeGreaterThanOrEqual(30);
        const clearSpace = await badge.evaluate(element => parseFloat(getComputedStyle(element).paddingTop));
        expect(clearSpace).toBeGreaterThanOrEqual(height / 10);
      }
      if (src!.startsWith("/blog-assets/frames/")) {
        const caption = image.locator("xpath=ancestor::figure[1]").locator("figcaption");
        await expect(caption).toContainText("Blender Foundation / Project Mango");
        await expect(caption.getByRole("link", { name: "CC BY 3.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/3.0/");
      }
    }
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      const src = new URL((await page.locator(selector).getAttribute("content"))!);
      expect(src.origin).toBe("https://hard-quiz.com");expect(retired.has(src.pathname)).toBe(false);
      expect(src.pathname).not.toMatch(/\/posters\/|\/frames\//);
    }
    await expect(page.locator(".hq-editorial-illustration")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    if (["why-2-39-1-feels-more-cinematic", "august-2025-new-movies-guide"].includes(slug)) {
      await page.locator(".hq-article-prose figure").last().screenshot({ path: testInfo.outputPath(`${slug}-${width}.png`) });
    }
    if (["best-horror-movies-2026", "thanksgiving-movies-by-mood", "sci-fi-mystery-movies"].includes(slug)) {
      await page.locator(".hq-film-layout").first().screenshot({ path: testInfo.outputPath(`${slug}-layout-${width}.png`) });
    }
  }
  expect(calls).toEqual([]);
});
