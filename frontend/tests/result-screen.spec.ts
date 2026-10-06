import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { GameResult } from "../src/game/resultStorage";
import { mockQuizApi, mockSignedIn } from "./fixtures";

const epoch = new Date("2026-10-06T12:00:00Z");
type Best = { score: number; time: number } | null;
const storedResult = (overrides: Partial<GameResult> = {}): GameResult => ({
  id: "stored-run", playKey: "previous-play", userId: null, categoryId: 1, difficultyId: 1,
  score: 17, elapsedSecs: 83, finishReason: "exit", saveStatus: "device", finishedAt: epoch.getTime(),
  ...overrides,
});
async function seedResult(page: Page, result: GameResult) {
  await page.addInitScript(result => {
    const key = "hq:quiz:last:" + (result.userId ?? "guest");
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(result));
  }, result);
}
async function fixture(page: Page, signedIn = true, bankSize = 10) {
  const calls = await mockQuizApi(page);
  if (signedIn) await mockSignedIn(page);
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(new Date(epoch.getTime() + 1000));
  await page.clock.setSystemTime(epoch);
  await page.route("**/rest/v1/rpc/get_question", route => {
    const payload = route.request().postDataJSON();
    const index = payload.p_exclude_ids?.length ?? 0;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(index >= bankSize ? [] : [{
      id: 9000 + index, image_url: "https://quiz-fixture.supabase.co/fixture.svg",
      options_json: ["Fixture answer", "Second answer", "Third answer", "Fourth answer"],
      category_id: payload.p_category_id, difficulty_level_id: payload.p_difficulty_id,
    }]) });
  });
  return calls;
}
async function records(page: Page, initial: Best, accept = true) {
  let best = initial, saved = false, failRead = false, failSave = false;
  const saves: Record<string, number | string>[] = [];
  await page.route("**/rest/v1/user_best?**", route => {
    if (failRead) return route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"fixture read failure"}' });
    const url = new URL(route.request().url());
    const categoryId = Number(url.searchParams.get("category_id")?.replace("eq.", "")) || 1;
    const difficultyId = Number(url.searchParams.get("difficulty_level_id")?.replace("eq.", "")) || 1;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(best ? [{
      category_id: categoryId, difficulty_level_id: difficultyId, best_score: best.score, best_time: best.time,
    }] : []) });
  });
  await page.route("**/rest/v1/rpc/upsert_user_best", route => {
    const payload = route.request().postDataJSON();
    saves.push(payload);
    if (failSave) return route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"fixture save failure"}' });
    if (accept && (!best || payload.p_score > best.score || (payload.p_score === best.score && payload.p_time < best.time))) {
      best = { score: payload.p_score, time: payload.p_time };
    }
    saved = true;
    return route.fulfill({ status: 200, contentType: "application/json", body: "null" });
  });
  return { saves, saved: () => saved, failReads: (value: boolean) => { failRead = value; }, failSaves: (value: boolean) => { failSave = value; } };
}
async function play(page: Page, category = "Movie Stills", difficulty = "Easy") {
  await page.goto("/");
  await page.getByRole("radio", { name: category, exact: false }).click();
  await page.getByRole("radio", { name: difficulty, exact: true }).click();
  await page.getByRole("button", { name: "Play " + category, exact: true }).click();
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
}
async function finish(page: Page, answer = true) {
  if (answer) {
    await page.getByRole("button", { name: "Fixture answer", exact: true }).click();
    await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
    await page.clock.runFor(2200);
  }
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await page.getByRole("button", { name: "End quiz & save", exact: true }).click();
  await expect(page).toHaveURL(/\/result$/);
}

