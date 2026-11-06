import { expect, test } from "@playwright/test";
import { mockQuizApi } from "./fixtures";

for (const width of [320, 1440]) {
  test(`a reader can compare mysteries and reach each film at ${width}px`, async ({ page }, testInfo) => {
    const calls = await mockQuizApi(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/blog/sci-fi-mystery-movies");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("10 Sci-Fi Mystery Movies for Your Next Movie Night");
    await expect(page).toHaveTitle("10 Sci-Fi Mystery Movies: A Spoiler-Free Watchlist | Hard Quiz");
    const table = page.getByRole("table");
    const rows = table.locator("tbody tr");
    await expect(rows).toHaveCount(10);
    for (const row of await rows.all()) {
      const link = row.getByRole("rowheader").getByRole("link");
      const name = await link.innerText();
      const target = await link.getAttribute("href");
      await expect(page.locator(target!)).toContainText(name);
      await expect(row.locator("td").last().getByRole("link")).toHaveAttribute("href", /^https:\/\//);
    }
    await expect(table).toContainText("111 min — Director's Cut");
    await expect(table).toContainText("Paramount+ subscription");
    await expect(table).toContainText("Digital rental or purchase");
    const cover = page.locator('img[src="/blog-assets/sci-fi-mystery-movies-cover.webp"]');
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    expect(await cover.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(width === 320 ? /-480\.webp$/ : /-800\.webp$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await table.screenshot({ path: testInfo.outputPath(`mystery-table-${width}.png`) });
    const contents = page.getByRole("navigation", { name: "Article contents" });
    await contents.locator("summary").click();
    await contents.getByRole("link", { name: "Dark City", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#dark-city")).toBeFocused();
    await page.getByRole("link", { name: "Choose a game", exact: true }).click();
    await expect(page).toHaveURL("http://localhost:5173/");
    expect(calls.filter(call => ["quiz_start", "daily_begin", "submit_daily_answer", "quiz_finish"].includes(call.name))).toEqual([]);
  });
}
