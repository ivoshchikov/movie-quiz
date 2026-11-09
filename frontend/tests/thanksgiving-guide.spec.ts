import { expect, test } from "@playwright/test";
import { mockQuizApi } from "./fixtures";

for (const width of [320, 1440]) {
  test(`a reader can choose a Thanksgiving mood and inspect linked posters at ${width}px`, async ({ page }, testInfo) => {
    const calls = await mockQuizApi(page);
    const externalImages: string[] = [];
    page.on("request", request => {
      if (request.resourceType() === "image" && !request.url().startsWith("http://localhost:5173/")) externalImages.push(request.url());
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/blog/thanksgiving-movies-by-mood");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanksgiving Movies: What to Watch by Mood");
    await expect(page).toHaveTitle("Thanksgiving Movies: A Guide by Mood | Hard Quiz");
    await expect(page.locator(".hq-article-meta time").first()).toHaveAttribute("datetime", "2026-11-09");
    const table = page.getByRole("table");
    await expect(table.locator("tbody tr")).toHaveCount(7);
    await table.getByRole("link", { name: "Krisha", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#krisha")).toBeFocused();
    await expect(page.locator('section[aria-labelledby="krisha"]')).toContainText("Substance abuse");
    const figures = page.locator(".hq-store-poster");
    await expect(figures).toHaveCount(7);
    for (const figure of await figures.all()) {
      const image = figure.locator(".hq-article-image img");
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
      const store = await figure.locator("a").first().getAttribute("href");
      expect(store).toMatch(/^https:\/\/itunes\.apple\.com\/us\/movie\/.+\/id\d+\?uo=4$/);
      await expect(figure.locator(".hq-store-badge")).toHaveAttribute("href", store!);
      await expect(image).toHaveAttribute("alt", /Promotional store poster/);
      const ratio = await image.evaluate((element: HTMLImageElement) => ({ rendered: element.clientWidth / element.clientHeight, original: element.naturalWidth / element.naturalHeight }));
      expect(ratio.rendered).toBeCloseTo(ratio.original, 2);
    }
    await expect(page.locator('section[aria-labelledby="addams-family-values"]')).toContainText("not set during a Thanksgiving family visit");
    await page.locator('section[aria-labelledby="pieces-of-april"]').screenshot({ path: testInfo.outputPath(`thanksgiving-poster-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(externalImages).toEqual([]);
    await page.getByRole("link", { name: "Choose a game", exact: true }).click();
    await expect(page).toHaveURL("http://localhost:5173/");
    expect(calls.filter(call => ["quiz_start", "daily_begin", "submit_daily_answer", "quiz_finish"].includes(call.name))).toEqual([]);
  });
}
