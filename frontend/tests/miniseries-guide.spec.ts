import { test, expect } from "@playwright/test";
import { mockQuizApi } from "./fixtures";

const title = "10 Completed Miniseries to Watch Over a Weekend";
const url = "/blog/completed-miniseries-to-watch";

test("the weekend guide distinguishes episode counts, total times and the limits of closure", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const rows = page.locator("#weekend-picks + p + table tbody tr");
  await expect(rows).toHaveCount(10);
  const expected = [
    ["Unorthodox", "4 episodes", "About 3h 35m"],
    ["When They See Us", "4 episodes", "About 4h 55m"],
    ["Chernobyl", "5 episodes", "About 5h 25m"],
    ["Normal People", "12 episodes", "About 5h 40m"],
    ["Five Days at Memorial", "8 episodes", "About 6h 20m"],
    ["The Queen's Gambit", "7 episodes", "About 6h 35m"],
    ["One Day", "14 episodes", "About 6h 40m"],
    ["Godless", "7 episodes", "About 7h 30m"],
    ["Station Eleven", "10 episodes", "About 8h 25m"],
    ["Maid", "10 episodes", "About 9h"],
  ];
  for (const [index, [name, episodes, time]] of expected.entries()) {
    await expect(rows.nth(index).locator("th a")).toHaveText(name);
    await expect(rows.nth(index)).toContainText(episodes);
    await expect(rows.nth(index)).toContainText(time);
    const id = await rows.nth(index).locator("th a").getAttribute("href");
    await expect(page.locator(id!).locator("..")).toContainText(time);
  }
  await expect(page.locator("#what-completed-means + p")).toContainText("deliberately open final choice");
  await expect(page.locator("#how-we-checked").locator("..") ).toContainText("nearest five minutes");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://hard-quiz.com" + url);
  await expect(page.locator(".hq-article-meta time")).toHaveCount(1);
  await expect(page.locator(".hq-article-meta time")).toHaveAttribute("datetime", "2026-11-01");
  expect(calls).toEqual([]);
});

for (const width of [320, 390, 768, 1440]) test(`miniseries comparison, cover and contents are usable at ${width}px`, async ({ page }, testInfo) => {
  await mockQuizApi(page);
  await page.setViewportSize({ width, height: 900 });
  const requested: string[] = [];
  page.on("request", request => requested.push(new URL(request.url()).pathname));
  await page.goto(url);
  const cover = page.locator(".hq-article-prose img").first();
  await cover.scrollIntoViewIfNeeded();
  await expect.poll(() => cover.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const image = await cover.evaluate(el => ({ src: (el as HTMLImageElement).currentSrc, ratio: el.getBoundingClientRect().width / el.getBoundingClientRect().height }));
  expect(image.src).toMatch(new RegExp(`-${width < 620 ? 480 : 800}\\.webp$`));
  expect(image.ratio).toBeCloseTo(16 / 9, 2);
  const stills = page.locator(".hq-film-still img");
  await expect(stills).toHaveCount(10);
  expect(requested.some(path => path.includes("miniseries-maid-still"))).toBe(false);
  for (const still of await stills.all()) {
    await expect(still).toHaveAttribute("loading", "lazy");
    await expect(still).toHaveAttribute("alt", /\S/);
    const before = await still.locator("..").boundingBox();
    await still.scrollIntoViewIfNeeded();
    await expect.poll(() => still.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const loaded = await still.evaluate(el => {
      const img = el as HTMLImageElement;
      const box = img.getBoundingClientRect();
      return { src: img.currentSrc, height: box.height, expectedHeight: box.width * Number(img.getAttribute("height")) / Number(img.getAttribute("width")), fit: getComputedStyle(img).objectFit };
    });
    expect(loaded.src).toMatch(new RegExp(`-still-${width < 620 ? 480 : 800}\\.webp$`));
    expect(loaded.fit).toBe("contain");
    expect(Math.abs(loaded.height - loaded.expectedHeight)).toBeLessThanOrEqual(1);
    const after = await still.locator("..").boundingBox();
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
  }
  const firstFigure = page.locator(".hq-film-still").first();
  await firstFigure.scrollIntoViewIfNeeded();
  await firstFigure.locator("img").evaluate(el => (el as HTMLImageElement).decode());
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await firstFigure.screenshot({ path: testInfo.outputPath(`miniseries-still-${width}.png`) });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const viewingCells = page.locator(".hq-release-index tbody td:last-child");
  await expect(viewingCells).toHaveCount(10);
  for (const cell of await viewingCells.all()) {
    const box = await cell.boundingBox();
    expect(box!.width).toBeGreaterThan(60);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.height).toBeLessThan(350);
  }
  const contents = page.getByRole("navigation", { name: "Article contents" });
  await contents.locator("summary").click();
  const target = contents.getByRole("link", { name: "Normal People", exact: true });
  await target.focus(); await page.keyboard.press("Enter");
  await expect(page.locator("#normal-people")).toBeFocused();
  await expect(page).toHaveURL(/#normal-people$/);
  await page.locator("#weekend-picks").scrollIntoViewIfNeeded();
  await page.locator(".hq-release-index").screenshot({ path: testInfo.outputPath(`miniseries-table-${width}.png`) });
});