test("a fresh guest result shows the mode, duration, local status and contextual login", async ({ page }) => {
  const calls = await fixture(page, false);
  await play(page);
  await finish(page);
  await expect(page.getByRole("heading", { name: "Quiz ended", exact: true })).toBeVisible();
  await expect(page.locator(".hq-result-mode")).toHaveText("Movie Stills · Easy");
  await expect(page.locator(".hq-result-score strong")).toHaveText("1");
  await expect(page.getByText("Quiz duration", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-result-stats dd")).toHaveText("00:02");
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await expect(page.getByText("Personal best", { exact: true })).toHaveCount(0);
  expect(calls.filter(call => call.name === "upsert_user_best")).toHaveLength(0);
  await page.getByRole("complementary", { name: "Guest account" }).getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.locator(".hq-result-score strong")).toHaveText("1");
});

test("a new record is celebrated only after the account and server record are confirmed", async ({ page }) => {
  await fixture(page);
  const data = await records(page, { score: 0, time: 20 });
  await play(page);
  await finish(page);
  await expect(page.getByRole("status")).toContainText("Synced with your account");
  await expect(page.getByText("New personal best!", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-result-best-value")).toHaveText("1 point");
  expect(data.saves).toEqual([{ p_user_id: "fixture-user", p_category_id: 1, p_difficulty_id: 1, p_score: 1, p_time: 2 }]);
});

test("a first confirmed record has its own message", async ({ page }) => {
  await fixture(page);
  await records(page, null);
  await play(page);
  await finish(page);
  await expect(page.getByText("Your first personal best!", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-result-best-value")).toHaveText("1 point");
});

test("a lower score keeps the actual personal best without an award", async ({ page }) => {
  await fixture(page);
  await records(page, { score: 24, time: 100 });
  await play(page);
  await finish(page);
  await expect(page.getByRole("status")).toContainText("Synced with your account");
  await expect(page.locator(".hq-result-best-value")).toHaveText("24 points");
  await expect(page.locator(".hq-result-record")).toHaveCount(0);
});

test("a tied score is celebrated when the server confirms the improved time", async ({ page }) => {
  await fixture(page);
  await records(page, { score: 1, time: 50 });
  await play(page);
  await finish(page);
  await expect(page.getByText("New personal best!", { exact: true })).toBeVisible();
});

test("a successful RPC that leaves the server record unchanged never invents an award", async ({ page }) => {
  await fixture(page);
  await records(page, { score: 0, time: 20 }, false);
  await play(page);
  await finish(page);
  await expect(page.getByRole("status")).toContainText("Synced with your account");
  await expect(page.locator(".hq-result-best-value")).toHaveText("0 points");
  await expect(page.locator(".hq-result-record")).toHaveCount(0);
});

test("unavailable previous records do not block saving or invent a new record", async ({ page }) => {
  await fixture(page);
  const data = await records(page, { score: 0, time: 20 });
  data.failReads(true);
  await play(page);
  await finish(page);
  await expect(page.getByRole("status")).toContainText("Synced with your account");
  await expect(page.locator(".hq-result-record")).toHaveCount(0);
  await expect(page.locator(".hq-result-score strong")).toHaveText("1");
  await expect(page.locator(".hq-result-best-value").getByRole("button", { name: "Try again" })).toBeVisible();
  data.failReads(false);
  await page.locator(".hq-result-best-value").getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".hq-result-best-value")).toHaveText("1 point");
  await expect(page.locator(".hq-result-record")).toHaveCount(0);
});

test("failed syncing can be retried once with the exact score and duration", async ({ page }) => {
  await fixture(page);
  const data = await records(page, { score: 0, time: 20 });
  data.failSaves(true);
  await play(page);
  await finish(page);
  await expect(page.getByRole("status")).toContainText("Couldn’t sync with your account");
  await expect(page.getByRole("status")).toContainText("kept on this device");
  await expect(page.locator(".hq-result-record")).toHaveCount(0);
  const original = data.saves[0];
  data.failSaves(false);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Synced with your account");
  expect(data.saves).toHaveLength(2);
  expect(data.saves[1]).toEqual(original);
  await expect(page.getByText("New personal best!", { exact: true })).toBeVisible();
});

test("syncing is visible while the request is held and never delays replay", async ({ page }) => {
  await fixture(page);
  await records(page, null);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/upsert_user_best", async route => { await held; await route.fallback(); });
  await play(page);
  await finish(page);
  await expect(page.getByRole("status")).toContainText("Syncing…");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
  await expect(page.locator(".hq-result-record")).toHaveCount(0);
  await page.getByRole("link", { name: "Play again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  await expect(page.locator(".hq-game-stat strong")).toHaveText("0");
  release();
});

test("legacy results recover their labels and reloading identifies the previous run", async ({ page }) => {
  await mockQuizApi(page);
  await seedResult(page, storedResult({ finishedAt: undefined }));
  await page.goto("/result");
  await expect(page.getByRole("heading", { name: "Last quiz result" })).toBeVisible();
  await expect(page.locator(".hq-result-mode")).toHaveText("Movie Stills · Easy");
  await expect(page.locator(".hq-result-score strong")).toHaveText("17");
  await expect(page.locator(".hq-result-stats dd")).toHaveText("01:23");
  await expect(page.locator(".hq-result-date")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".hq-result-score strong")).toHaveText("17");
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  await expect(page.locator(".hq-result-record")).toHaveCount(0);
});

test("no result is distinct from a real zero score and has honest metadata", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/result");
  await expect(page.getByRole("heading", { name: "No result yet" })).toBeVisible();
  await expect(page.locator(".hq-result-score")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Play again" })).toHaveCount(0);
  await expect(page.locator('meta[name="description"][data-rh="true"]')).toHaveAttribute("content", /Choose a mode/);
  await page.getByRole("link", { name: "Start a quiz" }).click();
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeVisible();
});

test("corrupt and foreign account results are rejected rather than shown or submitted", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await mockSignedIn(page);
  await page.addInitScript(result => {
    localStorage.setItem("hq:quiz:last:fixture-user", JSON.stringify(result));
    localStorage.setItem("hq:quiz:pending:foreign", JSON.stringify(result));
    localStorage.setItem("hq:quiz:last:guest", JSON.stringify({ score: 999 }));
    history.replaceState({ usr: result, key: "foreign", idx: 0 }, "");
  }, storedResult({ userId: "other-user", saveStatus: "pending" }));
  await page.goto("/result");
  await expect(page.getByRole("heading", { name: "No result yet" })).toBeVisible();
  await expect(page.locator(".hq-result-score")).toHaveCount(0);
  expect(calls.filter(call => call.name === "upsert_user_best")).toHaveLength(0);
});

test("signing out replaces the account result with the guest's own result", async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  await records(page, { score: 17, time: 83 });
  await seedResult(page, storedResult({ userId: "fixture-user", saveStatus: "saved" }));
  await seedResult(page, storedResult({ id: "guest-run", score: 3 }));
  await page.goto("/result");
  await expect(page.locator(".hq-result-score strong")).toHaveText("17");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.locator(".hq-result-score strong")).toHaveText("3");
  await expect(page.getByText("Personal best", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
});

test("the leaderboard link preserves category and difficulty through reload and allows changing them", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await seedResult(page, storedResult({ categoryId: 2, difficultyId: 3 }));
  await page.goto("/result");
  await expect(page.locator(".hq-result-mode")).toHaveText("Actors · Hard");
  await page.getByRole("link", { name: "View leaderboard" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?category=2&difficulty=3$/);
  await expect(page.getByRole("radio", { name: /^Actors / })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Hard", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => calls.filter(call => call.name === "get_leaderboard").at(-1)?.payload).toMatchObject({ p_category_id: 2, p_difficulty_id: 3 });
  await page.reload();
  await expect(page.getByRole("radio", { name: "Hard", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Easy", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Easy", exact: true })).toHaveAttribute("aria-checked", "true");
});

test("invalid leaderboard parameters fall back to real options", async ({ page }) => {
  const calls = await mockQuizApi(page);
  await page.goto("/leaderboard?category=999&difficulty=oops");
  await expect(page.getByRole("radio", { name: /^Movie Stills / })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Easy", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("cell", { name: "FilmExpert" })).toBeVisible();
  expect(calls.filter(call => call.name === "get_leaderboard").every(call => call.payload.p_category_id !== 999)).toBeTruthy();
});

test("blocked quiz storage keeps a guest result visible without claiming it was saved", async ({ page }) => {
  await fixture(page, false);
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith("hq:quiz:")) throw new DOMException("Fixture storage blocked", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await play(page);
  await finish(page);
  await expect(page.locator(".hq-result-score strong")).toHaveText("1");
  await expect(page.getByRole("status")).toContainText("Browser storage is unavailable");
  await expect(page.getByRole("status")).not.toContainText("Saved on this device");
  await page.getByRole("link", { name: "Play again" }).click();
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
});

test("denied access to browser storage still allows a guest quiz and its result", async ({ page }) => {
  await fixture(page, false);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Fixture access denied", "SecurityError"); } });
  });
  await play(page);
  await finish(page);
  await expect(page.locator(".hq-result-score strong")).toHaveText("1");
  await expect(page.getByRole("status")).toContainText("Browser storage is unavailable");
  expect(errors).toEqual([]);
});

test("a cached personal best is marked as old when refreshing fails and can be refreshed", async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page);
  const data = await records(page, { score: 24, time: 100 });
  data.failReads(true);
  await seedResult(page, storedResult({ userId: "fixture-user", saveStatus: "saved", personalBest: { score: 17, time: 83 } }));
  await page.goto("/result");
  await expect(page.getByText("Last known personal best", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-result-best-value")).toHaveText("17 points");
  data.failReads(false);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.locator(".hq-result-best-value")).toHaveText("24 points");
  await expect(page.getByText("Personal best", { exact: true })).toBeVisible();
});

test("a delayed older save refreshes the record without replacing the latest quiz result", async ({ page }) => {
  await fixture(page);
  const data = await records(page, { score: 0, time: 20 });
  const older = storedResult({ id: "older-run", userId: "fixture-user", score: 27, saveStatus: "pending" });
  await page.addInitScript(result => {
    if (!localStorage.getItem("hq:quiz:pending:" + result.id)) localStorage.setItem("hq:quiz:pending:" + result.id, JSON.stringify(result));
  }, older);
  let waiting = false, release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/upsert_user_best", async route => {
    if (route.request().postDataJSON().p_score === 27) { waiting = true; await held; }
    await route.fallback();
  });
  await play(page);
  await expect.poll(() => waiting).toBeTruthy();
  await finish(page);
  await expect(page.getByRole("status")).toContainText("Synced with your account");
  await expect(page.locator(".hq-result-best-value")).toHaveText("1 point");
  release();
  await expect(page.locator(".hq-result-best-value")).toHaveText("27 points");
  await expect(page.locator(".hq-result-score strong")).toHaveText("1");
  expect(data.saves).toHaveLength(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("hq:quiz:last:fixture-user")!).score)).toBe(1);
});

