import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn } from "./fixtures";

const epoch = new Date("2026-10-07T12:00:00Z");
interface Row { nickname: string | null; best_score: number; best_time: number; user_id?: string; }
async function fixture(page: Page, signedIn = false) {
  const calls = await mockQuizApi(page);
  if (signedIn) await mockSignedIn(page);
  const data = {
    rows: [{ nickname: "MovieFan", best_score: 27, best_time: 82, user_id: "fixture-user" }] as Row[],
    best: { score: 27, time: 82 } as { score: number; time: number } | null,
    count: 42, failScores: false, failCount: false, failBest: false, missingCount: false, malformed: false,
    scoresCalls: 0, bestCalls: 0, saves: [] as Record<string, number | string>[],
  };
  await page.route("**/rest/v1/rpc/get_leaderboard", route => {
    data.scoresCalls++;
    const payload = route.request().postDataJSON();
    calls.push({ name: "get_leaderboard", payload });
    return route.fulfill({ status: data.failScores ? 503 : 200, contentType: "application/json", body: JSON.stringify(data.failScores ? { message: "fixture unavailable" } : data.malformed ? [{ nickname: "Invalid", best_score: 10, best_time: null }] : data.rows.slice(0, payload.p_limit)) });
  });
  await page.route("**/rest/v1/question?**", route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("select") === "correct_answer") return route.fallback();
    return route.fulfill({ status: data.failCount ? 503 : 200, contentType: "application/json", headers: data.missingCount ? {} : { "content-range": `0-${Math.max(0, data.count - 1)}/${data.count}`, "access-control-expose-headers": "content-range" }, body: "" });
  });
  await page.route("**/rest/v1/user_best?**", route => {
    data.bestCalls++;
    const url = new URL(route.request().url());
    return route.fulfill({ status: data.failBest ? 503 : 200, contentType: "application/json", body: JSON.stringify(data.failBest ? { message: "fixture record failure" } : data.best ? [{ category_id: Number(url.searchParams.get("category_id")?.replace("eq.", "")), difficulty_level_id: Number(url.searchParams.get("difficulty_level_id")?.replace("eq.", "")), best_score: data.best.score, best_time: data.best.time }] : []) });
  });
  await page.route("**/rest/v1/rpc/upsert_user_best", route => {
    const payload = route.request().postDataJSON(); data.saves.push(payload);
    data.best = { score: payload.p_score, time: payload.p_time };
    data.rows = [{ nickname: "MovieFan", best_score: payload.p_score, best_time: payload.p_time, user_id: payload.p_user_id }];
    return route.fulfill({ contentType: "application/json", body: "null" });
  });
  return { data, calls };
}

async function loaded(page: Page, path = "/leaderboard") {
  await page.goto(path);
  await expect(page.locator(".hq-leaderboard-table")).toBeVisible();
  await expect(page.getByRole("link", { name: "Play this quiz", exact: true })).toBeVisible();
}

