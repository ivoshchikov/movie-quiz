import { test, expect } from "@playwright/test";
import { mockQuizApi } from "./fixtures";

test.use({ deviceScaleFactor: 2 });

for (const width of [320, 390, 768, 1440]) {
  for (const month of ["august", "september"]) {
    test(`${month} posters load a small real image at ${width}px and 2x density`, async ({ page }) => {
      const calls = await mockQuizApi(page);
      await page.setViewportSize({ width, height: 844 });
      const oversized: string[] = [];
      page.on("request", request => {
        if (request.url().includes("/storage/v1/object/public/blog/new_releases/")) oversized.push(request.url());
      });
      await page.goto(`/blog/${month}-2025-new-movies-guide`);
      const poster = page.locator(".hq-movie-poster img").first();
      await poster.scrollIntoViewIfNeeded();
      await expect.poll(() => poster.evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
      const src = await poster.evaluate(image => (image as HTMLImageElement).currentSrc);
      expect(new URL(src).pathname).toMatch(/\/blog-assets\/responsive\/.+-320\.webp$/);
      const response = await page.request.get(src);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/webp");
      expect((await response.body()).length).toBeLessThan(50_000);
      await expect(poster).toHaveAttribute("loading", "lazy");
      await expect(poster).toHaveAttribute("alt", /theatrical poster/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(oversized).toEqual([]);
      expect(calls).toEqual([]);
    });
  }

  test(`passive home preview uses a reduced image at ${width}px and 2x density`, async ({ page }) => {
    const calls = await mockQuizApi(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const preview = page.locator(".hq-preview-frame img");
    await preview.scrollIntoViewIfNeeded();
    await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    const src = await preview.evaluate(image => (image as HTMLImageElement).currentSrc);
    expect(new URL(src).pathname).toMatch(/\/blog-assets\/responsive\/classic-preview-(320|640|960)\.webp$/);
    expect((await (await page.request.get(src)).body()).length).toBeLessThan(60_000);
    await expect(preview).toHaveAttribute("width", "640");
    await expect(preview).toHaveAttribute("height", "356");
    expect(calls.some(call => /^(quiz_start|start_daily_session|attack_start|comparison_start)$/.test(call.name))).toBe(false);
  });
}

for (const width of [390, 1440]) {
  test(`archive listing covers stay sharp and cropped at ${width}px`, async ({ page }) => {
    await mockQuizApi(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/blog");
    const card = page.locator(".hq-blog-card").filter({ hasText: "September 2025 Movie Releases" });
    const image = card.locator("img");
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    const src = await image.evaluate(node => (node as HTMLImageElement).currentSrc);
    expect(new URL(src).pathname).toMatch(/the-conjuring-last-rites-(640|960)\.webp$/);
    const box = await card.locator(".hq-blog-cover").boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
    expect(await image.evaluate(node => getComputedStyle(node).objectFit)).toBe("cover");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
