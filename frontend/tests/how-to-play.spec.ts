import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mockQuizApi, difficulties } from "./fixtures";
const metadata = JSON.parse(readFileSync(path.resolve("src/howToPlayMetadata.json"), "utf8")) as { title: string; description: string; url: string };

test("instructions and the game use the same current difficulty settings", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto("/how-to-play");
  const table = page.getByRole("table", { name: "Current regular quiz difficulty settings" });
  await expect(table.getByRole("row")).toHaveCount(4);
  for (const level of difficulties) {
    await expect(table.getByRole("row", { name: `${level.name} ${level.time_limit_secs} s ${level.lives}`, exact: true })).toBeVisible();
  }
  await expect(page.locator(".hq-howto-intro")).toContainText("actors from photos");
  await expect(page.locator(".hq-howto-rule-grid")).toContainText("Every correct answer: +1 point");
  await expect(page.locator(".hq-howto-rule-grid")).toContainText("Wrong answer or timeout: −1 life");
  await expect(page.locator(".hq-howto-clocks")).toContainText("time in the background");
  await expect(page.locator("#howto-end + p")).toContainText("reach the end of the available questions");
  await expect(page.locator(".hq-howto")).toContainText("A regular quiz cannot be resumed");
  await expect(page.locator(".hq-howto")).toContainText("logging in later does not add it to your account");
  await expect(page.locator(".hq-howto-daily")).toContainText("No time limit.");
  await expect(page.locator(".hq-howto-daily")).toContainText("America/Chicago");
  expect(calls).toEqual([]);
});

test("difficulty names, values and order come from live data rather than old defaults", async ({ page }) => {
  await mockQuizApi(page);
  await page.route("**/rest/v1/difficulty_level?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify([
    { ...difficulties[0], name: "Custom challenge", time_limit_secs: 9.5, lives: 7, sort_order: 10 },
    { ...difficulties[1], name: "First level", time_limit_secs: 51, lives: 4, sort_order: 0 },
  ]) }));
  await page.goto("/how-to-play");
  await expect(page.locator(".hq-howto-levels tbody tr")).toHaveText(["First level51 s4", "Custom challenge9.5 s7"]);
  await page.getByRole("link", { name: "Start a quiz", exact: true }).first().click();
  await expect(page.getByRole("radio", { name: "First level", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "First level", exact: true }).click();
  await expect(page.locator(".hq-rule-summary")).toContainText("51 sec per question");
});

test("slow settings do not block the rules or primary actions", async ({ page }) => {
  await mockQuizApi(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/difficulty_level?**", async route => { await held; await route.fallback(); });
  await page.goto("/how-to-play");
  await expect(page.getByRole("status")).toHaveText("Loading difficulty settings…");
  await expect(page.getByRole("heading", { name: "Points & lives" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a quiz", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  release();
  await expect(page.getByRole("table")).toBeVisible();
});

test("a failed read has an independent retry without made-up numbers", async ({ page }) => {
  await mockQuizApi(page);
  let failed = true;
  await page.route("**/rest/v1/difficulty_level?**", route => failed
    ? route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"unavailable"}' })
    : route.fallback());
  await page.goto("/how-to-play");
  await expect(page.getByRole("alert")).toContainText("Difficulty settings couldn’t load");
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.locator(".hq-howto-daily")).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a stalled read times out and a later retry can recover", async ({ page }) => {
  await page.clock.install();
  await mockQuizApi(page);
  let stalled = true;
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/difficulty_level?**", async route => { if (stalled) await held; await route.fallback(); });
  await page.goto("/how-to-play");
  await expect(page.getByRole("status")).toBeVisible();
  await page.clock.runFor(10100);
  await expect(page.getByRole("alert")).toContainText("couldn’t load");
  stalled = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  release();
});

const invalidSets: [string, unknown][] = [
  ["invalid response shape", { difficulty: "Easy" }],
  ["missing time", [{ id: 1, name: "Easy", lives: 3 }]],
  ["nonpositive time", [{ ...difficulties[0], time_limit_secs: 0 }]],
  ["invalid lives", [{ ...difficulties[0], lives: 1.5 }]],
  ["missing name", [{ ...difficulties[0], name: " " }]],
  ["duplicate IDs", [difficulties[0], difficulties[0]]],
  ["null entry", [null]],
];
for (const [name, body] of invalidSets) test(`invalid difficulty data is rejected: ${name}`, async ({ page }) => {
  await mockQuizApi(page);
  await page.route("**/rest/v1/difficulty_level?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) }));
  await page.goto("/how-to-play");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start a quiz", exact: true }).first()).toBeVisible();
});

test("empty settings are distinct from a failed request and can be retried", async ({ page }) => {
  await mockQuizApi(page);
  let empty = true;
  await page.route("**/rest/v1/difficulty_level?**", route => empty
    ? route.fulfill({ contentType: "application/json", body: "[]" }) : route.fallback());
  await page.goto("/how-to-play");
  await expect(page.getByText("No difficulty settings are available right now.")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  empty = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("table")).toBeVisible();
});

test("the next step chooses a mode and does not auto-start a regular quiz or Daily", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto("/how-to-play");
  await page.getByRole("link", { name: "Start a quiz", exact: true }).last().click();
  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeVisible();
  expect(calls.filter(call => call.name === "get_question")).toHaveLength(0);
  await page.getByRole("link", { name: "How to play", exact: true }).click();
  await page.getByRole("link", { name: "View Daily", exact: true }).click();
  await expect(page).toHaveURL(/\/daily$/);
  await expect(page.getByRole("button", { name: "Log in to play", exact: true })).toBeVisible();
  expect(calls.filter(call => ["start_daily_session", "submit_daily_result", "upsert_user_best", "touch_question_stats"].includes(call.name))).toHaveLength(0);
});

test("page metadata has one owner on direct load and after client-side navigation", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/how-to-play");
  await expect(page).toHaveTitle(metadata.title);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", metadata.description);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", metadata.url);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", metadata.url);
  for (const selector of ['meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:image"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]', 'meta[name="twitter:card"]', 'meta[name="robots"]']) {
    await expect(page.locator(selector)).toHaveCount(1);
  }
  await page.getByRole("link", { name: "Start a quiz", exact: true }).first().click();
  await expect(page).toHaveTitle("Movie & Actor Quiz | Hard Quiz");
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", "https://hard-quiz.com/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
});

