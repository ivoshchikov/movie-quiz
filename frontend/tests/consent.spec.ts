import { test, expect, type Page } from "@playwright/test";
import { mockHumanBrowser, mockQuizApi } from "./fixtures";
import { mockConsent } from "./privacy-fixtures";
import { gameFixture, gameAnswers } from "./game-fixtures";

async function fixture(page: Page, options: Parameters<typeof mockConsent>[1] = {}) {
  await mockHumanBrowser(page); await mockConsent(page, options); await mockQuizApi(page);
  const sent: string[] = [];
  await page.route("**/rest/v1/rpc/site_{visit_heartbeat,record_page_view}", route => {
    sent.push(new URL(route.request().url()).pathname.split("/").pop()!); return route.fulfill({ status: 204 });
  });
  return sent;
}
async function emit(page: Page, consent: Record<string, boolean>, mode = 1, patch: Record<string, unknown> = {}) {
  await page.evaluate(({ consent, mode, patch }) => {
    (window as unknown as { __consentFixture: { emit: (patch: unknown, mode: number) => void } }).__consentFixture.emit({
      eventStatus: "useractioncomplete", publisher: { consents: consent }, ...patch,
    }, mode);
  }, { consent, mode, patch });
}
const gaScripts = (page: Page) => page.locator('script[src*="googletagmanager.com/gtag/js"]');
async function eventNames(page: Page) { return page.evaluate(() => (window.dataLayer || []).map(x => Array.from(x as IArguments)).filter(x => x[0] === "event").map(x => x[1])); }
async function optionalKeys(page: Page) { return page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(k => k.startsWith("hq_visitor") && k !== "hq_visitor_owner_browser" || k.startsWith("hq:analytics:v2:"))); }

test("first visit has no optional network or identifiers and refusal still allows a real fixture game", async ({ page }) => {
  const sent = await fixture(page);
  await gameFixture(page);
  await page.goto("/?analytics=on");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep analytics off" }).click();
  await page.getByRole("button", { name: "Play Movies" }).click();
  await expect(page.getByRole("button", { name: gameAnswers[0], exact: true })).toBeEnabled();
  await page.getByRole("button", { name: gameAnswers[0], exact: true }).click();
  await expect(page.getByText("Correct! +1 point")).toBeVisible();
  expect(sent).toEqual([]); expect(await eventNames(page)).toEqual([]);
  expect(await gaScripts(page).count()).toBe(0); expect(await optionalKeys(page)).toEqual([]);
});

