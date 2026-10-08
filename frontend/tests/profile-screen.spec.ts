import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn } from "./fixtures";
import { dailyFixture } from "./daily-fixtures";

const epoch = new Date("2026-10-07T12:00:00Z");
const row = (category = 1, difficulty = 1, score = 12, time = 65) => ({ category_id: category, difficulty_level_id: difficulty, best_score: score, best_time: time, updated_at: "2026-10-05T12:00:00Z" });
async function fixture(page: Page) {
  const calls = await mockQuizApi(page);
  await mockSignedIn(page);
  const data = {
    rows: [row(2, 3, 4, 132), row(1, 3, 12, 65), row(1, 1, 0, 0)] as Record<string, unknown>[],
    streak: { current_streak: 3, longest_streak: 7, total_correct: 12 } as unknown,
    profile: { nickname: "MovieFan", avatar_url: null } as { nickname: string | null; avatar_url: string | null } | null,
    failBests: false, failDaily: false, failProfile: false, failCatalog: false, failCount: false, missingCount: false,
    counts: new Map<string, number>(), bestCalls: 0, dailyCalls: 0, writes: [] as { method: string; query: string; body: unknown }[],
  };
  await page.route("**/rest/v1/profiles?**", route => {
    const method = route.request().method();
    if (method === "HEAD") return route.fulfill({ headers: { "content-range": "0-0/0", "access-control-expose-headers": "content-range" }, body: "" });
    if (method !== "GET") {
      const body = route.request().postDataJSON();
      data.writes.push({ method, query: route.request().url(), body });
      data.profile = { nickname: body.nickname, avatar_url: data.profile?.avatar_url ?? null };
    }
    return route.fulfill({ status: data.failProfile ? 503 : 200, contentType: "application/json", body: JSON.stringify(data.failProfile ? { message: "fixture account error" } : data.profile) });
  });
  await page.route("**/rest/v1/user_best?**", route => {
    data.bestCalls++;
    const url = new URL(route.request().url());
    const category = url.searchParams.get("category_id"), difficulty = url.searchParams.get("difficulty_level_id");
    const rows = category && difficulty ? data.rows.filter(row => category === `eq.${row.category_id}` && difficulty === `eq.${row.difficulty_level_id}`) : data.rows;
    return route.fulfill({ status: data.failBests ? 503 : 200, contentType: "application/json", body: JSON.stringify(data.failBests ? { message: "fixture bests error" } : rows) });
  });
  await page.route("**/rest/v1/rpc/get_daily_user_streak", route => {
    data.dailyCalls++;
    return route.fulfill({ status: data.failDaily ? 503 : 200, contentType: "application/json", body: JSON.stringify(data.failDaily ? { message: "fixture streak error" } : data.streak == null ? [] : [data.streak]) });
  });
  await page.route("**/rest/v1/question?**", route => {
    if (route.request().method() !== "HEAD") return route.fallback();
    const url = new URL(route.request().url());
    const key = `${url.searchParams.get("category_id")?.replace("eq.", "")}:${url.searchParams.get("difficulty_level_id")?.replace("eq.", "")}`;
    const count = data.counts.get(key) ?? 42;
    return route.fulfill({ status: data.failCount ? 503 : 200, headers: data.missingCount ? {} : { "content-range": `0-${Math.max(0, count - 1)}/${count}`, "access-control-expose-headers": "content-range" }, body: "" });
  });
  for (const name of ["category", "difficulty_level"]) await page.route(`**/rest/v1/${name}?**`, route => data.failCatalog ? route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"fixture catalog error"}' }) : route.fallback());
  return { data, calls };
}
async function loaded(page: Page) {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "MovieFan", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Play again: Movie Stills — Hard", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh results", exact: true })).toBeEnabled();
}

