import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mockQuizApi } from "./fixtures";

const article = "/blog/why-2-39-1-feels-more-cinematic";

test("known addresses keep the same layout with a trailing slash", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/play/");
  await expect(page.getByRole("heading", { name: "Ready to play?", exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toHaveClass("hq-play-main");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await page.goto("/daily/");
  await expect(page.getByRole("main")).toHaveClass("hq-daily-main");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await page.goto("/result/");
  await expect(page.getByRole("main")).toHaveClass("hq-result-main");
});

test("unknown addresses keep their URL and offer a clear next step", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/a-missing-page?source=fixture");
  await expect(page).toHaveURL(/\/a-missing-page\?source=fixture$/);
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.getByRole("link", { name: "Choose a quiz", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  await page.goto("/blog/missing/nested-address");
  await expect(page.getByRole("heading", { name: "Article not found", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to blog", exact: true })).toHaveAttribute("href", "/blog");
});

test("reload and footer navigation preserve reading position while new pages start at their heading", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto(article);
  const footer = page.getByRole("contentinfo").getByRole("link", { name: "How to play", exact: true });
  await footer.scrollIntoViewIfNeeded();
  const readingPosition = await page.evaluate(() => scrollY);
  expect(readingPosition).toBeGreaterThan(500);
  await page.reload();
  await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - readingPosition)).toBeLessThan(8);
  await footer.click();
  await expect(page.getByRole("heading", { name: "How to play", exact: true })).toBeFocused();
  await expect(page.getByRole("heading", { name: "How to play", exact: true })).toHaveCSS("outline-style", "none");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(article + "$"));
  await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - readingPosition)).toBeLessThan(8);
  await page.goto(article);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.goto("/how-to-play");
  await expect(page.getByRole("heading", { name: "How to play", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test("query filters retain focus and do not reset the page", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/leaderboard");
  const actors = page.getByRole("radio", { name: "Actors", exact: true });
  await actors.click();
  await expect(actors).toBeFocused();
  await expect(page).toHaveURL(/category=2/);
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeFocused();
  const guides = page.getByRole("button", { name: /^Movie guides, \d+ articles?$/ });
  await guides.click();
  await expect(guides).toBeFocused();
  await expect(page).toHaveURL(/topic=streaming/);
});

test("keyboard users can skip the header and continue into quiz controls", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content", exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByRole("main")).toHaveCSS("outline-style", "none");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: "Classic", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: /Movie Stills/ })).toBeFocused();
  await expect(page.getByRole("radio", { name: /Movie Stills/ })).toHaveCSS("outline-style", "solid");
});

test("a stalled catalog becomes retryable instead of a permanent loading state", async ({ page }) => {
  await mockQuizApi(page);
  await page.clock.install();
  let stall = true;
  await page.route("**/rest/v1/category?**", async route => { if (!stall) await route.fallback(); });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Loading quiz options…" })).toBeVisible();
  await page.clock.fastForward(10050);
  await expect(page.getByRole("alert")).toContainText("Quiz options could not be loaded.");
  stall = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
});

test("a stalled question check can retry with the same selected quiz", async ({ page }) => {
  await mockQuizApi(page);
  await page.clock.install();
  let stall = false;
  await page.route("**/rest/v1/rpc/count_questions", async route => {
    if (!stall || route.request().postDataJSON().p_difficulty_id == null) await route.fallback();
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  stall = true;
  await page.getByRole("radio", { name: /Actors/ }).click();
  await page.getByRole("radio", { name: "Hard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Checking questions…", exact: true })).toBeDisabled();
  await page.clock.fastForward(10050);
  await expect(page.getByRole("alert")).toContainText("Questions could not be checked.");
  await expect(page.getByRole("radio", { name: /Actors/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Hard", exact: true })).toHaveAttribute("aria-checked", "true");
  stall = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play Actors", exact: true })).toBeEnabled();
});

test("a rendering error keeps recovery actions and normal navigation usable", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/blog");
  await page.evaluate(async () => {
    const url = new URL("/src/blog/index.ts", location.origin).href;
    const module = await import(url);
    const post = module.posts.find((item: { slug: string }) => item.slug === "why-2-39-1-feels-more-cinematic");
    post.content = () => { throw new Error("Fixture rendering failure"); };
  });
  await page.getByRole("link", { name: "Why 2.39:1 Feels More Cinematic", exact: true }).click();
  await expect(page.getByRole("heading", { name: "This page couldn't load", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Reload page", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.getByRole("button", { name: "Reload page", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Why 2.39:1 Feels More Cinematic", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeFocused();
});

async function buttonColors(page: Page) {
  return page.locator(".hq-primary").first().evaluate(element => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor };
  });
}
function luminance(css: string) {
  const rgb = css.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
test("primary text remains readable on hover and article actions are styled buttons", async ({ page }) => {
  await mockQuizApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Play Movie Stills", exact: true });
  await expect(button).toBeEnabled();
  for (const hover of [false, true]) {
    if (hover) await button.hover();
    const colors = await buttonColors(page);
    const light = luminance(colors.color), dark = luminance(colors.background);
    expect((Math.max(light, dark) + .05) / (Math.min(light, dark) + .05)).toBeGreaterThanOrEqual(4.5);
  }
  await page.goto(article);
  const choose = page.getByRole("link", { name: "Choose a game", exact: true });
  expect(await choose.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  expect(await choose.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await expect(page.locator(".hq-article-cta")).toContainText("Classic, Time Attack, This or That or Daily.");
});

for (const width of [320, 375, 768, 1440]) {
  test(`shared navigation and quiz controls have usable targets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await mockQuizApi(page);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Play Movie Stills", exact: true })).toBeEnabled();
    const boxes = await page.locator(".hq-nav-link, .hq-account-button, .hq-category-option, .hq-difficulty-option, .hq-primary").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
    for (const box of boxes) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("radio", { name: "Easy", exact: true }).locator("svg")).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`shared-home-${width}.png`), fullPage: true });
  });
}

test("long labels and large text still reflow on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockQuizApi(page);
  await page.route("**/rest/v1/category?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify([{ id: 1, name: "AReallyLongMovieCategoryNameWithoutSpaces" }, { id: 2, name: "Actors" }]) }));
  await page.goto("/");
  await page.getByRole("radio", { name: /AReallyLong/ }).click();
  await expect(page.getByRole("button", { name: /Play AReallyLong/ })).toBeEnabled();
  await page.addStyleTag({ content: ".hq-category-name, .hq-difficulty-option, .hq-nav-link, .hq-primary { font-size: 24px !important } .hq-hero h1 { font-size: 44px !important }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: /Play AReallyLong/ }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /Play AReallyLong/ })).toBeInViewport();
  await page.goto("/a-missing-page");
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("generated fallback has HTTP 404 and readable actions without JavaScript", async ({ browser }) => {
  const rules = JSON.parse(readFileSync(path.resolve("vercel.json"), "utf8")).routes as { has?: unknown; src?: string; dest?: string; status?: number; headers?: Record<string, string> }[];
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route("**/assets/**", route => route.abort());
  await page.route("http://localhost:5173/ui12-unknown-page**", route => {
    const url = new URL(route.request().url());
    const rule = rules.find(item => !item.has && item.src && new RegExp(item.src).test(url.pathname))!;
    return route.fulfill({ status: rule.status || 200, headers: rule.headers, contentType: "text/html", body: readFileSync(path.resolve("dist" + rule.dest), "utf8") });
  });
  const response = await page.goto("/ui12-unknown-page?source=fixture");
  expect(response!.status()).toBe(404);
  expect(response!.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose a quiz", exact: true })).toHaveAttribute("href", "/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  const sitemap = readFileSync(path.resolve("dist/sitemap.xml"), "utf8");
  expect(sitemap).not.toContain("/404");
  await context.close();
});

test("large gameplay text stays inside its card and remains reachable by scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockQuizApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills", exact: true }).click();
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  await page.addStyleTag({ content: ".hq-game-answer, .hq-game-feedback > span { font-size: 26px !important; line-height: 1.5 !important } .hq-game-heading h1 { font-size: 26px !important }" });
  const bounds = await page.locator(".hq-game").evaluate(element => ({ card: element.getBoundingClientRect().toJSON(), controls: [...element.querySelectorAll(".hq-game-answer, .hq-game-feedback, .hq-game-stats, .hq-game-footer")].map(child => child.getBoundingClientRect().toJSON()) }));
  for (const control of bounds.controls) expect(control.bottom).toBeLessThanOrEqual(bounds.card.bottom + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const last = page.getByRole("button", { name: "Fourth answer", exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath("large-text-game.png"), fullPage: true });
});

test("reduced motion retains loading feedback without animating a spinner", async ({ page }) => {
  await mockQuizApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/fixture.svg", async () => {});
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills", exact: true }).click();
  await expect(page.getByText("Loading image…", { exact: true })).toBeVisible();
  expect(await page.locator(".hq-game-spinner").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeDisabled();
});