test("the public list shows saved duration without starting a game", async ({ page }) => {
  const { calls } = await fixture(page);
  await loaded(page);
  await expect(page.getByRole("cell", { name: "01:22", exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 player shown" })).toBeVisible();
  await expect(page.locator(".hq-leaderboard-personal")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show top 20" })).toHaveCount(0);
  await page.getByText("How ranking works", { exact: true }).click();
  await expect(page.getByText(/including loading and feedback/)).toBeVisible();
  expect(calls.some(call => ["get_question", "upsert_user_best", "start_daily_session"].includes(call.name))).toBe(false);
});

test("top 10 can expand to top 20 and preserves the server order for ties", async ({ page }) => {
  const { data } = await fixture(page);
  data.rows = Array.from({ length: 23 }, (_, i) => ({ nickname: `Player ${i + 1}`, best_score: 30 - Math.floor(i / 2), best_time: i % 2 ? 5 : 100 }));
  await loaded(page);
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(page.locator("tbody tr").nth(0)).toContainText("Player 1");
  await expect(page.locator("tbody tr").nth(1)).toContainText("Player 2");
  await page.getByRole("button", { name: "Show top 20" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await expect(page.getByRole("status").filter({ hasText: "20 players shown · Top 20" })).toBeVisible();
  await page.getByRole("button", { name: "Show top 10" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(10);
});

test("filters update URLs, retain other parameters, reload and browser history", async ({ page }) => {
  await fixture(page);
  await loaded(page, "/leaderboard?category=1&difficulty=1&source=result");
  await page.getByRole("radio", { name: "Actors", exact: true }).click();
  await page.getByRole("radio", { name: "Hard", exact: true }).click();
  await expect(page).toHaveURL(/category=2&difficulty=3&source=result$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Actors — Hard", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("radio", { name: "Easy", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.goBack();
  await expect(page.getByRole("radio", { name: "Movie Stills", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.goForward();
  await expect(page.getByRole("radio", { name: "Actors", exact: true })).toHaveAttribute("aria-checked", "true");
});

test("the quiz action uses both selected ids and remains available to guests", async ({ page }) => {
  const { calls } = await fixture(page);
  await loaded(page, "/leaderboard?category=2&difficulty=3");
  await page.getByRole("link", { name: "Play this quiz", exact: true }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  await expect.poll(() => calls.filter(call => call.name === "get_question").at(-1)?.payload).toMatchObject({ p_category_id: 2, p_difficulty_id: 3 });
});

test("the login invitation preserves the selected leaderboard and does not publish a guest result", async ({ page }) => {
  const { data } = await fixture(page);
  await loaded(page, "/leaderboard?category=2&difficulty=3");
  await page.getByRole("complementary", { name: "Leaderboard account" }).getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/category=2&difficulty=3$/);
  expect(data.saves).toEqual([]);
});

test("available empty quizzes invite a first score", async ({ page }) => {
  const { data } = await fixture(page); data.rows = [];
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "No scores yet", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Play this quiz", exact: true })).toBeVisible();
});

test("empty unavailable quizzes do not promise a first score", async ({ page }) => {
  const { data } = await fixture(page); data.rows = []; data.count = 0;
  await page.goto("/leaderboard?category=3&difficulty=2");
  await expect(page.getByRole("heading", { name: "This quiz isn’t available yet", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quiz unavailable", exact: true })).toBeDisabled();
  await expect(page.getByText(/Set the first personal best/)).toHaveCount(0);
});

test("historical records remain visible when the question bank is empty", async ({ page }) => {
  const { data } = await fixture(page); data.count = 0;
  await page.goto("/leaderboard?category=3&difficulty=2");
  await expect(page.getByRole("cell", { name: "MovieFan", exact: true })).toBeVisible();
  await expect(page.getByText("This quiz is currently unavailable. Saved records are still shown.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quiz unavailable", exact: true })).toBeDisabled();
});

test("availability failures can be retried without hiding the public scores", async ({ page }) => {
  const { data } = await fixture(page); data.failCount = true;
  await page.goto("/leaderboard");
  await expect(page.getByRole("cell", { name: "MovieFan", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play this quiz", exact: true })).toBeDisabled();
  await expect(page.getByText(/Quiz availability could not be checked/)).toBeVisible();
  data.failCount = false;
  await page.getByRole("button", { name: "Retry quiz availability" }).click();
  await expect(page.getByRole("link", { name: "Play this quiz", exact: true })).toBeVisible();
});

test("missing count metadata is an error rather than an unavailable quiz", async ({ page }) => {
  const { data } = await fixture(page); data.missingCount = true;
  await page.goto("/leaderboard");
  await expect(page.getByRole("button", { name: "Retry quiz availability" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quiz unavailable" })).toHaveCount(0);
});

test("malformed scores and durations show a retry instead of invalid numbers", async ({ page }) => {
  const { data } = await fixture(page); data.malformed = true;
  await page.goto("/leaderboard");
  await expect(page.getByRole("button", { name: "Retry scores" })).toBeVisible();
  await expect(page.getByText(/NaN|Invalid|No scores yet/)).toHaveCount(0);
  data.malformed = false;
  await page.getByRole("button", { name: "Retry scores" }).click();
  await expect(page.getByRole("cell", { name: "01:22", exact: true })).toBeVisible();
});

test("a held scores request times out and can be retried", async ({ page }) => {
  await page.clock.install({ time: epoch });
  await fixture(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  let first = true;
  await page.route("**/rest/v1/rpc/get_leaderboard", async route => {
    if (first) { first = false; await held; }
    await route.fallback().catch(() => {});
  });
  await page.goto("/leaderboard");
  await expect(page.getByText("Loading scores…", { exact: true })).toBeVisible();
  await page.clock.runFor(10100);
  await expect(page.getByRole("button", { name: "Retry scores" })).toBeVisible();
  release();
  await page.getByRole("button", { name: "Retry scores" }).click();
  await expect(page.getByRole("cell", { name: "MovieFan", exact: true })).toBeVisible();
});

test("late responses cannot replace the selected category", async ({ page }) => {
  await fixture(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  let first = true;
  await page.route("**/rest/v1/rpc/get_leaderboard", async route => {
    if (first) { first = false; await held; await route.fulfill({ contentType: "application/json", body: JSON.stringify([{ nickname: "OldCategory", best_score: 99, best_time: 1 }]) }).catch(() => {}); }
    else await route.fallback();
  });
  await page.goto("/leaderboard");
  await expect(page.getByText("Loading scores…", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Actors", exact: true }).click();
  await expect(page.getByRole("cell", { name: "MovieFan", exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("heading", { name: "Actors — Easy", exact: true })).toBeVisible();
  await expect(page.getByText("OldCategory", { exact: true })).toHaveCount(0);
});

test("the personal best has its own retry and does not invent an absent record", async ({ page }) => {
  const { data } = await fixture(page, true); data.failBest = true;
  await loaded(page);
  await expect(page.getByRole("button", { name: "Retry your record" })).toBeVisible();
  await expect(page.getByText("No score in this quiz yet.")).toHaveCount(0);
  data.failBest = false;
  await page.getByRole("button", { name: "Retry your record" }).click();
  await expect(page.locator(".hq-leaderboard-personal dd").first()).toHaveText("27 points");
  await expect(page.locator(".hq-leaderboard-personal dd").nth(1)).toHaveText("01:22");
});

test("only a matching user id identifies the player's own row", async ({ page }) => {
  const { data } = await fixture(page, true);
  data.rows = [{ nickname: "MovieFan", best_score: 27, best_time: 82 }];
  await loaded(page);
  await expect(page.locator(".hq-leaderboard-you")).toHaveCount(0);
  await expect(page.locator(".hq-leaderboard-personal dd").first()).toHaveText("27 points");
  data.rows[0].user_id = "fixture-user";
  await page.reload();
  await expect(page.locator(".hq-leaderboard-own")).toHaveCount(1);
  await expect(page.locator(".hq-leaderboard-you")).toHaveText("You");
});

test("an account without a record gets a clear empty personal state", async ({ page }) => {
  const { data } = await fixture(page, true); data.best = null;
  await loaded(page);
  await expect(page.getByText("No score in this quiz yet.")).toBeVisible();
  await expect(page.locator(".hq-leaderboard-personal dd")).toHaveCount(0);
});

test("signing out removes private statistics and the own-row marker", async ({ page }) => {
  await fixture(page, true); await loaded(page);
  await expect(page.locator(".hq-leaderboard-own")).toHaveCount(1);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.locator(".hq-leaderboard-personal")).toHaveCount(0);
  await expect(page.locator(".hq-leaderboard-own")).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Leaderboard account" })).toBeVisible();
});

test("a saved quiz uses the same elapsed seconds on result and leaderboard", async ({ page }) => {
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(new Date(epoch.getTime() + 1000)); await page.clock.setSystemTime(epoch);
  const { data } = await fixture(page, true); data.best = null;
  await loaded(page);
  await page.getByRole("link", { name: "Play this quiz", exact: true }).click();
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  await page.clock.runFor(10000);
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await page.getByRole("button", { name: "End quiz & save", exact: true }).click();
  await expect.poll(() => data.saves.length).toBe(1);
  expect(data.saves[0]).toMatchObject({ p_user_id: "fixture-user", p_category_id: 1, p_difficulty_id: 1, p_time: 10 });
  await expect(page.locator(".hq-result-stats dd").first()).toHaveText("00:10");
  await page.getByRole("link", { name: "View leaderboard" }).click();
  await expect(page.getByRole("cell", { name: "00:10", exact: true })).toBeVisible();
  await expect(page.locator(".hq-leaderboard-personal dd").nth(1)).toHaveText("00:10");
});

for (const [width, height] of [[320, 480], [375, 812], [390, 844], [568, 320], [768, 1024], [1024, 768], [1440, 900]]) {
  test(`long names, scores and controls remain accessible at ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const { data } = await fixture(page, true);
    data.rows[0].nickname = "VeryLongNicknameWithoutSpaces".repeat(5);
    await loaded(page);
    await expect(page.locator(".hq-leaderboard-personal dd").first()).toHaveText("27 points");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const action = page.getByRole("link", { name: "Play this quiz", exact: true });
    await action.scrollIntoViewIfNeeded();
    const box = await action.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    if (width <= 620) {
      await expect(page.getByRole("combobox", { name: "Category", exact: true })).toBeVisible();
      await expect(page.locator(".hq-leaderboard-mobile-duration")).toBeVisible();
      await page.getByRole("combobox", { name: "Category", exact: true }).selectOption("2");
    } else await page.getByRole("radio", { name: "Actors", exact: true }).click();
    await expect(page).toHaveURL(/category=2&difficulty=1$/);
    await expect(page.getByText(data.rows[0].nickname!, { exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`leaderboard-${width}.png`), fullPage: true });
  });
}

test("the catalog times out and can be retried without starting an attempt", async ({ page }) => {
  await page.clock.install({ time: epoch });
  const { calls } = await fixture(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  let first = true;
  await page.route("**/rest/v1/category?**", async route => {
    if (first) { first = false; await held; }
    await route.fallback().catch(() => {});
  });
  await page.goto("/leaderboard");
  await expect(page.getByText("Loading quiz options…", { exact: true })).toBeVisible();
  await page.clock.runFor(10100);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  release();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".hq-leaderboard-table")).toBeVisible();
  expect(calls.some(call => call.name === "get_question")).toBe(false);
});

test("a late private response stays hidden after sign-out", async ({ page }) => {
  await fixture(page, true);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/user_best?**", async route => { await held; await route.fallback().catch(() => {}); });
  await loaded(page);
  await expect(page.getByText("Loading your record…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  release();
  await expect(page.locator(".hq-leaderboard-personal")).toHaveCount(0);
  await expect(page.locator(".hq-leaderboard-own")).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Leaderboard account" })).toBeVisible();
});

test("confirmation of a pending save refreshes the visible leaderboard and record", async ({ page }) => {
  const { data } = await fixture(page, true); await loaded(page);
  await expect(page.locator(".hq-leaderboard-personal dd").first()).toHaveText("27 points");
  data.best = { score: 38, time: 104 }; data.rows[0] = { nickname: "MovieFan", best_score: 38, best_time: 104, user_id: "fixture-user" };
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("hq:quiz:result-updated", { detail: {
    id: "confirmed-queued-run", playKey: "another-play", userId: "fixture-user", categoryId: 1, difficultyId: 1,
    score: 38, elapsedSecs: 104, finishReason: "exit", saveStatus: "saved",
  } })));
  await expect(page.locator(".hq-leaderboard-personal dd").first()).toHaveText("38 points");
  await expect(page.getByRole("cell", { name: "01:44", exact: true })).toBeVisible();
  expect(data.bestCalls).toBeGreaterThanOrEqual(2); expect(data.scoresCalls).toBeGreaterThanOrEqual(2);
});

test("difficulty filters work with the keyboard and retain visible focus", async ({ page }) => {
  await fixture(page); await loaded(page);
  const easy = page.getByRole("radio", { name: "Easy", exact: true });
  await easy.focus(); await page.keyboard.press("ArrowRight");
  const medium = page.getByRole("radio", { name: "Medium", exact: true });
  await expect(medium).toBeFocused(); await expect(medium).toHaveAttribute("aria-checked", "true");
  await expect(page).toHaveURL(/category=1&difficulty=2$/);
  expect(await medium.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
});

test("loading another category keeps the previous list height", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { data } = await fixture(page);
  data.rows = Array.from({ length: 10 }, (_, i) => ({ nickname: `Film player ${i + 1}`, best_score: 40 - i, best_time: 82 + i }));
  await loaded(page);
  await expect(page.locator("tbody tr")).toHaveCount(10);
  const before = await page.locator(".hq-leaderboard-results").boundingBox();
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/get_leaderboard", async route => { await held; await route.fallback(); });
  await page.getByRole("radio", { name: "Actors", exact: true }).click();
  await expect(page.getByText("Loading scores…", { exact: true })).toBeVisible();
  const during = await page.locator(".hq-leaderboard-results").boundingBox();
  expect(during!.height).toBeGreaterThanOrEqual(before!.height - 1);
  release();
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await page.screenshot({ path: testInfo.outputPath("leaderboard-regular-desktop.png"), fullPage: true });
});
