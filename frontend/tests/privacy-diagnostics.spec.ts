import { test, expect, type Page } from "@playwright/test";
import { mockHumanBrowser, mockQuizApi } from "./fixtures";
import { mockConsent } from "./privacy-fixtures";

async function fixture(page: Page, options: Parameters<typeof mockConsent>[1] = {}) {
  await mockHumanBrowser(page); await mockConsent(page, options); await mockQuizApi(page);
  const sent: string[] = [];
  await page.route("**/rest/v1/rpc/site_{visit_heartbeat,record_page_view}", route => {
    sent.push(route.request().url()); return route.fulfill({ status: 204 });
  });
  return sent;
}
const result = (page: Page) => page.getByLabel("Privacy diagnostic result");
const read = async (page: Page) => JSON.parse(await result(page).innerText());

test("diagnostics suppresses optional measurement even with a saved grant, without changing that choice", async ({ page }) => {
  const sent = await fixture(page, { region: "other", granted: true });
  await page.addInitScript(() => localStorage.setItem("hq_privacy_v1", JSON.stringify({
    version: 1, at: Date.now(), measurement: true, analytics: true,
  })));
  await page.goto("/?privacy=diagnostics");
  await expect.poll(() => read(page)).toMatchObject({ tagStatus: "loaded", optionalMeasurementBlocked: true,
    bridge: { status: "ready", measurementConsent: true, analyticsConsent: true } });
  expect(sent).toEqual([]);
  expect(await page.locator('script[src*="googletagmanager.com/gtag/js"],script[src*="adsbygoogle.js"]').count()).toBe(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("hq_privacy_v1")!).analytics)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("hq_visitor_id"))).toBeNull();
});

test("a first regional exemption leaves the diagnostic result accessible and manual privacy controls still work", async ({ page }) => {
  const sent = await fixture(page, { region: "other" });
  await page.goto("/?privacy=diagnostics");
  await expect.poll(() => read(page)).toMatchObject({ native: { gdprApplies: false }, bridge: { region: "other" } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Privacy settings", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Reject analytics" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0); expect(sent).toEqual([]);
});

test("a tag load failure remains distinguishable from a later timeout", async ({ page }) => {
  const sent = await fixture(page);
  await page.route("https://fundingchoicesmessages.google.com/**", route => route.abort("blockedbyclient"));
  await page.clock.install(); await page.goto("/?privacy=diagnostics");
  await expect.poll(() => read(page)).toMatchObject({ tagStatus: "failed", firstFailure: "script-load-error" });
  await page.clock.runFor(20500);
  await expect.poll(() => read(page)).toMatchObject({ complete: true, firstFailure: "script-load-error",
    apiReady: false, bridge: { status: "unavailable" } });
  expect(sent).toEqual([]);
});

test("a loaded tag without ready APIs reports a timeout rather than an invented geographic answer", async ({ page }) => {
  const sent = await fixture(page, { delayed: true });
  await page.clock.install(); await page.goto("/?privacy=diagnostics&fc=alwaysshow&fctype=gdpr");
  await expect.poll(() => read(page)).toMatchObject({ tagStatus: "loaded", apiReady: false });
  await page.clock.runFor(20500);
  await expect.poll(() => read(page)).toMatchObject({ complete: true, firstFailure: "timeout", native: null,
    bridge: { status: "unavailable", region: "unknown" } });
  expect(sent).toEqual([]);
});

test("diagnostics copies only allowlisted fields and sanitized CSP origins", async ({ page, context }) => {
  await fixture(page, { granted: true });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.clock.install(); await page.goto("/?privacy=diagnostics&private_query=secret-query");
  await expect.poll(() => read(page)).toMatchObject({ apiReady: true });
  await page.evaluate(() => {
    document.cookie = "private_cookie=secret-cookie; path=/";
    localStorage.setItem("private_email", "private@example.test");
    const api = (window as unknown as { __consentFixture: { emit: (data: unknown, mode: number) => void } }).__consentFixture;
    api.emit({ tcString: "secret-tcf-string", eventStatus: "useractioncomplete", publisher: { consents: { 1: true, 8: true, 9: true } } }, 1);
    document.dispatchEvent(new SecurityPolicyViolationEvent("securitypolicyviolation", {
      blockedURI: "https://blocked.example/script.js?token=secret-token", effectiveDirective: "script-src-elem",
    }));
  });
  await page.clock.runFor(20500);
  await page.getByRole("button", { name: "Copy result" }).click();
  await expect(page.getByText("Result copied.", { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied)).toMatchObject({ complete: true, blockedScriptOrigins: ["https://blocked.example"],
    native: { cmpId: 300, gdprApplies: true }, analyticsScriptElements: 0, advertisingScriptElements: 0 });
  expect(copied).not.toMatch(/secret-|private@example|tcString|publisher|private_query/);
});

test("diagnostic UI is restricted to the requested home URL and fits a narrow viewport", async ({ page }) => {
  await fixture(page, { region: "other" });
  await page.setViewportSize({ width: 320, height: 840 });
  await page.goto("/?privacy=diagnostics");
  await expect(page.getByRole("heading", { name: "Privacy diagnostics", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/privacy?privacy=diagnostics");
  await expect(page.getByRole("heading", { name: "Privacy Policy", exact: true })).toBeVisible();
  await expect(result(page)).toHaveCount(0); await expect(page.locator("#hq-google-cmp")).toHaveCount(0);
});
