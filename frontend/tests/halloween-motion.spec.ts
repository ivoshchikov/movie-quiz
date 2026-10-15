import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { mockQuizApi } from "./fixtures";
import { dailyFixture } from "./daily-fixtures";

const visitor = (page: Page) => page.locator(".hq-haunt-visitor");
async function prepare(page: Page) {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("hard-quiz-theme", "halloween"));
  await mockQuizApi(page);
}
async function waitForTheme(page: Page) {
  await expect(page.getByRole("button", { name: "Pause Halloween animations" })).toBeVisible();
}
async function pose(page: Page, name: string, time = 2000) {
  return page.evaluate(({ name, time }) => {
    const animation = document.getAnimations().find(item => item instanceof CSSAnimation && item.animationName === name);
    if (!animation) throw new Error(`Missing animation: ${name}`);
    animation.pause(); animation.currentTime = time;
    const target = (animation.effect as KeyframeEffect).target as HTMLElement;
    const rect = target.getBoundingClientRect();
    return { x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom, width: rect.width, height: rect.height, transform: getComputedStyle(target).transform };
  }, { name, time });
}

for (const width of [320, 1440]) test(`${width}px: occasional visitors move, stay clipped and never intercept controls`, async ({ page }) => {
  await prepare(page); await page.setViewportSize({ width, height: 900 });
  await page.goto("/"); await waitForTheme(page);
  await expect(visitor(page)).toHaveCount(0);
  await page.clock.runFor(10_000);
  await expect(page.locator(".hq-haunt-visitor-spider")).toHaveCount(1);
  await expect(page.locator(".hq-haunt-visitors")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".hq-haunt-visitors")).toHaveCSS("pointer-events", "none");
  const earlier = await pose(page, "hq-spider-run", 1000);
  const spider = await pose(page, "hq-spider-run");
  expect(spider.x - earlier.x).toBeGreaterThan(20);
  expect(spider.x).toBeGreaterThan(0); expect(spider.right).toBeLessThan(width);
  expect(spider.bottom).toBeLessThanOrEqual(900); expect(spider.y).toBeGreaterThan(840);
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".hq-haunt-visitors") !== null, { x: spider.x + spider.width / 2, y: spider.y + spider.height / 2 });
  expect(hit).toBe(false);
  if (process.env.HQ_THEME_VISUAL_DIR) {
    mkdirSync(process.env.HQ_THEME_VISUAL_DIR, { recursive: true });
    await page.screenshot({ path: `${process.env.HQ_THEME_VISUAL_DIR}/spider-${width}.png` });
  }
  await page.clock.runFor(4_000);
  await expect(visitor(page)).toHaveCount(0);
  await page.clock.runFor(31_000);
  await expect(visitor(page)).toHaveCount(0);
  await page.clock.runFor(1_000);
  await expect(page.locator(".hq-haunt-visitor-witch")).toHaveCount(1);
  const witch = await pose(page, "hq-witch-flight");
  expect(witch.x).toBeGreaterThan(width - 140); expect(witch.x).toBeLessThan(width);
  expect(witch.y).toBeGreaterThan(90);
  if (process.env.HQ_THEME_VISUAL_DIR) await page.screenshot({ path: `${process.env.HQ_THEME_VISUAL_DIR}/witch-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Pause Halloween animations" })).toBeInViewport();
  await page.clock.runFor(4_000); await expect(visitor(page)).toHaveCount(0);
});

test("keyboard pause stops a visit and stays paused across navigation; another theme clears pending visits", async ({ page }) => {
  await prepare(page); await page.goto("/"); await waitForTheme(page);
  await page.clock.runFor(10_000); await expect(visitor(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Pause Halloween animations" }).focus();
  await page.keyboard.press("Enter");
  const resume = page.getByRole("button", { name: "Resume Halloween animations" });
  await expect(resume).toBeFocused();
  await expect(visitor(page)).toHaveCount(0);
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();
  await page.clock.runFor(120_000); await expect(visitor(page)).toHaveCount(0);
  await resume.click(); await page.clock.runFor(10_000); await expect(visitor(page)).toHaveCount(1);
  const slider = page.getByRole("slider", { name: "Color theme" });
  await slider.focus(); await slider.press("Home");
  await expect(page.locator(".hq-haunt")).toHaveCount(0);
  await page.clock.runFor(120_000); await expect(visitor(page)).toHaveCount(0);
  await slider.press("End"); await waitForTheme(page);
  await page.clock.runFor(9_000); await expect(visitor(page)).toHaveCount(0);
  await page.clock.runFor(1_000); await expect(visitor(page)).toHaveCount(1);
});

test("reduced motion disables visits from startup and immediately after a live preference change", async ({ page }) => {
  await prepare(page); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await expect(page.locator(".hq-haunt-band")).toBeVisible();
  await expect(page.locator(".hq-haunt-motion")).toBeHidden();
  await page.clock.runFor(120_000); await expect(visitor(page)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" }); await waitForTheme(page);
  // CSS updates before the MediaQueryList change event is delivered. Advance
  // the test clock in steps so that the fresh wait starts after that event.
  await expect.poll(async () => {
    await page.clock.runFor(1_000);
    return visitor(page).count();
  }, { intervals: [50], timeout: 10_000 }).toBe(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(visitor(page)).toHaveCount(0);
  await page.clock.runFor(120_000); await expect(visitor(page)).toHaveCount(0);
  await expect(page.locator(".hq-haunt-season")).toBeVisible();
});

test("hiding the tab cancels a visitor and resumes with a fresh wait, without catching up", async ({ page }) => {
  await prepare(page); await page.goto("/"); await waitForTheme(page);
  await page.clock.runFor(10_000); await expect(visitor(page)).toHaveCount(1);
  // Visibility is controlled locally so this test does not depend on headless-tab focus.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(visitor(page)).toHaveCount(0);
  await page.clock.runFor(300_000); await expect(visitor(page)).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(9_000); await expect(visitor(page)).toHaveCount(0);
  await page.clock.runFor(1_000); await expect(visitor(page)).toHaveCount(1);
});

for (const daily of [false, true]) test(`${daily ? "Daily" : "regular quiz"}: starting play cancels the current visitor and all future visits`, async ({ page }) => {
  await prepare(page);
  if (daily) await dailyFixture(page);
  await page.goto(daily ? "/daily" : "/"); await waitForTheme(page);
  const start = page.getByRole("button", { name: daily ? "Start Daily" : "Play Movie Stills", exact: true });
  await expect(start).toBeEnabled();
  await page.clock.runFor(10_000); await expect(visitor(page)).toHaveCount(1);
  await start.click();
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  await expect(visitor(page)).toHaveCount(0); await expect(page.locator(".hq-haunt-band")).toHaveCount(0);
  await page.clock.runFor(11_000); await expect(visitor(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
});
