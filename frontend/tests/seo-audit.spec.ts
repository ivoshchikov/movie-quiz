import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { mockQuizApi } from "./fixtures";

const origin = "https://hard-quiz.com";
const publicPages = [{ path: "/time-attack", file: "time-attack", heading: "Movie & Actor Time Attack" }, { path: "/this-or-that", file: "this-or-that", heading: "This or That: Actor Favourites" }, { path: "/", file: "index", heading: "Movie & Actor Quiz" }, { path: "/daily", file: "daily", heading: "Daily Movie, TV & Actor Quiz" }, { path: "/leaderboard", file: "leaderboard", heading: "Rankings" }, { path: "/how-to-play", file: "how-to-play", heading: "How to play" }];
for (const entry of publicPages) test(`first response for ${entry.path} has readable content and unique metadata`, async ({ browser }) => {
  test.skip(!existsSync(`dist/${entry.file}.html`), "Generated HTML is checked in the build job");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route("**/*", route => route.fulfill({ contentType: "text/html", body: readFileSync(`dist/${entry.file}.html`, "utf8") }));
  await page.goto("http://localhost:5173" + entry.path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry.heading);
  for (const selector of ["title", 'meta[name="description"]', 'meta[name="robots"]', 'link[rel="canonical"]', 'meta[property="og:url"]']) await expect(page.locator(selector)).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", origin + entry.path);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.getByRole("link", { name: "Blog", exact: true })).toHaveAttribute("href", "/blog");
  if (["/", "/daily", "/time-attack", "/this-or-that"].includes(entry.path)) {
    const links = page.getByRole("navigation", { name: "More games", exact: true });
    for (const target of ["/", "/daily", "/time-attack", "/this-or-that"].filter(path => path !== entry.path)) {
      await expect(links.locator(`a[href="${target}"]`)).toBeVisible();
    }
  }
  if (entry.path === "/daily") expect(readFileSync("dist/daily.html", "utf8")).not.toContain("correct_answer");
  await context.close();
});

test("sitemap includes Daily and only public canonical URLs", () => {
  const sitemap = readFileSync("dist/sitemap.xml", "utf8");
  expect(sitemap).toContain("<loc>https://hard-quiz.com/daily</loc>");
  for (const route of ["play", "result", "profile", "login", "setup-profile", "admin", "404"]) expect(sitemap).not.toContain(`<loc>${origin}/${route}`);
  expect(sitemap).not.toContain("changefreq");
  expect(sitemap).not.toContain("priority");
});

test("game and account pages are noindex before JavaScript and at the HTTP routing layer", () => {
  const routes = JSON.parse(readFileSync("vercel.json", "utf8")).routes;
  for (const name of ["play", "result", "profile"]) {
    const html = readFileSync(`dist/${name}.html`, "utf8");
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).toContain(`rel="canonical" href="${origin}/${name}"`);
    const rule = routes.find((r: { has?: unknown; src?: string }) => !r.has && r.src && new RegExp(r.src).test(`/${name}`));
    expect(rule.headers).toMatchObject({ "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" });
  }
});

test("duplicate host redirect preserves path and canonical route metadata", () => {
  const route = JSON.parse(readFileSync("vercel.json", "utf8")).routes[0];
  expect(route.has).toEqual([{ type: "host", value: "www.hard-quiz.com" }]);
  expect(route.status).toBe(308);
  expect("/daily".replace(new RegExp(route.src), route.headers.Location)).toBe(origin + "/daily");
});

test("filters stay in URL while canonical remains clean and indexability resets after private navigation", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/leaderboard?category=2&difficulty=1&source=fixture");
  await expect(page.getByRole("radio", { name: "Actors", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", origin + "/leaderboard");
  await page.goto("/login?returnTo=%2Fdaily");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Games", exact: true }).click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", origin + "/");
});
