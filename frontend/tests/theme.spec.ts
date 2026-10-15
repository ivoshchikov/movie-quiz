import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { mockQuizApi } from "./fixtures";
import { dailyFixture } from "./daily-fixtures";

const preference = "hard-quiz-theme";
const toggle = (page: Page) => page.getByRole("button", { name: /Switch to (light|dark) theme/ });
async function savedTheme(page: Page, theme: string) {
  await page.addInitScript(({ preference, theme }) => localStorage.setItem(preference, theme), { preference, theme });
}
function luminance(color: string, background: string) {
  const channels = color.trim().replace("#", "").match(/../g)!.map(hex => parseInt(hex, 16) / 255);
  const behind = background.trim().replace("#", "").match(/../g)!.map(hex => parseInt(hex, 16) / 255);
  const alpha = channels[3] ?? 1;
  const values = channels.slice(0, 3).map((channel, index) => {
    const value = channel * alpha + behind[index] * (1 - alpha);
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}
function contrast(a: string, b: string, background = "#ffffff") {
  const values = [luminance(a, background), luminance(b, background)].sort((x, y) => x - y);
  return (values[1] + .05) / (values[0] + .05);
}

test("the original dark theme is the default; keyboard choice persists across navigation and reload", async ({ page }) => {
  await mockQuizApi(page);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(toggle(page)).toHaveAccessibleName("Switch to light theme");
  await toggle(page).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(toggle(page)).toBeFocused();
  await expect(toggle(page)).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle(page)).toBeFocused();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f6f7fb");
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();
  await page.reload();
  await expect(toggle(page)).toHaveAccessibleName("Switch to dark theme");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await toggle(page).click();
  await page.reload();
  await expect(toggle(page)).toHaveAccessibleName("Switch to light theme");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#101116");
});

test("storage denial keeps switching and route changes working without an exception", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const originalGet = Storage.prototype.getItem, originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) { if (key === "hard-quiz-theme") throw new DOMException("Denied", "SecurityError"); return originalGet.call(this, key); };
    Storage.prototype.setItem = function (key, value) { if (key === "hard-quiz-theme") throw new DOMException("Denied", "SecurityError"); return originalSet.call(this, key, value); };
  });
  await mockQuizApi(page);
  await page.goto("/");
  await toggle(page).click();
  await page.getByRole("link", { name: "Daily", exact: true }).click();
  await expect(toggle(page)).toHaveAccessibleName("Switch to dark theme");
  await toggle(page).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("invalid saved values fall back to the original dark palette", async ({ page }) => {
  await savedTheme(page, "unexpected");
  await mockQuizApi(page);
  await page.goto("/");
  await expect(toggle(page)).toHaveAccessibleName("Switch to light theme");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
});

test("the selected theme synchronizes between tabs, including resetting the preference", async ({ page, context }) => {
  const other = await context.newPage();
  await mockQuizApi(page); await mockQuizApi(other);
  await page.goto("/"); await other.goto("/how-to-play");
  await expect(toggle(other)).toBeVisible();
  await toggle(page).click();
  await expect(toggle(other)).toHaveAccessibleName("Switch to dark theme");
  await toggle(other).click();
  await expect(toggle(page)).toHaveAccessibleName("Switch to light theme");
  await toggle(page).click();
  await expect(toggle(other)).toHaveAccessibleName("Switch to dark theme");
  await page.evaluate(key => localStorage.removeItem(key), preference);
  await expect(toggle(other)).toHaveAccessibleName("Switch to light theme");
});

