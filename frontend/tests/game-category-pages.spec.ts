import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { categories, mockQuizApi } from "./fixtures";

const pages = [
  { slug: "movie-quiz", category: "All movies", label: "Movies", id: 41, heading: "Movie Quiz: Guess the Movie from a Still" },
  { slug: "actor-quiz", category: "Actors", label: "Actors", id: 27, heading: "Actor Quiz: Guess the Actor from a Photo" },
  { slug: "actress-quiz", category: "Actresses", label: "Actresses", id: 83, heading: "Actress Quiz: Guess the Actress from a Photo" },
  { slug: "tv-series-quiz", category: "TV series", label: "TV Series", id: 96, heading: "TV Series Quiz: Guess the Show from a Still" },
];

for (const entry of pages) {
  test(`${entry.slug} starts its live category only after Play, even with conflicting query parameters`, async ({ page }) => {
    const calls = await mockQuizApi(page);
    await page.route("**/rest/v1/category?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(pages.map(item => ({ id: item.id, name: item.category }))) }));
    await page.route("**/rest/v1/rpc/count_questions", route => route.fulfill({ contentType: "application/json", body: "10" }));
    await page.goto(`/${entry.slug}?category=1&difficulty=3&mode=daily`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry.heading);
    await expect(page.getByRole("button", { name: `Play ${entry.label}`, exact: true })).toBeEnabled();
    await expect(page.getByRole("radio", { name: "Hard", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://hard-quiz.com/${entry.slug}`);
    expect(calls.filter(call => call.name === "quiz_start")).toHaveLength(0);
    await page.getByRole("button", { name: `Play ${entry.label}`, exact: true }).click();
    await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeVisible();
    expect(calls.filter(call => call.name === "quiz_start")).toHaveLength(1);
    expect(calls.find(call => call.name === "quiz_start")?.payload).toMatchObject({ p_category_id: entry.id, p_difficulty_id: 3 });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });

  test(`${entry.slug} serves its guide, category links and breadcrumb without JavaScript`, async ({ browser }) => {
    const html = readFileSync(`dist/${entry.slug}.html`, "utf8");
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: html }));
    await page.goto(`http://localhost:5173/${entry.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry.heading);
    await expect(page.getByRole("heading", { name: "How to play", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Quiz categories" }).getByRole("link")).toHaveCount(3);
    await expect(page.getByRole("button")).toBeDisabled();
    for (const selector of ["title", 'meta[name="description"]', 'link[rel="canonical"]', 'meta[name="robots"]']) await expect(page.locator(selector)).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    const structured = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const breadcrumb = structured.flat().find(item => item["@type"] === "BreadcrumbList");
    expect(breadcrumb.itemListElement.map((item: { item: string }) => item.item)).toEqual(["https://hard-quiz.com/", `https://hard-quiz.com/${entry.slug}`]);
    const routes = JSON.parse(readFileSync("vercel.json", "utf8")).routes;
    const route = routes.find((rule: { has?: unknown; src?: string }) => !rule.has && rule.src && new RegExp(rule.src).test(`/${entry.slug}`));
    expect(route.dest).toBe("/$1.html");
    const redirect = routes.find((rule: { has?: unknown; src?: string }) => !rule.has && rule.src && new RegExp(rule.src).test(`/${entry.slug}.html`));
    expect(redirect.status).toBe(301);
    expect(readFileSync("dist/sitemap.xml", "utf8")).toContain(`<loc>https://hard-quiz.com/${entry.slug}</loc>`);
    await context.close();
  });
}

test("a missing or empty category never falls back to an available movie quiz", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.route("**/rest/v1/category?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(categories.filter(category => category.name !== "Actors")) }));
  await page.goto("/actor-quiz?category=1");
  await expect(page.getByText("This quiz category is currently unavailable.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play quiz", exact: true })).toBeDisabled();
  expect(calls.filter(call => ["quiz_start", "count_questions"].includes(call.name))).toHaveLength(0);
  await page.goto("/actress-quiz?category=1");
  await expect(page.getByRole("button", { name: "Coming soon", exact: true })).toBeDisabled();
  expect(calls.filter(call => call.name === "count_questions").at(-1)?.payload.p_category_id).toBe(3);
  expect(calls.filter(call => call.name === "quiz_start")).toHaveLength(0);
});

test("category navigation is crawlable on the homepage and stays usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const calls = await mockQuizApi(page);
  await page.route("**/rest/v1/rpc/count_questions", route => route.fulfill({ contentType: "application/json", body: "10" }));
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "Quiz categories" });
  for (const entry of pages) await expect(links.locator(`a[href="/${entry.slug}"]`)).toBeVisible();
  await links.locator('a[href="/tv-series-quiz"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(pages[3].heading);
  await expect(page.getByRole("button", { name: "Play TV Series", exact: true })).toBeEnabled();
  await expect(page).toHaveTitle("TV Series Quiz — Guess the Show from a Still | Hard Quiz");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(calls.filter(call => call.name === "quiz_start")).toHaveLength(0);
  await page.screenshot({ path: test.info().outputPath("tv-series-category-mobile.png"), fullPage: true });
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath(`tv-series-category-${width}.png`), fullPage: true });
  }
});
