import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockHumanBrowser, mockQuizApi, mockSignedIn } from "./fixtures";

test.beforeEach(async ({ page }) => { await mockHumanBrowser(page); });

const owner = "112743d7-f683-4bbb-8117-068e89a00f22";
const id = "77777777-7777-4777-8777-777777777777";
const snapshot = () => ({ online: 2, today: 12, week: 65, month: 1240,
  date: "2026-11-01", since: "2026-10-31T12:00:00Z", updated_at: "2026-11-01T18:00:00Z", timezone: "America/Chicago" });
async function adminFixture(page: Page, account: "owner" | "player" | "guest" = "owner") {
  const calls = await mockQuizApi(page);
  if (account !== "guest") await mockSignedIn(page, account === "owner" ? owner : "fixture-user");
  const state = { value: snapshot() as unknown, fail: false, reads: [] as unknown[], delay: null as Promise<void> | null };
  await page.route("**/rest/v1/rpc/is_admin", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(account === "owner") }));
  await page.route("**/rest/v1/rpc/admin_visitor_stats", async r => {
    state.reads.push(r.request().postDataJSON());
    const { value, fail, delay } = state;
    if (delay) await delay;
    await r.fulfill({ status: fail ? 503 : 200, contentType: "application/json", body: JSON.stringify(fail ? {} : value) });
  });
  await page.route("**/rest/v1/rpc/admin_question_bank", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ rows: [], total: 0, bank_total: 0, page: 1, page_size: 25, summary: [] }) }));
  return { state, calls };
}
const panel = (page: Page) => page.getByRole("region", { name: "Visitor activity" });
const count = (page: Page, label: string) => panel(page).locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
async function telemetry(page: Page) {
  const calls = await mockQuizApi(page);
  const beats: Record<string, unknown>[] = [];
  await page.route("**/rest/v1/rpc/site_visit_heartbeat", r => {
    beats.push(r.request().postDataJSON());
    return r.fulfill({ status: 204 });
  });
  return { beats, calls };
}