for (const theme of ["dark", "light"] as const) {
  test(`${theme}: readable pages, usable mobile header and portal login`, async ({ page }) => {
    test.setTimeout(60_000);
    await mockQuizApi(page); await savedTheme(page, theme);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/", "/leaderboard", "/how-to-play", "/blog", "/blog/why-2-39-1-feels-more-cinematic", "/login", "/result", "/missing-theme-test"]) {
        await page.goto(route);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await expect(toggle(page)).toBeVisible();
        if (process.env.HQ_THEME_VISUAL_DIR && ["/", "/blog/why-2-39-1-feels-more-cinematic"].includes(route)) {
          mkdirSync(process.env.HQ_THEME_VISUAL_DIR, { recursive: true });
          await page.screenshot({ path: `${process.env.HQ_THEME_VISUAL_DIR}/${theme}-${width}-${route === "/" ? "home" : "article"}.png`, fullPage: route === "/" });
        }
        const box = await toggle(page).boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${route}, ${width}`).toBeLessThanOrEqual(1);
      }
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".hq-login-card")).toHaveCSS("background-color", theme === "light" ? "rgb(255, 255, 255)" : "rgb(25, 26, 34)");
    await expect(dialog.getByRole("textbox", { name: "Email" })).toHaveCSS("color", theme === "light" ? "rgb(35, 37, 53)" : "rgb(245, 245, 250)");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`${theme}: text, status, primary button and control focus contrast`, async ({ page }) => {
    await mockQuizApi(page); await savedTheme(page, theme); await page.goto("/");
    await expect(toggle(page)).toBeVisible();
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(["background", "surface", "surface-soft", "media", "tint", "text", "reading-text", "muted", "purple", "button", "button-hover", "success", "success-soft", "error", "error-soft", "warning", "control-border", "gold", "gold-soft", "silver", "silver-soft", "bronze", "bronze-soft"].map(name => [name, style.getPropertyValue(`--hq-${name}`)]));
    });
    for (const bg of ["background", "surface", "surface-soft", "media", "tint"]) {
      for (const fg of ["text", "reading-text", "muted", "purple", "success", "error", "warning"]) expect(contrast(colors[bg], colors[fg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors[bg], colors["control-border"]), `control on ${bg}`).toBeGreaterThanOrEqual(3);
    }
    for (const bg of ["button", "button-hover"]) expect(contrast("#ffffff", colors[bg])).toBeGreaterThanOrEqual(4.5);
    for (const status of ["success", "error", "gold", "silver", "bronze"]) expect(contrast(colors[status], colors[`${status}-soft`], colors.surface), status).toBeGreaterThanOrEqual(4.5);
  });

  test(`${theme}: changing during a regular quiz keeps choices, timer and score intact`, async ({ page }) => {
    await page.clock.install(); await page.clock.pauseAt(new Date());
    const calls = await mockQuizApi(page); await savedTheme(page, theme);
    await page.goto("/"); await page.getByRole("button", { name: "Play Movie Stills" }).click();
    await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
    const stats = await page.locator(".hq-game-stats").innerText();
    const timer = await page.locator(".hq-game-timer").innerText();
    const before = calls.length;
    await toggle(page).click();
    await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
    expect(await page.locator(".hq-game-stats").innerText()).toBe(stats);
    expect(await page.locator(".hq-game-timer").innerText()).toBe(timer);
    expect(calls).toHaveLength(before);
    await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
    await expect(page.locator(".hq-game-dialog")).toHaveCSS("background-color", theme === "dark" ? "rgb(255, 255, 255)" : "rgb(25, 26, 34)");
    await page.getByRole("button", { name: "Keep playing" }).click();
  });

  test(`${theme}: Daily keeps one running attempt when the theme changes`, async ({ page }) => {
    const data = await dailyFixture(page); await savedTheme(page, theme);
    await page.goto("/daily"); await page.getByRole("button", { name: "Start Daily" }).click();
    await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
    const starts = data.calls.filter(call => call.name === "start_daily_session").length;
    await toggle(page).click();
    await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
    expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(starts);
    expect(data.calls.filter(call => call.name === "submit_daily_answer")).toHaveLength(0);
    await page.getByRole("button", { name: "Leave Daily", exact: true }).click();
    await expect(page.locator(".hq-game-dialog")).toHaveCSS("background-color", theme === "dark" ? "rgb(255, 255, 255)" : "rgb(25, 26, 34)");
    await page.keyboard.press("Escape");
  });
}

test("the saved light theme is restored in built HTML before the application can start", async ({ page }) => {
  await savedTheme(page, "light");
  // Simulate a slow or unavailable application bundle; the inline bootstrap must suffice.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (route.request().resourceType() === "document") {
      const file = url.pathname === "/" ? "index" : url.pathname.slice(1);
      return route.fulfill({ contentType: "text/html", body: readFileSync(`dist/${file}.html`, "utf8") });
    }
    return route.abort();
  });
  for (const route of ["/", "/blog", "/how-to-play", "/daily", "/404"]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveCSS("background-color", "rgb(246, 247, 251)");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f6f7fb");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
});
