import { test, expect } from "@playwright/test";
import { mockQuizApi } from "./fixtures";

for (const width of [390, 1440]) test(`mystery guide loads appropriately sized stills without shifting their proportions at ${width}px`, async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.setViewportSize({ width, height: 900 });
  const requested: string[] = [];
  page.on("request", request => requested.push(new URL(request.url()).pathname));
  await page.goto("/blog/movies-like-knives-out");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("10 Movies Like Knives Out: Whodunits to Match Your Mood");
  const stills = page.locator(".hq-film-still img");
  await expect(stills).toHaveCount(10);
  expect(requested.some(url => url.includes("knives-out-deathtrap-still"))).toBe(false);
  for (const still of await stills.all()) {
    await expect(still).toHaveAttribute("loading", "lazy");
    await expect(still).toHaveAttribute("alt", /\S/);
    const before = await still.locator("..").boundingBox();
    await still.scrollIntoViewIfNeeded();
    await expect.poll(() => still.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const image = await still.evaluate(element => {
      const img = element as HTMLImageElement;
      return {
        src: img.currentSrc,
        declaredRatio: img.width / img.height,
        naturalRatio: img.naturalWidth / img.naturalHeight,
        fit: getComputedStyle(img).objectFit,
      };
    });
    expect(image.src).toMatch(new RegExp(`-still-${width < 620 ? 480 : 800}\\.webp$`));
    expect(image.fit).toBe("contain");
    expect(image.declaredRatio).toBeCloseTo(image.naturalRatio, 1);
    const after = await still.locator("..").boundingBox();
    expect(after!.height).toBeCloseTo(before!.height, 0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(calls).toEqual([]);
});
