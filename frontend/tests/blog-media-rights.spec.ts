import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mockQuizApi } from "./fixtures";

const retirement = JSON.parse(readFileSync("../docs/blog/image-rights-retirement-2026-11-09.json", "utf8")) as { affectedArticles: string[]; retiredPublicFiles: { src: string }[] };
const retired = new Set(retirement.retiredPublicFiles.map(item => item.src));

for (const width of [320, 1440]) test(`all replaced blog media stays original, labeled and usable at ${width}px`, async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const calls = await mockQuizApi(page);
  await page.setViewportSize({ width, height: 900 });
  for (const slug of retirement.affectedArticles) {
    await page.goto(`/blog/${slug}`);
    await expect(page.locator(".hq-article-meta time").last()).toHaveAttribute("datetime", "2026-11-09");
    for (const image of await page.locator(".hq-article-prose img").all()) {
      const src = await image.getAttribute("src");
      expect(src).toMatch(/^\/blog-assets\//);
      expect(retired.has(src!)).toBe(false);
      for (const candidate of (await image.getAttribute("srcset") || "").split(",").filter(Boolean)) expect(retired.has(candidate.trim().split(/\s+/)[0])).toBe(false);
      await expect(image).toHaveAttribute("alt", /original|illustration/i);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
      if (src!.startsWith("/blog-assets/original/")) await expect(image.locator("xpath=ancestor::figure[1]").locator("figcaption")).toContainText(/original/i);
    }
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      const src = new URL((await page.locator(selector).getAttribute("content"))!);
      expect(src.origin).toBe("https://hard-quiz.com");expect(retired.has(src.pathname)).toBe(false);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (["november-2026-movie-releases", "why-2-39-1-feels-more-cinematic", "august-2025-new-movies-guide"].includes(slug)) {
      const figure = page.locator(".hq-article-prose figure").last();
      await figure.screenshot({ path: testInfo.outputPath(`${slug}-${width}.png`) });
    }
  }
  expect(calls).toEqual([]);
});