test("the current screen example is optional, readable and opens from the keyboard", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/how-to-play");
  const summary = page.locator(".hq-howto-demo summary");
  const image = page.getByAltText(/^Example quiz screen:/);
  await expect(image).not.toBeVisible();
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(720);
  await expect(page.locator(".hq-howto-demo figcaption")).toContainText("illustrative image and sample answers");
  await summary.focus();
  await page.keyboard.press("Space");
  await expect(image).not.toBeVisible();
});

for (const [width, height] of [[320, 480], [375, 812], [390, 844], [568, 320], [768, 1024], [1024, 768], [1366, 900]]) {
  test(`rules and long difficulty labels fit ${width}×${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await mockQuizApi(page);
    await page.route("**/rest/v1/difficulty_level?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify([
      { ...difficulties[0], name: "An exceptionally long difficulty name that must remain readable" }, ...difficulties.slice(1),
    ]) }));
    await page.goto("/how-to-play");
    await expect(page.getByRole("table")).toBeVisible();
    await page.locator(".hq-howto-demo summary").click();
    await expect.poll(() => page.locator(".hq-howto-demo img").evaluate(img => (img as HTMLImageElement).complete)).toBe(true);
    const geometry = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      windowWidth: innerWidth,
      targets: Array.from(document.querySelectorAll(".hq-howto a, .hq-howto summary")).map(element => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, left: rect.left, right: rect.right };
      }),
      cells: Array.from(document.querySelectorAll(".hq-howto th, .hq-howto td, .hq-howto-demo img")).map(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }),
    }));
    expect(geometry.pageWidth).toBeLessThanOrEqual(width);
    for (const target of geometry.targets) {
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.left).toBeGreaterThanOrEqual(0);
      expect(target.right).toBeLessThanOrEqual(width);
    }
    for (const cell of geometry.cells) {
      expect(cell.left).toBeGreaterThanOrEqual(0);
      expect(cell.right).toBeLessThanOrEqual(width);
    }
    await page.locator(".hq-howto-demo summary").click();
    if (width === 1366 || width === 375) {
      await page.route("**/rest/v1/difficulty_level?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(difficulties.map(level => ({ ...level, time_limit_secs: 30 }))) }));
      await page.reload();
      await expect(page.getByRole("row", { name: "Easy 30 s 3", exact: true })).toBeVisible();
      const file = process.env.HQ_REVIEW_DIR ? path.join(process.env.HQ_REVIEW_DIR, `hard-quiz-how-to-play-${width === 1366 ? "desktop" : "mobile"}.png`) : testInfo.outputPath(`how-to-play-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
    }
  });
}

test("capture the current game demonstration with an isolated sample question", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.clock.install({ time: new Date("2026-10-08T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-08T12:00:01Z"));
  const calls = await mockQuizApi(page);
  const choices = ["Interstellar (2014)", "Moon (2009)", "Gravity (2013)", "The Martian (2015)"];
  await page.route("**/rest/v1/difficulty_level?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(difficulties.map(level => ({ ...level, time_limit_secs: 30 }))) }));
  await page.route("**/rest/v1/rpc/get_question", route => {
    calls.push({ name: "get_question", payload: route.request().postDataJSON() });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify([{ id: 81001, image_url: "https://quiz-fixture.supabase.co/how-to-play-scene.svg", options_json: choices, category_id: 1, difficulty_level_id: 1 }]) });
  });
  const scene = await readFile(path.resolve("tests/assets/how-to-play-scene.svg"), "utf8");
  await page.route("**/how-to-play-scene.svg", route => route.fulfill({ contentType: "image/svg+xml", body: scene }));
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByRole("button", { name: choices[0], exact: true })).toBeEnabled();
  await page.clock.runFor(6000);
  await expect(page.locator(".hq-game-timer-label strong")).toHaveText("24 s");
  await expect(page.locator(".hq-game-footer strong")).toHaveText("00:06");
  expect(calls.filter(call => ["start_daily_session", "submit_daily_result", "upsert_user_best", "touch_question_stats"].includes(call.name))).toHaveLength(0);
  if (process.env.HQ_CAPTURE_DEMO === "1") {
    await page.mouse.move(0, 0);
    await page.locator(".hq-game").screenshot({ path: path.resolve("public/how-to-play-game.png") });
  }
});
