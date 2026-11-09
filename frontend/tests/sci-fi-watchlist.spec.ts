import { expect, test } from "@playwright/test";
import { mockQuizApi } from "./fixtures";

const url = "/blog/best-sci-fi-movies-2026";
const choices = [
  ["Project Hail Mary", "Prime Video subscription"],
  ["Disclosure Day", "Peacock subscription"],
  ["Good Luck, Have Fun, Don’t Die", "Hulu subscription"],
  ["Hoppers", "Disney+ subscription"],
  ["The End of Oak Street", "Digital rental or purchase"],
  ["Redux Redux", "Digital rental or purchase"],
  ["Rose of Nevada", "MUBI subscription"],
];

for (const width of [320, 1440]) {
  test(`the sci-fi watchlist compares released films and stays usable at ${width}px`, async ({ page }, testInfo) => {
    const calls = await mockQuizApi(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Best Sci-Fi Movies of 2026 So Far: A Spoiler-Free Watchlist");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://hard-quiz.com" + url);
    const table = page.getByRole("table");
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveCount(choices.length);
    for (const [index, [name, viewing]] of choices.entries()) {
      const row = rows.nth(index);
      const film = row.getByRole("link", { name, exact: true });
      await expect(film).toBeVisible();
      await expect(row.getByRole("link", { name: viewing })).toHaveAttribute("href", /^https:\/\//);
      const target = await film.getAttribute("href");
      await expect(page.locator(target!)).toHaveText(name);
    }

    const cover = page.locator('img[src="/blog-assets/best-sci-fi-movies-2026-cover.webp"]');
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    expect(await cover.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(width === 320 ? /-480\.webp$/ : /-800\.webp$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await table.screenshot({ path: testInfo.outputPath(`sci-fi-table-${width}.png`) });

    const stills = page.locator(".hq-film-still");
    await expect(stills).toHaveCount(choices.length);
    const variant = width === 320 ? /-illustration-480\.webp$/ : /-illustration-800\.webp$/;
    for (const [name] of choices) {
      const still = page.getByRole("region", { name, exact: true }).locator(".hq-film-still");
      const image = still.getByRole("img");
      await expect(image).toHaveAttribute("alt", /\S/);
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(still.locator("figcaption")).toHaveText(/\S/);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
      const display = await image.evaluate((el: HTMLImageElement) => ({
        src: el.currentSrc,
        fit: getComputedStyle(el).objectFit,
        ratio: el.clientWidth / el.clientHeight,
        originalRatio: Number(el.getAttribute("width")) / Number(el.getAttribute("height")),
      }));
      expect(display.src).toMatch(variant);
      expect(display.fit).toBe("contain");
      expect(display.ratio).toBeCloseTo(display.originalRatio, 1);
    }
    await stills.first().screenshot({ path: testInfo.outputPath(`sci-fi-illustration-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const contents = page.getByRole("navigation", { name: "Article contents" });
    await contents.locator("summary").click();
    await contents.getByRole("link", { name: "Rose of Nevada", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#rose-of-nevada")).toBeFocused();
    await expect(page.locator("#how-we-chose + p")).toContainText("Earlier festival premieres are allowed.");
    expect(calls).toEqual([]);
  });
}