test("an explicit European choice starts only the current page and SPA visits once", async ({ page }) => {
  const sent = await fixture(page); await page.goto("/");
  await expect(page.getByRole("button", { name: "Play Movies" })).toBeEnabled();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Blog", exact: true }).click();
  expect(sent).toEqual([]);
  await emit(page, { 1: true, 8: true, 9: true });
  await expect(gaScripts(page)).toHaveCount(1);
  await expect.poll(() => sent.length).toBe(2);
  expect(await eventNames(page)).toEqual(["page_view"]);
  const commands = await page.evaluate(() => window.dataLayer.map(x => Array.from(x as IArguments)));
  expect(commands[0]).toMatchObject(["consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]);
  expect(commands.filter(x => x[0] === "config")).toHaveLength(1);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Games", exact: true }).click();
  await expect.poll(async () => (await eventNames(page)).filter(x => x === "page_view").length).toBe(2);
});

for (const mode of [0, 2, 3, 4]) test(`Google analytics does not accept consent enum ${mode} as a grant`, async ({ page }) => {
  await fixture(page); await page.goto("/");
  await expect(page.getByRole("button", { name: "Play Movies" })).toBeEnabled();
  await emit(page, { 1: true, 8: true, 9: true }, mode);
  expect(await gaScripts(page).count()).toBe(0); expect(await eventNames(page)).toEqual([]);
});

test("partial purposes allow content counters while Google Analytics and ads stay off", async ({ page }) => {
  const sent = await fixture(page); await page.goto("/");
  await expect(page.getByRole("button", { name: "Play Movies" })).toBeEnabled();
  await emit(page, { 1: true, 8: true, 9: false }, 1);
  await expect.poll(() => sent.length).toBe(2);
  expect(await gaScripts(page).count()).toBe(0); expect(await eventNames(page)).toEqual([]);
  expect(await page.locator('script[src*="adsbygoogle"], ins.adsbygoogle').count()).toBe(0);
});

test("withdrawal synchronously stops in-flight counters, deletes only optional storage, and does not replay old views", async ({ page }) => {
  const sent = await fixture(page, { granted: true });
  let release = () => {}; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/site_record_page_view", async route => { sent.push("held-view"); await held; await route.fulfill({ status: 204 }); });
  await page.goto("/"); await expect(gaScripts(page)).toHaveCount(1);
  await expect.poll(() => sent.includes("held-view")).toBe(true);
  await page.evaluate(() => { sessionStorage.setItem("hq:analytics:v2:test", "optional"); localStorage.setItem("quiz-game-preserved", "necessary"); document.cookie = "_ga=old; path=/"; });
  const aborted = page.waitForEvent("requestfailed", request => request.url().includes("site_record_page_view"));
  await page.getByRole("button", { name: "Privacy settings", exact: true }).click(); await aborted;
  expect(await optionalKeys(page)).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).not.toContain("_ga=");
  expect(await page.evaluate(() => localStorage.getItem("quiz-game-preserved"))).toBe("necessary");
  expect(await page.evaluate(() => (window as unknown as Record<string, boolean>)["ga-disable-G-QUIZFIXTURE"])).toBe(true);
  const before = sent.length;
  await page.getByRole("button", { name: "Keep analytics off" }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Blog", exact: true }).click();
  expect(sent).toHaveLength(before); release();
});

test("outside Europe a regional exemption still needs opt-in, with independent purposes and a returning choice", async ({ page }) => {
  const sent = await fixture(page, { region: "other" }); await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(sent).toEqual([]); expect(await gaScripts(page).count()).toBe(0);
  await page.getByRole("checkbox", { name: /Site audience counters/ }).check();
  await page.getByRole("button", { name: "Save choices", exact: true }).click();
  await expect.poll(() => sent.length).toBe(2); expect(await gaScripts(page).count()).toBe(0);
  await page.reload(); await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => sent.length).toBe(3); // One new page view; heartbeat remains throttled.
  expect(await gaScripts(page).count()).toBe(0);
});

test("outside Europe rejection is remembered and can be changed through Privacy settings", async ({ page }) => {
  const sent = await fixture(page, { region: "other" }); await page.goto("/");
  await page.getByRole("button", { name: "Reject analytics" }).click();
  await page.reload(); await expect(page.getByRole("dialog")).toHaveCount(0); expect(sent).toEqual([]);
  await page.getByRole("button", { name: "Privacy settings", exact: true }).click();
  await page.getByRole("button", { name: "Accept analytics" }).click();
  await expect(gaScripts(page)).toHaveCount(1); await expect.poll(() => sent.length).toBe(2);
});

test("missing or malformed CMP stays closed for measurement, including saved permission and analytics=on", async ({ page }) => {
  const sent = await fixture(page, { granted: true });
  await page.route("https://fundingchoicesmessages.google.com/**", route => route.abort("failed"));
  await page.goto("/?analytics=on");
  await expect(page.getByText(/Privacy controls could not be loaded/)).toBeVisible();
  expect(sent).toEqual([]); expect(await gaScripts(page).count()).toBe(0); expect(await optionalKeys(page)).toEqual([]);
});

test("GPC keeps every optional purpose off even after consent callbacks", async ({ page }) => {
  const sent = await fixture(page, { granted: true });
  await page.addInitScript(() => Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, get: () => true }));
  await page.goto("/"); await expect(page.getByRole("button", { name: "Play Movies" })).toBeEnabled();
  expect(sent).toEqual([]); expect(await gaScripts(page).count()).toBe(0);
});

