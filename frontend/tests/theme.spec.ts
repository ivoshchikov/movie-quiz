import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { mockQuizApi } from "./fixtures";
import { dailyFixture } from "./daily-fixtures";

const preference = "hard-quiz-theme";
const slider = (page: Page) => page.getByRole("slider", { name: "Color theme" });
async function selectTheme(page: Page, theme: "light" | "dark" | "halloween") {
  await slider(page).focus(); await slider(page).press("Home");
  if (theme !== "light") await slider(page).press("ArrowRight");
  if (theme === "halloween") await slider(page).press("ArrowRight");
}
async function changeTheme(page: Page) {
  await selectTheme(page, await slider(page).getAttribute("aria-valuetext") === "Dark" ? "light" : "dark");
}
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
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Dark");
  await slider(page).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(slider(page)).toBeFocused();
  await expect(page.locator(".hq-theme-slider")).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Home");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(slider(page)).toBeFocused();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f6f7fb");
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();
  await page.reload();
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Light");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await changeTheme(page);
  await page.reload();
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Dark");
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
  await changeTheme(page);
  await page.getByRole("radio", { name: "Daily", exact: true }).click();
  await page.getByRole("link", { name: "Play Daily", exact: true }).click();
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Light");
  await changeTheme(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("invalid saved values fall back to the original dark palette", async ({ page }) => {
  await savedTheme(page, "unexpected");
  await mockQuizApi(page);
  await page.goto("/");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
});

test("the selected theme synchronizes between tabs, including resetting the preference", async ({ page, context }) => {
  const other = await context.newPage();
  await mockQuizApi(page); await mockQuizApi(other);
  await page.goto("/"); await other.goto("/how-to-play");
  await expect(slider(other)).toBeVisible();
  await changeTheme(page);
  await expect(slider(other)).toHaveAttribute("aria-valuetext", "Light");
  await changeTheme(other);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Dark");
  await changeTheme(page);
  await expect(slider(other)).toHaveAttribute("aria-valuetext", "Light");
  await selectTheme(other, "halloween");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Halloween");
  await page.evaluate(key => localStorage.removeItem(key), preference);
  await expect(slider(other)).toHaveAttribute("aria-valuetext", "Dark");
});

for (const theme of ["dark", "light", "halloween"] as const) {
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
        await expect(slider(page)).toBeVisible();
        if (process.env.HQ_THEME_VISUAL_DIR && ["/", "/blog/why-2-39-1-feels-more-cinematic"].includes(route)) {
          mkdirSync(process.env.HQ_THEME_VISUAL_DIR, { recursive: true });
          await page.screenshot({ path: `${process.env.HQ_THEME_VISUAL_DIR}/${theme}-${width}-${route === "/" ? "home" : "article"}.png`, fullPage: route === "/" });
        }
        const box = await slider(page).boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${route}, ${width}`).toBeLessThanOrEqual(1);
      }
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".hq-login-card")).toHaveCSS("background-color", theme === "light" ? "rgb(255, 255, 255)" : theme === "halloween" ? "rgb(33, 24, 41)" : "rgb(25, 26, 34)");
    await expect(dialog.getByRole("textbox", { name: "Email" })).toHaveCSS("color", theme === "light" ? "rgb(35, 37, 53)" : theme === "halloween" ? "rgb(255, 245, 233)" : "rgb(245, 245, 250)");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".hq-haunt")).toHaveCount(theme === "halloween" ? 1 : 0);
    expect(errors).toEqual([]);
  });

  test(`${theme}: text, status, primary button and control focus contrast`, async ({ page }) => {
    await mockQuizApi(page); await savedTheme(page, theme); await page.goto("/");
    await expect(slider(page)).toBeVisible();
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
    await changeTheme(page);
    await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
    expect(await page.locator(".hq-game-stats").innerText()).toBe(stats);
    expect(await page.locator(".hq-game-timer").innerText()).toBe(timer);
    expect(calls).toHaveLength(before);
    await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
    await expect(page.locator(".hq-game-dialog")).toHaveCSS("background-color", theme === "dark" ? "rgb(255, 255, 255)" : "rgb(25, 26, 34)");
    await page.getByRole("button", { name: "Keep playing" }).click();
    await slider(page).focus(); await page.keyboard.press("1");
    await expect.poll(() => calls.filter(call => call.name === "quiz_answer").length).toBe(1);
  });

  test(`${theme}: Daily keeps one running attempt when the theme changes`, async ({ page }) => {
    const data = await dailyFixture(page); await savedTheme(page, theme);
    await page.goto("/daily"); await page.getByRole("button", { name: "Start Daily" }).click();
    await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
    const starts = data.calls.filter(call => call.name === "daily_begin").length;
    await changeTheme(page);
    await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
    expect(data.calls.filter(call => call.name === "daily_begin")).toHaveLength(starts);
    expect(data.calls.filter(call => call.name === "submit_daily_answer")).toHaveLength(0);
    await page.getByRole("button", { name: "Leave Daily", exact: true }).click();
    await expect(page.locator(".hq-game-dialog")).toHaveCSS("background-color", theme === "dark" ? "rgb(255, 255, 255)" : "rgb(25, 26, 34)");
    await page.keyboard.press("Escape");
    await slider(page).focus(); await page.keyboard.press("1");
    await expect.poll(() => data.calls.filter(call => call.name === "submit_daily_answer").length).toBe(1);
  });
}

for (const theme of ["light", "halloween"] as const) test(`the saved ${theme} theme is restored before the application can start`, async ({ page }) => {
  await savedTheme(page, theme);
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
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("html")).toHaveCSS("background-color", theme === "light" ? "rgb(246, 247, 251)" : "rgb(20, 15, 27)");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", theme === "light" ? "#f6f7fb" : "#140f1b");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
});

test("the slider supports dragging through three stops and removes Halloween decoration on exit", async ({ page }) => {
  await mockQuizApi(page); await page.goto("/");
  // The account placeholder can move the slider while the header settles.
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const box = await slider(page).boundingBox();
  const y = box!.y + box!.height / 2;
  await page.mouse.move(box!.x + box!.width / 2, y); await page.mouse.down();
  await page.mouse.move(box!.x + box!.width - 12, y, { steps: 8 }); await page.mouse.up();
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Halloween");
  await expect(page.locator(".hq-haunt-band")).toBeVisible();
  await expect(page.locator(".hq-haunt-edges")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".hq-haunt")).toHaveCSS("pointer-events", "none");
  await page.reload();
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Halloween");
  await slider(page).press("Home");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Light");
  await expect(page.locator(".hq-haunt")).toHaveCount(0);
  await slider(page).press("End");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Halloween");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".hq-theme-thumb")).toHaveCSS("transition-duration", "0s");
});

test("touch selection is usable at 320px and keeps game controls within the viewport", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true });
  const page = await context.newPage(); await mockQuizApi(page); await page.goto("/");
  await slider(page).waitFor();
  let box = (await slider(page).boundingBox())!;
  await page.touchscreen.tap(box.x + box.width - 12, box.y + box.height / 2);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Halloween");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  await expect(page.locator(".hq-haunt-band")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(1);
  box = (await slider(page).boundingBox())!;
  await page.touchscreen.tap(box.x + 12, box.y + box.height / 2);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "Light");
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  await context.close();
});