test("records group in catalog order, with a count, correct duration and a fixed identity", async ({ page }) => {
  const { calls, data } = await fixture(page);
  await loaded(page);
  await expect(page.locator(".hq-profile-group h3")).toHaveText(["Movie Stills", "Actors"]);
  await expect(page.getByRole("table", { name: "Movie Stills personal bests" }).getByRole("rowheader")).toHaveText(["Easy", "Hard"]);
  await expect(page.locator(".hq-profile-count")).toHaveText("3");
  await expect(page.getByRole("cell", { name: "00:00", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-daily dd")).toHaveText(["3 days", "7 days"]);
  await expect(page.locator('meta[name="robots"][data-rh="true"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("button", { name: /Change nickname/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: /Change nickname/ })).toHaveCount(0);
  expect(data.writes).toEqual([]);
  expect(calls.some(call => ["get_question", "start_daily_session", "upsert_user_best"].includes(call.name))).toBe(false);
});

test("record actions pass the exact category and difficulty to the game and leaderboard", async ({ page }) => {
  const { calls } = await fixture(page);
  await loaded(page);
  await page.getByRole("link", { name: "View leaderboard: Actors — Hard", exact: true }).click();
  await expect(page).toHaveURL(/\/leaderboard\?category=2&difficulty=3$/);
  await expect(page.getByRole("radio", { name: "Actors", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Hard", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.goBack();
  await page.getByRole("link", { name: "Play again: Actors — Hard", exact: true }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  expect(calls.filter(call => call.name === "get_question").at(-1)?.payload).toMatchObject({ p_category_id: 2, p_difficulty_id: 3 });
});

test("historical scores stay visible when only that exact quiz is unavailable", async ({ page }) => {
  const { data } = await fixture(page); data.counts.set("1:3", 0);
  await page.goto("/profile");
  await expect(page.getByText("Quiz unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Play again: Movie Stills — Hard", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Play again: Movie Stills — Easy", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View leaderboard: Movie Stills — Hard", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
});

test("unknown catalog IDs retain history without linking to an unrelated quiz", async ({ page }) => {
  const { data } = await fixture(page); data.rows.push(row(99, 81, 25, 123));
  await loaded(page);
  const historic = page.getByRole("table", { name: "Category 99 personal bests" });
  await expect(historic.getByRole("rowheader", { name: "Level 81" })).toBeVisible();
  await expect(historic.getByRole("cell", { name: "02:03", exact: true })).toBeVisible();
  await expect(historic.getByRole("link")).toHaveCount(0);
  await expect(historic).toContainText("Quiz details unavailable");
});

test("a catalog failure keeps records and Daily visible, with its own retry", async ({ page }) => {
  const { data } = await fixture(page); data.failCatalog = true;
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Retry quiz details", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-daily dd").first()).toHaveText("3 days");
  data.failCatalog = false;
  await page.getByRole("button", { name: "Retry quiz details", exact: true }).click();
  await expect(page.getByRole("link", { name: "Play again: Movie Stills — Hard", exact: true })).toBeVisible();
});

test("a results failure leaves identity and Daily available and is never an empty profile", async ({ page }) => {
  const { data } = await fixture(page); data.failBests = true;
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Retry results", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MovieFan", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-daily dd").first()).toHaveText("3 days");
  await expect(page.getByRole("heading", { name: "Your first personal best is waiting" })).toHaveCount(0);
  data.failBests = false;
  await page.getByRole("button", { name: "Retry results", exact: true }).click();
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
});

test("Daily can fail and retry without hiding personal bests", async ({ page }) => {
  const { data } = await fixture(page); data.failDaily = true;
  await loaded(page);
  await expect(page.getByRole("button", { name: "Retry Daily stats", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-daily dd")).toHaveCount(0);
  data.failDaily = false;
  await page.getByRole("button", { name: "Retry Daily stats", exact: true }).click();
  await expect(page.locator(".hq-profile-daily dd")).toHaveText(["3 days", "7 days"]);
});

test("no Daily history is a legitimate zero streak with a link to Daily", async ({ page }) => {
  const { data } = await fixture(page); data.streak = null;
  await loaded(page);
  await expect(page.locator(".hq-profile-daily dd")).toHaveText(["0 days", "0 days"]);
  await expect(page.getByRole("link", { name: "View Daily", exact: true })).toHaveAttribute("href", "/daily");
});

test("empty results explain how to earn a record and offer a working quiz entry", async ({ page }) => {
  const { data } = await fixture(page); data.rows = [];
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Your first personal best is waiting" })).toBeVisible();
  await expect(page.locator(".hq-profile-count")).toHaveText("0");
  await expect(page.getByText(/after it is saved/)).toBeVisible();
  await page.getByRole("link", { name: "Start a quiz", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Play Movie Stills", exact: true })).toBeVisible();
});

for (const [label, invalid] of [["negative score", { best_score: -1 }], ["fractional score", { best_score: 1.5 }], ["missing duration", { best_time: null }], ["negative duration", { best_time: -1 }], ["invalid category", { category_id: "1" }]] as const) {
  test(`invalid data: ${label} shows a recoverable error`, async ({ page }) => {
    const { data } = await fixture(page); data.rows = [{ ...row(), ...invalid }];
    await page.goto("/profile");
    await expect(page.getByRole("button", { name: "Retry results", exact: true })).toBeVisible();
    await expect(page.locator(".hq-profile-table")).toHaveCount(0);
    data.rows = [row()];
    await page.getByRole("button", { name: "Retry results", exact: true }).click();
    await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
  });
}

test("duplicate record keys are rejected while an invalid date uses an honest placeholder", async ({ page }) => {
  const { data } = await fixture(page); data.rows = [row(), row()];
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Retry results", exact: true })).toBeVisible();
  data.rows = [{ ...row(), updated_at: "not-a-date" }];
  await page.getByRole("button", { name: "Retry results", exact: true }).click();
  await expect(page.getByRole("cell", { name: "—", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-date time")).toHaveCount(0);
});

for (const invalid of [{ current_streak: -1, longest_streak: 7, total_correct: 12 }, false, 0, ""]) test(`malformed streak data ${JSON.stringify(invalid)} is an error instead of zero`, async ({ page }) => {
  const { data } = await fixture(page); data.streak = invalid;
  await loaded(page);
  await expect(page.getByRole("button", { name: "Retry Daily stats", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-daily dd")).toHaveCount(0);
});

for (const missing of [false, true]) test(`availability ${missing ? "missing metadata" : "failure"} is not an unavailable quiz`, async ({ page }) => {
  const { data } = await fixture(page); data.failCount = !missing; data.missingCount = missing;
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Retry availability for Movie Stills — Hard", exact: true })).toBeVisible();
  await expect(page.getByText("Quiz unavailable", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View leaderboard: Movie Stills — Hard", exact: true })).toBeVisible();
  data.failCount = false; data.missingCount = false;
  await page.getByRole("button", { name: "Retry availability for Movie Stills — Hard", exact: true }).click();
  await expect(page.getByRole("link", { name: "Play again: Movie Stills — Hard", exact: true })).toBeVisible();
});

test("account load failure never opens nickname creation and can recover independently", async ({ page }) => {
  const { data } = await fixture(page); data.failProfile = true;
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Retry profile", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
  data.failProfile = false;
  await page.getByRole("button", { name: "Retry profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "MovieFan", exact: true })).toBeVisible();
  expect(data.writes).toEqual([]);
});

test("Daily profile failure cannot start a session or offer a new nickname", async ({ page }) => {
  const data = await dailyFixture(page);
  let fail = true;
  await page.route("**/rest/v1/profiles?**", route => fail ? route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"fixture profile failure"}' }) : route.fallback());
  await page.goto("/daily");
  await expect(page.getByRole("button", { name: "Retry profile", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(0);
  fail = false;
  await page.getByRole("button", { name: "Retry profile", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
});

test("existing nicknames cannot be edited by visiting the old setup URL", async ({ page }) => {
  const { data } = await fixture(page);
  await page.goto("/setup-profile");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".hq-account-name")).toHaveText("MovieFan");
  await expect(page.getByRole("textbox", { name: "Nickname", exact: true })).toHaveCount(0);
  expect(data.writes).toEqual([]);
});

test("setup read errors do not allow nickname writes", async ({ page }) => {
  const { data } = await fixture(page); data.failProfile = true;
  await page.goto("/setup-profile");
  await expect(page.getByRole("button", { name: "Retry profile", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nickname", exact: true })).toHaveCount(0);
  data.failProfile = false;
  await page.getByRole("button", { name: "Retry profile", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(data.writes).toEqual([]);
});

test("initial creation trims a nickname and creates a genuinely missing profile", async ({ page }) => {
  const { data } = await fixture(page); data.profile = null;
  await page.goto("/setup-profile");
  await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("  NewFilmFan  ");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".hq-account-name")).toHaveText("NewFilmFan");
  expect(data.writes).toHaveLength(1);
  expect(data.writes[0]).toMatchObject({ method: "POST", body: { user_id: "fixture-user", nickname: "NewFilmFan", avatar_url: null } });
});

test("a nickname chosen in another tab is confirmed instead of overwritten", async ({ page }) => {
  const { data } = await fixture(page); data.profile = { nickname: null, avatar_url: "https://fixture.test/avatar" };
  await page.goto("/setup-profile");
  await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("SecondName");
  data.profile.nickname = "FirstName";
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".hq-account-name")).toHaveText("FirstName");
  expect(data.writes).toEqual([]);
});

test("initial selection preserves an existing avatar and updates only an empty nickname", async ({ page }) => {
  const { data } = await fixture(page); data.profile = { nickname: null, avatar_url: "https://fixture.test/avatar" };
  await page.goto("/setup-profile");
  await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("Film_Fan");
  const check = page.waitForRequest(request => request.url().includes("/profiles?") && request.method() === "HEAD");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(new URL((await check).url()).searchParams.get("nickname")).toBe("ilike.Film\\_Fan");
  await expect(page.locator(".hq-account-name")).toHaveText("Film_Fan");
  expect(data.writes).toHaveLength(1);
  expect(data.writes[0]).toMatchObject({ method: "PATCH", body: { nickname: "Film_Fan" } });
  expect(new URL(data.writes[0].query).searchParams.get("nickname")).toBe("is.null");
  expect(data.profile?.avatar_url).toBe("https://fixture.test/avatar");
});

test("nickname availability errors block writes and permit retry", async ({ page }) => {
  const { data } = await fixture(page); data.profile = null;
  let fail = true;
  await page.route("**/rest/v1/profiles?**", route => route.request().method() === "HEAD" && fail ? route.fulfill({ status: 503, body: "" }) : route.fallback());
  await page.goto("/setup-profile");
  await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("NewName");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("could not be confirmed");
  expect(data.writes).toEqual([]);
  fail = false;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".hq-account-name")).toHaveText("NewName");
  expect(data.writes).toHaveLength(1);
});

test("a taken nickname stays in the form without a write", async ({ page }) => {
  const { data } = await fixture(page); data.profile = null;
  await page.route("**/rest/v1/profiles?**", route => route.request().method() === "HEAD" ? route.fulfill({ headers: { "content-range": "0-0/1", "access-control-expose-headers": "content-range" }, body: "" }) : route.fallback());
  await page.goto("/setup-profile");
  await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("ExistingName");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("This nickname is taken");
  expect(data.writes).toEqual([]);
});

test("a concurrent conditional update never replaces a previously chosen nickname", async ({ page }) => {
  const { data } = await fixture(page); data.profile = { nickname: null, avatar_url: null };
  let attempted = 0;
  await page.route("**/rest/v1/profiles?**", route => {
    if (route.request().method() !== "PATCH") return route.fallback();
    attempted++;
    expect(new URL(route.request().url()).searchParams.get("nickname")).toBe("is.null");
    data.profile = { nickname: "FirstChoice", avatar_url: null };
    return route.fulfill({ contentType: "application/json", body: "null" });
  });
  await page.goto("/setup-profile");
  await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("SecondChoice");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".hq-account-name")).toHaveText("FirstChoice");
  expect(attempted).toBe(1);
  expect(data.writes).toEqual([]);
});

test("manual refresh retains records and explains a failed refresh", async ({ page }) => {
  const { data } = await fixture(page);
  await loaded(page); data.failBests = true;
  await page.getByRole("button", { name: "Refresh results", exact: true }).click();
  await expect(page.getByText(/Showing previously loaded records/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
  data.failBests = false; data.rows = [row(1, 3, 36, 94)];
  await page.getByRole("button", { name: "Retry results", exact: true }).click();
  await expect(page.getByRole("cell", { name: "01:34", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-count")).toHaveText("1");
});

test("only confirmed results of this account refresh the personal list", async ({ page }) => {
  const { data } = await fixture(page);
  await loaded(page);
  const before = data.bestCalls;
  const result = { id: "queued-run", playKey: "old-play", userId: "fixture-user", categoryId: 1, difficultyId: 3, score: 36, elapsedSecs: 94, finishReason: "exit", saveStatus: "pending" };
  await page.evaluate(result => { window.dispatchEvent(new CustomEvent("hq:quiz:result-updated", { detail: result })); window.dispatchEvent(new CustomEvent("hq:quiz:result-updated", { detail: { ...result, userId: "foreign-user", saveStatus: "saved" } })); }, result);
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
  expect(data.bestCalls).toBe(before);
  data.rows = [row(1, 3, 36, 94)];
  await page.evaluate(result => window.dispatchEvent(new CustomEvent("hq:quiz:result-updated", { detail: { ...result, saveStatus: "saved" } })), result);
  await expect(page.getByRole("cell", { name: "01:34", exact: true })).toBeVisible();
  expect(data.bestCalls).toBeGreaterThan(before);
});

test("a real queued result save updates the mounted profile after confirmation", async ({ page }) => {
  const { data } = await fixture(page);
  const result = { id: "pending-profile-run", playKey: "old-play", userId: "fixture-user", categoryId: 1, difficultyId: 3, score: 39, elapsedSecs: 91, finishReason: "exit", saveStatus: "pending", previousBest: { score: 12, time: 65 } };
  await page.addInitScript(result => localStorage.setItem("hq:quiz:pending:" + result.id, JSON.stringify(result)), result);
  let release = () => {}, waiting = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/upsert_user_best", async route => {
    waiting = true; await held;
    data.rows = [row(1, 3, 39, 91)];
    await route.fulfill({ contentType: "application/json", body: "null" });
  });
  await loaded(page);
  await expect.poll(() => waiting).toBe(true);
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("cell", { name: "01:31", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("hq:quiz:pending:pending-profile-run"))).toBeNull();
});

test("a held read times out; its late response cannot replace a retried result", async ({ page }) => {
  await page.clock.install({ time: epoch });
  await fixture(page);
  let release = () => {}, first = true;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/user_best?**", async route => {
    if (first) { first = false; await held; await route.fulfill({ contentType: "application/json", body: JSON.stringify([row(1, 1, 999, 1)]) }).catch(() => {}); }
    else await route.fallback();
  });
  await page.goto("/profile");
  await expect(page.getByText("Loading your results…", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MovieFan", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-daily dd").first()).toHaveText("3 days");
  await page.clock.runFor(10100);
  await page.getByRole("button", { name: "Retry results", exact: true }).click();
  await expect(page.getByRole("cell", { name: "01:05", exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("cell", { name: "999", exact: true })).toHaveCount(0);
});

test("late private reads stay hidden after sign-out", async ({ page }) => {
  await fixture(page);
  let release = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/user_best?**", async route => { await held; await route.fallback().catch(() => {}); });
  await page.goto("/profile");
  await expect(page.getByText("Loading your results…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  release();
  await expect(page).toHaveURL(/\/login(?:\?redirect=[^#]+)?$/);
  await expect(page.locator(".hq-profile-panel")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("switching accounts isolates identity, records and Daily from late responses", async ({ page }) => {
  await fixture(page);
  let release = () => {}, waiting = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/user_best?**", async route => {
    if (new URL(route.request().url()).searchParams.get("user_id") === "eq.fixture-user") {
      waiting = true; await held;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify([row(1, 1, 999, 1)]) }).catch(() => {});
    } else await route.fulfill({ contentType: "application/json", body: JSON.stringify([row(1, 3, 7, 18)]) });
  });
  await page.route("**/rest/v1/profiles?**", route => new URL(route.request().url()).searchParams.get("user_id") === "eq.second-user" ? route.fulfill({ contentType: "application/json", body: '{"nickname":"SecondPlayer","avatar_url":null}' }) : route.fallback());
  await page.route("**/rest/v1/rpc/get_daily_user_streak", route => route.request().postDataJSON().p_user_id === "second-user" ? route.fulfill({ contentType: "application/json", body: '[{"current_streak":1,"longest_streak":2,"total_correct":5}]' }) : route.fallback());
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "MovieFan", exact: true })).toBeVisible();
  await expect.poll(() => waiting).toBe(true);
  await page.evaluate(() => {
    const key = "sb-quiz-fixture-auth-token";
    const session = JSON.parse(localStorage.getItem(key)!);
    session.user = { ...session.user, id: "second-user", email: "second@example.test" };
    localStorage.setItem(key, JSON.stringify(session));
    const channel = new BroadcastChannel(key);
    channel.postMessage({ event: "SIGNED_IN", session });
    channel.close();
  });
  await expect(page.getByRole("heading", { name: "SecondPlayer", exact: true })).toBeVisible();
  await expect(page.locator(".hq-account-name")).toHaveText("SecondPlayer");
  await expect(page.getByRole("cell", { name: "00:18", exact: true })).toBeVisible();
  await expect(page.locator(".hq-profile-daily dd")).toHaveText(["1 day", "2 days"]);
  release();
  await expect(page.getByRole("heading", { name: "MovieFan", exact: true })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "999", exact: true })).toHaveCount(0);
});

test("Chicago midnight refreshes Daily statistics without playing an attempt", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-08T04:59:58Z") });
  const { data, calls } = await fixture(page);
  await loaded(page);
  const before = data.dailyCalls;
  data.streak = { current_streak: 0, longest_streak: 7, total_correct: 12 };
  await page.clock.runFor(3000);
  await expect(page.locator(".hq-profile-daily dd").first()).toHaveText("0 days");
  expect(data.dailyCalls).toBeGreaterThan(before);
  expect(calls.some(call => ["get_daily_question", "start_daily_session", "submit_daily_result"].includes(call.name))).toBe(false);
});

test("all record actions are keyboard reachable with visible focus", async ({ page }) => {
  await fixture(page); await loaded(page);
  const action = page.getByRole("link", { name: "View leaderboard: Actors — Hard", exact: true });
  await action.focus();
  await expect(action).toBeFocused();
  await expect(action).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/leaderboard\?category=2&difficulty=3$/);
});

for (const [width, height] of [[320, 480], [320, 568], [375, 812], [430, 932], [568, 320], [768, 1024], [1366, 900]]) test(`profile fits ${width}×${height} with long names and accessible actions`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height });
  const { data } = await fixture(page); data.profile!.nickname = "VeryLongFilmFanName20";
  await page.route("**/rest/v1/category?**", async route => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([
      { id: 1, name: "All movies" }, { id: 2, name: "Very long category title with several words" },
      { id: 3, name: "Actresses" }, { id: 4, name: "TV series" },
    ]) });
  });
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "Play again: Movie Stills — Hard", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const action of await page.locator(".hq-profile-record-actions a, .hq-profile-refresh, .hq-profile-daily a").all()) {
    const rect = await action.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.height).toBeGreaterThanOrEqual(44);
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
  }
  if (width === 1366 || width === 375) await page.screenshot({ path: testInfo.outputPath(`profile-${width}.png`), fullPage: true });
});
