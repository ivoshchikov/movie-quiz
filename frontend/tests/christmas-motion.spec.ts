import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mockQuizApi } from "./fixtures";
import { dailyFixture } from "./daily-fixtures";
import { attackFixture, attackAnswers } from "./time-attack-fixture";
import { pickFixture } from "./this-that-fixture";

const slider = (p: Page) => p.getByRole("slider", { name: "Color theme" });
const moving = (p: Page) => p.locator(".hq-winter-snow, .hq-winter-flight");
async function preference(p: Page, theme = "christmas") {
  await p.addInitScript(t => localStorage.setItem("hard-quiz-theme", t), theme);
  await p.emulateMedia({ reducedMotion: "no-preference" });
}
async function prepare(p: Page) {
  await p.clock.install(); await p.clock.pauseAt(new Date());
  await preference(p); await mockQuizApi(p);
}
async function ready(p: Page) {
  await expect(p.getByRole("button", { name: "Pause Christmas animations" })).toBeVisible();
  await expect(p.getByRole("button", { name: "Play Movies" })).toBeEnabled();
}
async function pose(p: Page, name: string, time: number) {
  return p.evaluate(({ name, time }) => {
    const motion = document.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === name);
    if (!motion) throw Error(`Missing ${name}`);
    motion.pause(); motion.currentTime = time;
    const box = ((motion.effect as KeyframeEffect).target as HTMLElement).getBoundingClientRect();
    return { x: box.x, y: box.y, right: box.right };
  }, { name, time });
}
for (const width of [320, 390, 768, 1440, 1920]) test(`${width}px: scenery, snow and sleigh fit and never intercept controls`, async ({ page }, info) => {
  await prepare(page); await page.setViewportSize({ width, height: 900 }); await page.goto("/"); await ready(page);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Christmas");
  await expect(page.locator(".hq-haunt")).toHaveCount(0);
  await expect(page.locator('[data-motif="mccallister-house"]').first()).toBeVisible();
  await expect(page.locator(".hq-winter-santa")).toBeVisible();
  await expect(page.locator(".hq-winter-snow")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".hq-winter-flake:visible")).toHaveCount(width <= 620 ? 12 : 24);
  const early = await pose(page, "hq-winter-snowfall", 1000), late = await pose(page, "hq-winter-snowfall", 8000);
  expect(late.y).toBeGreaterThan(early.y + 30);
  await page.screenshot({ path: info.outputPath("christmas-home.png"), fullPage: true });
  await page.clock.runFor(18000); await expect(page.locator(".hq-winter-flight")).toHaveCount(1);
  const sleigh = await pose(page, "hq-winter-sleigh", 3500);
  expect(sleigh.x).toBeGreaterThanOrEqual(0); expect(sleigh.right).toBeLessThanOrEqual(width);
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".hq-winter-flight") !== null, { x: sleigh.x + 20, y: sleigh.y + 20 })).toBe(false);
  await expect(page.locator(".hq-winter-flight")).toHaveCSS("pointer-events", "none");
  await page.clock.runFor(7000); await expect(page.locator(".hq-winter-flight")).toHaveCount(0);
  await page.clock.runFor(47000); await expect(page.locator(".hq-winter-flight")).toHaveCount(0);
  await page.clock.runFor(1000); await expect(page.locator(".hq-winter-flight")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("pause survives navigation, and leaving the theme cancels all motion timers", async ({ page }) => {
  await prepare(page); await page.goto("/"); await ready(page); await page.clock.runFor(18000);
  await page.getByRole("button", { name: "Pause Christmas animations" }).focus(); await page.keyboard.press("Enter");
  const resume = page.getByRole("button", { name: "Resume Christmas animations" });
  await expect(resume).toBeFocused(); await expect(moving(page)).toHaveCount(0);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();
  await page.clock.runFor(120000); await expect(moving(page)).toHaveCount(0);
  await resume.click(); await expect(page.locator(".hq-winter-snow")).toHaveCount(1);
  await slider(page).focus(); await slider(page).press("Home");
  await page.clock.runFor(120000); await expect(page.locator(".hq-winter")).toHaveCount(0);
  await slider(page).press("End"); await page.clock.runFor(17000);
  await expect(page.locator(".hq-winter-flight")).toHaveCount(0);
  await page.clock.runFor(1000); await expect(page.locator(".hq-winter-flight")).toHaveCount(1);
});
test("reduced motion disables snow and Santa at startup and on live preference changes", async ({ page }) => {
  await prepare(page); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/");
  await expect(page.locator(".hq-winter-band")).toBeVisible(); await expect(page.locator(".hq-winter-motion")).toBeHidden();
  await page.clock.runFor(120000); await expect(moving(page)).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" }); await expect(page.locator(".hq-winter-snow")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" }); await expect(moving(page)).toHaveCount(0);
});
test("backgrounding clears motion and returning starts a fresh Santa wait", async ({ page }) => {
  await prepare(page); await page.goto("/"); await ready(page); await page.clock.runFor(18000);
  await expect(page.locator(".hq-winter-flight")).toHaveCount(1);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(moving(page)).toHaveCount(0); await page.clock.runFor(300000);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.locator(".hq-winter-snow")).toHaveCount(1);
  await page.clock.runFor(17000); await expect(page.locator(".hq-winter-flight")).toHaveCount(0);
  await page.clock.runFor(1000); await expect(page.locator(".hq-winter-flight")).toHaveCount(1);
});
for (const mode of ["Classic", "Daily", "Time Attack", "This or That"]) test(`${mode}: active play removes moving and large decorations`, async ({ page }) => {
  await preference(page);
  if (mode === "Time Attack") await attackFixture(page);
  else if (mode === "This or That") await pickFixture(page);
  else {
    await page.clock.install(); await page.clock.pauseAt(new Date());
    if (mode === "Daily") await dailyFixture(page); else await mockQuizApi(page);
  }
  await page.goto(mode === "Classic" ? "/" : mode === "Daily" ? "/daily" : mode === "Time Attack" ? "/time-attack" : "/this-or-that");
  const start = page.getByRole("button", { name: mode === "Classic" ? "Play Movies" : mode === "Daily" ? "Start Daily" : mode === "Time Attack" ? "Start Time Attack" : "Choose my first pair", exact: true });
  await expect(start).toBeEnabled(); await expect(page.locator(".hq-winter-snow")).toHaveCount(1);
  await page.clock.runFor(18000); await expect(page.locator(".hq-winter-flight")).toHaveCount(1);
  await start.click();
  const answer = page.getByRole("button", { name: mode === "Time Attack" ? attackAnswers[0] : mode === "This or That" ? "Choose Actor 1" : "Fixture answer", exact: true });
  await expect(answer).toBeEnabled();
  await expect(page.locator(".hq-winter-band, .hq-winter-snow, .hq-winter-flight, .hq-winter-house")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "christmas");
  await page.clock.runFor(8000); await expect(answer).toBeEnabled();
});
for (const bundle of [true, false]) test(`legacy Halloween migrates before paint, bundle ${bundle}`, async ({ page }) => {
  await preference(page, "halloween");
  if (bundle) await mockQuizApi(page);
  else await page.route("**/*", r => r.request().resourceType() === "document" ? r.fulfill({ contentType: "text/html", body: readFileSync("dist/blog.html", "utf8") }) : r.abort());
  await page.goto(bundle ? "/" : "/blog");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "christmas");
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(13, 25, 27)");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0d191b");
  expect(await page.evaluate(() => localStorage.getItem("hard-quiz-theme"))).toBe("christmas");
  if (bundle) { await expect(slider(page)).toHaveAttribute("aria-valuetext", "Christmas"); await expect(page.locator(".hq-haunt")).toHaveCount(0); }
});
test("legacy storage events map to Christmas without a fourth slider stop", async ({ page, context }) => {
  await mockQuizApi(page); await page.goto("/");
  const other = await context.newPage(); await mockQuizApi(other); await other.goto("/blog");
  await other.evaluate(() => localStorage.setItem("hard-quiz-theme", "halloween"));
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Christmas");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "christmas");
  await expect(slider(page)).toHaveAttribute("max", "2"); await other.close();
});
