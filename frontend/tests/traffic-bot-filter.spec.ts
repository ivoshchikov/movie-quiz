import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { mockHumanBrowser, mockQuizApi, mockSignedIn } from "./fixtures";
import { mockConsent } from "./privacy-fixtures";

const agents = JSON.parse(readFileSync(new URL("../../supabase/tests/fixtures/traffic_user_agents.json", import.meta.url), "utf8")) as
  { name: string; ua: string; bot: boolean; browser?: boolean }[];

async function telemetry(page: Page) {
  await mockConsent(page, { granted: true });
  await mockQuizApi(page);
  const calls: string[] = [];
  for (const name of ["site_visit_heartbeat", "site_record_page_view"]) {
    await page.route(`**/rest/v1/rpc/${name}`, route => {
      calls.push(name);
      return route.fulfill({ status: 204 });
    });
  }
  return calls;
}

for (const agent of agents.filter(a => a.browser)) test.describe(agent.name, () => {
  test.use({ userAgent: agent.ua });
  test("filters both telemetry streams without blocking public pages", async ({ page }) => {
    await mockHumanBrowser(page); // Exercise UA detection independently of WebDriver.
    await page.clock.install();
    const calls = await telemetry(page);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Play Movies" })).toBeEnabled();
    if (!agent.bot) await expect.poll(() => calls.length).toBe(2);
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Blog", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();
    await page.clock.fastForward(121000);
    if (agent.bot) {
      expect(calls).toEqual([]);
      expect(await page.evaluate(() => localStorage.getItem("hq_visitor_id"))).toBeNull();
    } else {
      await expect.poll(() => calls.filter(c => c === "site_visit_heartbeat").length).toBeGreaterThan(1);
      await expect.poll(() => calls.filter(c => c === "site_record_page_view").length).toBe(2);
    }
  });
});

test("WebDriver with an ordinary UA does not collect, including after reload", async ({ page }) => {
  const calls = await telemetry(page);
  await page.goto("/");
  expect(await page.evaluate(() => navigator.webdriver)).toBe(true);
  await expect(page.getByRole("button", { name: "Play Movies" })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Play Movies" })).toBeEnabled();
  expect(calls).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("hq_visitor_id"))).toBeNull();
});

test("owner exclusion persists without sending telemetry or cleanup requests", async ({ page }) => {
  const calls = await telemetry(page);
  await mockSignedIn(page, "112743d7-f683-4bbb-8117-068e89a00f22");
  await page.addInitScript(() => localStorage.setItem("hq_visitor_id", "77777777-7777-4777-8777-777777777777"));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  expect(calls).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("hq_visitor_owner_browser"))).toBe("1");
});