test("private summary is shared by bank, upload and Daily without gameplay writes", async ({ page }) => {
  const { state, calls } = await adminFixture(page);
  for (const path of ["/admin/questions", "/admin/questions/new", "/admin/daily"]) {
    await page.goto(path);
    await expect(count(page, "Online now")).toHaveText("2");
    await expect(count(page, "Today")).toHaveText("12");
    await expect(count(page, "Last 7 days")).toHaveText("65");
    await expect(count(page, "Last 30 days")).toHaveText("1,240");
    await expect(panel(page).getByText(/Collecting since Oct 31, 2026/)).toBeVisible();
  }
  expect(state.reads).toEqual(Array(3).fill({ p_expected_owner: owner }));
  expect(calls.filter(c => /quiz_start|daily_begin|submit|set_daily|quiz_answer/.test(c.name))).toEqual([]);
});
for (const account of ["guest", "player"] as const) test(`${account} cannot load or see the visitor summary`, async ({ page }) => {
  const { state } = await adminFixture(page, account);
  await page.goto("/admin/questions");
  await expect(page.getByRole("heading", { name: account === "guest" ? "Administration" : "Access denied", exact: true })).toBeVisible();
  await expect(panel(page)).toHaveCount(0); expect(state.reads).toEqual([]);
});
test("failure is unavailable rather than zero, with explicit recovery and real empty counts", async ({ page }) => {
  const { state } = await adminFixture(page); state.fail = true;
  await page.goto("/admin/questions");
  await expect(panel(page).getByRole("alert")).toContainText("unavailable");
  await expect(count(page, "Today")).toHaveText("—");
  state.fail = false; state.value = { ...snapshot(), online: 0, today: 0, week: 0, month: 0 };
  await panel(page).getByRole("button", { name: "Retry stats" }).click();
  await expect(count(page, "Today")).toHaveText("0");
  await expect(panel(page).getByRole("alert")).toHaveCount(0);
});
test("refresh keeps confirmed counts, reports stale data on failure and recovers", async ({ page }) => {
  const { state } = await adminFixture(page);
  await page.goto("/admin/questions"); await expect(count(page, "Today")).toHaveText("12");
  state.fail = true;
  await panel(page).getByRole("button", { name: "Refresh stats" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("last confirmed counts");
  await expect(count(page, "Today")).toHaveText("12");
  state.fail = false; state.value = { ...snapshot(), today: 13 };
  await panel(page).getByRole("button", { name: "Retry stats" }).click();
  await expect(count(page, "Today")).toHaveText("13");
});
test("automatic polling refreshes the snapshot every 30 seconds", async ({ page }) => {
  await page.clock.install(); const { state } = await adminFixture(page);
  await page.goto("/admin/questions"); await expect(count(page, "Today")).toHaveText("12");
  state.value = { ...snapshot(), today: 13 };
  await page.clock.fastForward(31000); await expect(count(page, "Today")).toHaveText("13");
  expect(state.reads).toHaveLength(2);
});
test("late private responses cannot restore the summary after logout", async ({ page }) => {
  const { state } = await adminFixture(page);
  let release = () => {}; state.delay = new Promise<void>(resolve => { release = resolve; });
  await page.goto("/admin/questions"); await expect.poll(() => state.reads.length).toBe(1);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in to administration" })).toBeVisible();
  release(); await expect(panel(page)).toHaveCount(0);
});
for (const value of [
  { ...snapshot(), online: -1 }, { ...snapshot(), month: "1240" },
  { ...snapshot(), week: 1 }, { ...snapshot(), since: "not-a-date" },
]) test(`invalid stats never become confirmed numbers: ${JSON.stringify(value)}`, async ({ page }) => {
  const { state } = await adminFixture(page); state.value = value;
  await page.goto("/admin/questions");
  await expect(panel(page).getByRole("alert")).toContainText("unavailable");
  await expect(count(page, "Today")).toHaveText("—");
});

for (const theme of ["dark", "light", "christmas"]) test(`select chevrons and the summary fit mobile in ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await page.addInitScript(theme => localStorage.setItem("hard-quiz-theme", theme), theme);
  await adminFixture(page);
  for (const path of ["/admin/questions", "/admin/questions/new"]) {
    await page.goto(path); await expect(count(page, "Today")).toHaveText("12");
    const select = page.getByLabel(path.endsWith("/new") ? "Default category" : "Category", { exact: true });
    await expect(select).toHaveCSS("appearance", "none");
    const textFit = await select.evaluate(el => {
      const style = getComputedStyle(el), canvas = document.createElement("canvas");
      const measure = canvas.getContext("2d")!; measure.font = style.font;
      return { needed: measure.measureText((el as HTMLSelectElement).selectedOptions[0].label).width,
        available: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) };
    });
    expect(textFit.available).toBeGreaterThanOrEqual(textFit.needed);
    const arrow = select.locator("..").locator("svg");
    const a = await arrow.boundingBox(), s = await select.boundingBox();
    expect(a && s).toBeTruthy();
    expect(Math.abs(a!.y + a!.height / 2 - s!.y - s!.height / 2)).toBeLessThan(1);
    expect(s!.x + s!.width - a!.x - a!.width).toBeGreaterThanOrEqual(12);
    expect(await select.evaluate(el => parseFloat(getComputedStyle(el).paddingRight))).toBeGreaterThanOrEqual(40);
    await select.focus(); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
    await expect(select).toHaveValue(path.endsWith("/new") ? "2" : "1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
test("guest telemetry has only an opaque browser ID and survives reload without duplicate pings", async ({ page }) => {
  await page.clock.install(); const { beats, calls } = await telemetry(page);
  await page.goto("/?secret=do-not-collect#answer=private");
  await expect.poll(() => beats.length).toBe(1);
  expect(Object.keys(beats[0])).toEqual(["p_visitor"]);
  const visitor = beats[0].p_visitor;
  expect(visitor).toMatch(/^[0-9a-f-]{36}$/);
  await page.reload(); await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  expect(beats).toHaveLength(1);
  await page.clock.fastForward(61000); await expect.poll(() => beats.length).toBe(2);
  expect(beats[1].p_visitor).toBe(visitor);
  expect(calls.filter(c => /quiz_start|daily_begin|submit/.test(c.name))).toEqual([]);
});
test("background and offline tabs stop reporting, then resume on visibility/online", async ({ page }) => {
  await page.clock.install(); const { beats } = await telemetry(page);
  await page.goto("/"); await expect.poll(() => beats.length).toBe(1);
  await page.evaluate(() => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }));
  await page.clock.fastForward(180000); expect(beats).toHaveLength(1);
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => beats.length).toBe(2);
  await page.evaluate(() => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }));
  await page.clock.fastForward(120000); expect(beats).toHaveLength(2);
  await page.evaluate(() => { Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true }); window.dispatchEvent(new Event("online")); });
  await expect.poll(() => beats.length).toBe(3);
});
test("a timed-out heartbeat does not permanently stop reporting or affect the page", async ({ page }) => {
  await page.clock.install(); await mockQuizApi(page);
  let reads = 0, release = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/site_visit_heartbeat", async r => {
    reads++; if (reads === 1) await held;
    await r.fulfill({ status: 204 });
  });
  await page.goto("/"); await expect.poll(() => reads).toBe(1);
  // Finish unrelated catalogue reads before advancing every timer past 10 seconds.
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  const aborted = page.waitForEvent("requestfailed", request => request.url().endsWith("/rpc/site_visit_heartbeat"));
  await page.clock.fastForward(11000);
  await aborted;
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  await page.clock.fastForward(51000); await expect.poll(() => reads).toBe(2);
  release();
});
test("owner exclusion removes prior guest telemetry and survives logout", async ({ page }) => {
  await page.clock.install(); const { beats } = await telemetry(page);
  await mockSignedIn(page, owner);
  await page.addInitScript(id => localStorage.setItem("hq_visitor_id", id), id);
  await page.goto("/"); await expect.poll(() => beats.length).toBe(1);
  expect(beats[0]).toEqual({ p_visitor: id }); // This authenticated call purges/excludes; it never records a visit.
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  await page.clock.fastForward(180000); expect(beats).toHaveLength(1);
});
test("owner without a visitor ID, opt-out, administration and preview never collect visits", async ({ page }) => {
  const { beats } = await telemetry(page);
  await page.goto("/?analytics=off");
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  await page.reload(); expect(beats).toHaveLength(0);
  await page.goto("/admin/questions"); await expect(page.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
  expect(beats).toHaveLength(0);
  await mockSignedIn(page, owner); await page.goto("/");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible(); expect(beats).toHaveLength(0);
});
test("denied visitor storage falls back to a stable ID for the current document", async ({ page }) => {
  await page.clock.install(); const { beats } = await telemetry(page);
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key.startsWith("hq_visitor")) throw new DOMException("Denied"); return get.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key.startsWith("hq_visitor")) throw new DOMException("Denied"); return set.call(this, key, value); };
  });
  await page.goto("/"); await expect.poll(() => beats.length).toBe(1);
  await page.clock.fastForward(61000); await expect.poll(() => beats.length).toBe(2);
  expect(beats[0].p_visitor).toBe(beats[1].p_visitor);
});
test("a preview host never sends visitor telemetry", async ({ page }) => {
  const { beats } = await telemetry(page);
  await page.route("http://preview.invalid:5173/**", async route => {
    const response = await route.fetch({ url: route.request().url().replace("preview.invalid", "localhost") });
    await route.fulfill({ response });
  });
  await page.goto("http://preview.invalid:5173/");
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  expect(beats).toHaveLength(0);
});
test("simultaneous new tabs share one browser identifier", async ({ page, context }) => {
  const other = await context.newPage();
  await mockHumanBrowser(other);
  const a = await telemetry(page), b = await telemetry(other);
  await Promise.all([page.goto("/"), other.goto("/")]);
  await expect.poll(() => a.beats.length + b.beats.length).toBeGreaterThan(0);
  const ids = [...a.beats, ...b.beats].map(p => p.p_visitor);
  expect(new Set(ids).size).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("hq_visitor_id"))).toBe(await other.evaluate(() => localStorage.getItem("hq_visitor_id")));
  await other.close();
});