test("a genuine zero score remains a result and replay works with the keyboard", async ({ page }) => {
  await fixture(page, false);
  await play(page);
  await finish(page, false);
  await expect(page.locator(".hq-result-score strong")).toHaveText("0");
  await expect(page.getByRole("heading", { name: "No result yet" })).toHaveCount(0);
  const replay = page.getByRole("link", { name: "Play again", exact: true });
  await replay.focus();
  await expect(replay).toBeFocused();
  await replay.press("Enter");
  await expect(page.getByRole("button", { name: "Fixture answer", exact: true })).toBeEnabled();
  await expect(page.locator(".hq-game-stat strong")).toHaveText("0");
});

for (const size of [{ width: 320, height: 640 }, { width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 844, height: 390 }, { width: 1366, height: 900 }]) {
  test(`completed results remain readable and all actions are reachable at ${size.width} × ${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await fixture(page, false, 1);
    await play(page);
    await page.getByRole("button", { name: "Fixture answer", exact: true }).click();
    await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
    await page.clock.runFor(1000);
    await expect(page.getByRole("heading", { name: "All questions completed!" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    for (const name of ["Play again", "Back to home", "View leaderboard"]) {
      const link = page.getByRole("link", { name, exact: true });
      await link.scrollIntoViewIfNeeded();
      const box = await link.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= size.width && box.y >= 0 && box.y + box.height <= size.height).toBeTruthy();
    }
    if (size.width === 1366) await page.screenshot({ path: "../../result-verification/result-desktop.png", fullPage: true });
    if (size.width === 375) await page.screenshot({ path: "../../result-verification/result-mobile.png", fullPage: true });
    await page.getByRole("link", { name: "Back to home", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeVisible();
  });
}