test("a malformed update revokes an earlier grant rather than retaining it", async ({ page }) => {
  const sent = await fixture(page, { granted: true }); await page.goto("/");
  await expect(gaScripts(page)).toHaveCount(1); await expect.poll(() => sent.length).toBe(2);
  await emit(page, { 1: true, 8: true, 9: true }, 1, { cmpId: 999 });
  expect(await page.evaluate(() => (window as unknown as Record<string, boolean>)["ga-disable-G-QUIZFIXTURE"])).toBe(true);
  expect(await optionalKeys(page)).toEqual([]);
  const before = sent.length;
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Blog", exact: true }).click();
  expect(sent).toHaveLength(before);
});

test("another tab's withdrawal immediately disables this tab without a game reset", async ({ page, context }) => {
  const sent = await fixture(page, { granted: true }); await page.goto("/");
  await expect(gaScripts(page)).toHaveCount(1); await expect.poll(() => sent.length).toBe(2);
  const other = await context.newPage(); await fixture(other, { granted: true }); await other.goto("/");
  await expect(gaScripts(other)).toHaveCount(1);
  await other.getByRole("button", { name: "Privacy settings", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, boolean>)["ga-disable-G-QUIZFIXTURE"])).toBe(true);
  expect(await optionalKeys(page)).toEqual([]);
  const before = sent.length;
  await page.getByRole("button", { name: "Keep analytics off" }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Blog", exact: true }).click();
  expect(sent).toHaveLength(before); await other.close();
});

test("a blocked preference store permits an explicit document-only choice and requires a new choice after reload", async ({ page }) => {
  await fixture(page, { region: "other" });
  await page.addInitScript(() => {
    const originalGet = Storage.prototype.getItem, originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key.startsWith("hq_privacy")) throw new DOMException("Denied"); return originalGet.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key.startsWith("hq_privacy")) throw new DOMException("Denied"); return originalSet.call(this, key, value); };
  });
  await page.goto("/"); await page.getByRole("button", { name: "Accept analytics" }).click();
  await expect(gaScripts(page)).toHaveCount(1); await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible(); expect(await gaScripts(page).count()).toBe(0);
});

test("late CMP messages and manual settings wait for the running game without resetting it", async ({ page }) => {
  await fixture(page, { granted: true }); await gameFixture(page); await page.goto("/");
  await page.getByRole("button", { name: "Play Movies" }).click();
  await expect(page.getByRole("button", { name: gameAnswers[0], exact: true })).toBeEnabled();
  await page.evaluate(() => (window as unknown as { __consentFixture: { message: () => void } }).__consentFixture.message());
  await page.getByRole("button", { name: "Privacy settings", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: gameAnswers[0], exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { __consentFixture: { proceeds: boolean[] } }).__consentFixture.proceeds)).toEqual([]);
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await page.getByRole("button", { name: "End quiz & save", exact: true }).click();
  await expect(page).toHaveURL(/\/result$/);
  expect(await page.evaluate(() => (window as unknown as { __consentFixture: { proceeds: boolean[] } }).__consentFixture.proceeds)).toEqual([true]);
});

test("a fresh policy document never loads CMP or analytics even with a saved grant", async ({ page }) => {
  const sent = await fixture(page, { granted: true }); await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy", exact: true })).toBeVisible();
  expect(sent).toEqual([]); expect(await gaScripts(page).count()).toBe(0);
  expect(await page.locator("#hq-google-cmp").count()).toBe(0);
});

for (const theme of ["light", "dark", "christmas"]) for (const width of [320, 390, 1440]) test(`privacy controls fit and support keyboard access in ${theme} at ${width}px`, async ({ page }, info) => {
  await fixture(page, { region: "other" }); await page.setViewportSize({ width, height: 840 }); await page.goto("/");
  await page.evaluate(theme => localStorage.setItem("hard-quiz-theme", theme), theme); await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const panel = page.getByRole("dialog");
  const contrast = await panel.locator(".hq-privacy-panel").evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
    const text=luminance(style.color), background=luminance(style.backgroundColor);
    return (Math.max(text,background)+0.05)/(Math.min(text,background)+0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  for (const button of await panel.getByRole("button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath(`privacy-${theme}-${width}.png`), fullPage: true });
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await gaScripts(page).count()).toBe(0);
});
