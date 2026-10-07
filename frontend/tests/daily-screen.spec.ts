import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { dailyFixture, dailyChoices, dailyEpoch } from "./daily-fixtures";

const today = "2026-10-07", runKey = `hq:daily:run:fixture-user:${today}`;
async function startDaily(page: Page) {
  await page.goto("/daily");
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
}
const submitted = (data: Awaited<ReturnType<typeof dailyFixture>>) => data.calls.filter(call => call.name === "submit_daily_result");

test("guest sees clear rules and sign-in, without loading an answer or starting a session", async ({ page }) => {
  const data = await dailyFixture(page, false);
  await page.goto("/daily");
  await expect(page.getByRole("heading", { name: "One image. One daily challenge." })).toBeVisible();
  await expect(page.getByText("Next challenge in", { exact: false })).toContainText("12:00:00");
  await expect(page.locator(".hq-game-answer")).toHaveCount(0);
  expect(data.calls).toHaveLength(0);
  const views = await page.evaluate(() => window.dataLayer.map(entry => Array.from(entry as IArguments)).filter(entry => entry[0] === "event" && entry[1] === "daily_view"));
  expect(views).toHaveLength(1);
  expect(views[0][2]).toMatchObject({ d: today, is_logged_in: false });
  await page.getByRole("button", { name: "Log in to play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  const request = page.waitForRequest(item => item.url().includes("/auth/v1/authorize"));
  await page.getByRole("button", { name: "Sign in with Google", exact: true }).click();
  expect(new URL((await request).url()).searchParams.get("redirect_to")).toBe("http://localhost:5173/daily");
});

test("viewing prepares Daily but Start is the only session trigger", async ({ page }) => {
  const data = await dailyFixture(page);
  await page.goto("/daily");
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
  await expect(page.locator(".hq-game-image img")).toHaveCount(0);
  expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Streak leaderboard", exact: true })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  await expect(page.locator(".hq-header, .hq-footer, .hq-daily-ranking")).toHaveCount(0);
  await expect(page.locator(".hq-daily-timer strong")).toHaveText("00:00");
  expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(1);
});

test("answers and clock wait for both the image and confirmed session", async ({ page }) => {
  const data = await dailyFixture(page);
  let releaseImage: () => void = () => {}, releaseStart: () => void = () => {};
  const image = new Promise<void>(resolve => { releaseImage = resolve; }), session = new Promise<void>(resolve => { releaseStart = resolve; });
  await page.route("**/daily-fixture.svg", async route => { await image; await route.fallback(); });
  await page.route("**/rest/v1/rpc/start_daily_session", async route => { await session; await route.fallback(); });
  await page.goto("/daily");
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByText("Loading image…", { exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 30000));
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeDisabled();
  expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(0);
  releaseImage();
  await expect(page.getByText("Starting your attempt…", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-game-image img")).toHaveCSS("opacity", "0");
  releaseStart();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  await expect(page.locator(".hq-daily-timer strong")).toHaveText("00:00");
});

test("correct result stays visible, uses server time and refreshes the streak", async ({ page }) => {
  const data = await dailyFixture(page);
  await startDaily(page);
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 87000));
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correct!", exact: true })).toBeVisible();
  await expect(page.locator(".hq-daily-result-time strong")).toHaveText("01:27");
  await expect(page.locator(".hq-daily-stats dd").first()).toHaveText("4 days");
  await expect(page.getByText("13 correct Daily answers", { exact: true })).toBeVisible();
  await expect(page.getByText("Synced with your account", { exact: true })).toBeVisible();
  expect(submitted(data)[0]?.payload).toEqual({ p_user_id: "fixture-user", p_date: today, p_is_correct: true, p_time: 87 });
  await expect(page.locator(".hq-header, .hq-footer")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Share on X" })).toHaveAttribute("href", /^https:\/\/twitter.com\/intent\/tweet/);
});

test("wrong result removes the question and never reveals the right answer", async ({ page }) => {
  const data = await dailyFixture(page);
  await startDaily(page);
  await page.getByRole("button", { name: dailyChoices[1], exact: true }).click();
  await expect(page.getByRole("heading", { name: "Not this time", exact: true })).toBeVisible();
  await expect(page.getByText(dailyChoices[0], { exact: true })).toHaveCount(0);
  await expect(page.locator(".hq-answer-correct, .hq-game-image, .hq-game-answer")).toHaveCount(0);
  expect(submitted(data)[0]?.payload.p_is_correct).toBe(false);
  expect(decodeURIComponent(await page.getByRole("link", { name: "Share on X" }).getAttribute("href") || "")).not.toContain(dailyChoices[0]);
});

test("a reopened answered Daily displays its saved result without starting or fetching a question", async ({ page }) => {
  const data = await dailyFixture(page);
  data.results.set(`fixture-user:${today}`, { is_answered: true, is_correct: false, time_spent: 128, answered_at: "2026-10-07T12:00:00Z" });
  await page.goto("/daily");
  await expect(page.getByRole("heading", { name: "Not this time", exact: true })).toBeVisible();
  await expect(page.locator(".hq-daily-result-time strong")).toHaveText("02:08");
  expect(data.calls.filter(call => ["start_daily_session", "get_daily_question", "submit_daily_result"].includes(call.name))).toHaveLength(0);
});

test("double clicks and competing number keys freeze one selection before any network read", async ({ page }) => {
  const data = await dailyFixture(page);
  await startDaily(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  data.beforeStatus = () => held;
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 13000));
  await page.getByRole("button", { name: dailyChoices[1], exact: true }).evaluate(button => {
    (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
  });
  await expect(page.getByRole("heading", { name: "Saving your answer" })).toBeVisible();
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 30000));
  release();
  await expect(page.getByRole("heading", { name: "Not this time" })).toBeVisible();
  expect(submitted(data)).toHaveLength(1);
  expect(submitted(data)[0].payload).toMatchObject({ p_is_correct: false, p_time: 13 });
});

test("submission failure retries an immutable answer and time, including after reload", async ({ page }) => {
  const data = await dailyFixture(page);
  data.failSubmit = true;
  await startDaily(page);
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 19000));
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  await expect(page.getByText("Synced with your account")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toHaveCount(0);
  data.failSubmit = false;
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 90000));
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("heading", { name: "Correct!", exact: true })).toBeVisible();
  expect(submitted(data)).toHaveLength(2);
  expect(submitted(data)[1].payload).toEqual(submitted(data)[0].payload);
});

test("confirmation failure does not claim saved; retry reads the existing result without resubmitting", async ({ page }) => {
  const data = await dailyFixture(page);
  data.failConfirmation = true;
  await startDaily(page);
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  await expect(page.getByText("Synced with your account")).toHaveCount(0);
  data.failConfirmation = false;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("heading", { name: "Correct!", exact: true })).toBeVisible();
  expect(submitted(data)).toHaveLength(1);
});

test("a failed status read blocks start or submission, rather than guessing unanswered", async ({ page }) => {
  const data = await dailyFixture(page);
  data.failStatus = true;
  await page.goto("/daily");
  await expect(page.getByRole("heading", { name: "Daily couldn’t load" })).toBeVisible();
  expect(data.calls.filter(call => call.name === "get_daily_question")).toHaveLength(0);
  data.failStatus = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  data.failStatus = true;
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  expect(submitted(data)).toHaveLength(0);
  data.failStatus = false;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
});

test("image and session failures can recover without unlocking answers or claiming elapsed time", async ({ page }) => {
  const data = await dailyFixture(page);
  let failImage = true;
  await page.route(/\/daily-fixture\.svg(?:\?.*)?$/, route => failImage ? route.abort() : route.fallback());
  await page.goto("/daily");
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByText("The image couldn’t load.", { exact: true })).toBeVisible();
  expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(0);
  failImage = false; data.failStart = true;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("Your attempt couldn’t start. Please try again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeDisabled();
  await expect(page.locator(".hq-daily-timer strong")).toHaveText("Not started");
  data.failStart = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
});

for (const fault of ["noQuestion", "malformedQuestion", "failQuestion"] as const) {
  test(`${fault} has a recoverable screen instead of an endless skeleton`, async ({ page }) => {
    const data = await dailyFixture(page); data[fault] = true;
    await page.goto("/daily");
    await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toHaveCount(0);
    data[fault] = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
  });
}

test("leaving and reopening today resumes the original clock without starting another session", async ({ page }) => {
  const data = await dailyFixture(page);
  await startDaily(page);
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 17000));
  await page.getByRole("button", { name: "Leave Daily", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("timer keeps running");
  await page.getByRole("button", { name: "Stay here" }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Leave Daily", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Leave Daily", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:5173/");
  expect(submitted(data)).toHaveLength(0);
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 75000));
  await page.getByRole("link", { name: "Daily", exact: true }).click();
  await page.getByRole("button", { name: "Continue Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  await expect(page.locator(".hq-daily-timer strong")).toHaveText("01:15");
  expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(1);
});

test("background wall time advances the timer without imposing a Daily time limit", async ({ page }) => {
  const data = await dailyFixture(page);
  await startDaily(page);
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 3661000));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator(".hq-daily-timer strong")).toHaveText("1:01:01");
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
  expect(submitted(data)[0].payload.p_time).toBe(3661);
});

test("new Central day expires an unanswered run and starts a new timer at zero", async ({ page }) => {
  const data = await dailyFixture(page);
  await startDaily(page);
  await page.clock.setFixedTime(new Date("2026-10-08T05:00:01Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
  await expect(page.locator(".hq-daily-meta time")).toHaveAttribute("datetime", "2026-10-08");
  expect(submitted(data)).toHaveLength(0);
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  await expect(page.locator(".hq-daily-timer strong")).toHaveText("00:00");
  expect(data.calls.filter(call => call.name === "start_daily_session").at(-1)?.payload.p_date).toBe("2026-10-08");
});

test("an answer pending across midnight retains the original date and duration on retry", async ({ page }) => {
  const data = await dailyFixture(page); data.failSubmit = true;
  await startDaily(page);
  await page.clock.setFixedTime(new Date(dailyEpoch.getTime() + 23000));
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-10-08T05:00:01Z"));
  await page.reload();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  await expect(page.locator(".hq-daily-meta time")).toHaveAttribute("datetime", today);
  data.failSubmit = false;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("button", { name: "Play today’s Daily" })).toBeVisible();
  expect(submitted(data)[1].payload).toEqual(submitted(data)[0].payload);
  await page.getByRole("button", { name: "Play today’s Daily" }).click();
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
});

test("unavailable browser storage still permits one answer with an honest warning", async ({ page }) => {
  const data = await dailyFixture(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const originalGet = Storage.prototype.getItem, originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key.startsWith("hq:daily:") || key.startsWith("daily:")) throw new DOMException("Denied", "SecurityError"); return originalGet.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key.startsWith("hq:daily:")) throw new DOMException("Quota", "QuotaExceededError"); return originalSet.call(this, key, value); };
  });
  await startDaily(page);
  await expect(page.getByText("Browser storage is unavailable. Keep this page open until your answer is saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
  expect(submitted(data)).toHaveLength(1); expect(errors).toEqual([]);
});

test("corrupt, foreign and legacy flags cannot create a saved result or hijack a run", async ({ page }) => {
  const data = await dailyFixture(page);
  await page.addInitScript(({ runKey, today }) => {
    localStorage.setItem(runKey, JSON.stringify({ version: 1, userId: "someone-else", date: today, questionId: 700, startedAt: Date.now() - 50000, options: ["Fixture answer", "Second answer", "Third answer", "Fourth answer"] }));
    localStorage.setItem(`daily:${today}:answered:fixture-user`, "1");
    localStorage.setItem("hq:daily:day:fixture-user", "broken");
  }, { runKey, today });
  await startDaily(page);
  await expect(page.locator(".hq-daily-timer strong")).toHaveText("00:00");
  expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(1);
});

test("personal stats and leaderboard errors are honest, retryable and do not block Daily", async ({ page }) => {
  const data = await dailyFixture(page); data.failStreak = true; data.failLeaderboard = true;
  await page.goto("/daily");
  await expect(page.getByText("Streak stats couldn’t load.", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-daily-stats dd")).toHaveCount(0);
  await page.getByRole("button", { name: "Streak leaderboard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry leaderboard" })).toBeVisible();
  data.failStreak = false; data.failLeaderboard = false;
  await page.getByRole("button", { name: "Retry stats" }).click();
  await page.getByRole("button", { name: "Retry leaderboard" }).click();
  await expect(page.locator(".hq-daily-stats dd").first()).toHaveText("3 days");
  await expect(page.locator(".hq-daily-own-row")).toContainText("MovieFan (you)");
  await page.getByRole("button", { name: "All-time best", exact: true }).click();
  await expect(page.getByRole("button", { name: "All-time best", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("BestPlayer 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show top 20", exact: true }).click();
  await expect(page.locator(".hq-daily-streak-list li")).toHaveCount(20);
});

test("server-confirmed correctness wins over the client selection", async ({ page }) => {
  const data = await dailyFixture(page); data.serverCorrect = false;
  await startDaily(page);
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("heading", { name: "Not this time", exact: true })).toBeVisible();
  await expect(page.getByText(dailyChoices[0], { exact: true })).toHaveCount(0);
});

test("reset countdown follows Central DST boundaries", async ({ page }) => {
  await dailyFixture(page, false);
  await page.goto("/daily");
  const boundaries = await page.evaluate(async () => {
    const { nextDailyReset } = await import("/src/daily/time.ts");
    return ["2026-03-08T06:00:00Z", "2026-11-01T05:00:00Z"].map(date => (nextDailyReset(Date.parse(date)) - Date.parse(date)) / 3600000);
  });
  expect(boundaries).toEqual([23, 25]);
});

test("closing a tab retains today's run on this device without submitting an answer", async ({ page, context }) => {
  const first = await dailyFixture(page);
  await startDaily(page);
  await page.close({ runBeforeUnload: false });
  expect(submitted(first)).toHaveLength(0);
  const reopened = await context.newPage();
  const second = await dailyFixture(reopened);
  await reopened.clock.setFixedTime(new Date(dailyEpoch.getTime() + 42000));
  await reopened.goto("/daily");
  await reopened.getByRole("button", { name: "Continue Daily", exact: true }).click();
  await expect(reopened.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  await expect(reopened.locator(".hq-daily-timer strong")).toHaveText("00:42");
  expect(second.calls.filter(call => call.name === "start_daily_session")).toHaveLength(0);
});

test("two tabs share one start and both reflect the confirmed server result", async ({ page, context }) => {
  const first = await dailyFixture(page);
  await startDaily(page);
  const other = await context.newPage();
  const second = await dailyFixture(other); second.results = first.results;
  await other.goto("/daily");
  await other.getByRole("button", { name: "Continue Daily", exact: true }).click();
  await expect(other.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("heading", { name: "Correct!", exact: true })).toBeVisible();
  await expect(other.getByRole("heading", { name: "Correct!", exact: true })).toBeVisible();
  expect([...first.calls, ...second.calls].filter(call => call.name === "start_daily_session")).toHaveLength(1);
  expect([...submitted(first), ...submitted(second)]).toHaveLength(1);
});

test("back cancellation keeps Daily mounted and a confirmed back leaves its run resumable", async ({ page }) => {
  const data = await dailyFixture(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Daily", exact: true }).click();
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  page.once("dialog", dialog => dialog.dismiss());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/daily$/);
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  page.once("dialog", dialog => dialog.accept());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL("http://localhost:5173/");
  expect(submitted(data)).toHaveLength(0);
  await page.getByRole("link", { name: "Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continue Daily", exact: true })).toBeVisible();
});

test("sign-out ignores an old account's late Daily response", async ({ page }) => {
  const data = await dailyFixture(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  data.beforeStatus = () => held;
  data.results.set(`fixture-user:${today}`, { is_answered: true, is_correct: true, time_spent: 12, answered_at: null });
  await page.goto("/daily");
  await expect(page.locator(".hq-account-name")).toHaveText("MovieFan");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Log in to play", exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("heading", { name: "Correct!", exact: true })).toHaveCount(0);
  expect(submitted(data)).toHaveLength(0);
});

test("new players finish nickname setup before any Daily session starts", async ({ page }) => {
  const data = await dailyFixture(page);
  let nickname: string | null = null;
  await page.route("**/rest/v1/profiles?**", route => {
    if (route.request().method() === "PATCH") nickname = route.request().postDataJSON().nickname;
    return route.fulfill({ contentType: "application/json", headers: { "content-range": "0-0/0", "access-control-expose-headers": "content-range" }, body: JSON.stringify({ nickname, avatar_url: null }) });
  });
  await page.addInitScript(() => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key) { if (key === "pre_nickname") throw new DOMException("Denied", "SecurityError"); return remove.call(this, key); };
  });
  await page.goto("/daily");
  await expect(page.getByRole("heading", { name: "Choose your nickname", exact: true })).toBeVisible();
  expect(data.calls.filter(call => call.name === "start_daily_session")).toHaveLength(0);
  await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("NewDailyFan");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
});

test("malformed saved status is an error, never a claimed success", async ({ page }) => {
  await dailyFixture(page);
  await page.route("**/rest/v1/rpc/get_my_daily_result", route => route.fulfill({ contentType: "application/json", body: JSON.stringify([{ is_answered: true, is_correct: "false", time_spent: "12", answered_at: null }]) }));
  await page.goto("/daily");
  await expect(page.getByRole("heading", { name: "Daily couldn’t load", exact: true })).toBeVisible();
  await expect(page.getByText("Synced with your account")).toHaveCount(0);
});

test("a hanging status request times out into a retryable error", async ({ page }) => {
  const data = await dailyFixture(page);
  await page.clock.install({ time: dailyEpoch });
  await page.clock.pauseAt(new Date(dailyEpoch.getTime() + 1000));
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  data.beforeStatus = () => held;
  await page.goto("/daily");
  await expect(page.getByRole("heading", { name: "Getting Daily ready" })).toBeVisible();
  await page.clock.runFor(21000);
  await expect(page.getByRole("heading", { name: "Daily couldn’t load", exact: true })).toBeVisible();
  data.beforeStatus = null; release();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
});

test("late leaderboard responses cannot replace the selected tab", async ({ page }) => {
  await dailyFixture(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/get_daily_streak_leaderboard", async route => {
    if (route.request().postDataJSON().p_active_only) await held;
    await route.fallback();
  });
  await page.goto("/daily");
  await page.getByRole("button", { name: "Streak leaderboard", exact: true }).click();
  await expect(page.getByText("Loading streaks…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "All-time best", exact: true }).click();
  await expect(page.getByText("BestPlayer 1", { exact: true })).toBeVisible();
  release();
  await expect(page.getByText("ActivePlayer 1", { exact: true })).toHaveCount(0);
});

for (const [width, height] of [[1440, 900], [1366, 768], [768, 1024], [390, 844], [375, 667], [320, 568], [320, 480], [844, 390], [568, 320]]) {
  test(`Daily fits ${width}×${height} with a full portrait image and long answer`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const choices = [dailyChoices[0], "The Boy in the Striped Pajamas (2008)", "A Very Long Movie Title With a Subtitle and Release Year (2026)", dailyChoices[3]];
    const data = await dailyFixture(page, true, choices); data.imageRatio = [2, 3];
    await startDaily(page);
    const geometry = await page.evaluate(() => {
      const image = document.querySelector(".hq-game-image img") as HTMLImageElement;
      const elements = Array.from(document.querySelectorAll(".hq-game-image, .hq-game-answer, .hq-daily-timer, .hq-game-feedback, .hq-game-footer"));
      return { width: document.documentElement.scrollWidth, viewport: innerWidth, height: innerHeight,
        fit: getComputedStyle(image).objectFit, boxes: elements.map(element => { const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, right: box.right, bottom: box.bottom }; }) };
    });
    expect(geometry.width).toBeLessThanOrEqual(width);
    expect(geometry.fit).toBe("contain");
    for (const box of geometry.boxes) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width); expect(box.bottom).toBeLessThanOrEqual(height); }
    await page.screenshot({ path: test.info().outputPath("daily-question.png") });
  });
}

for (const [width, height] of [[320, 568], [844, 390]]) {
  test(`result and pending error remain accessible at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const data = await dailyFixture(page); data.failSubmit = true;
    await startDaily(page);
    await page.getByRole("button", { name: dailyChoices[1], exact: true }).click();
    const retry = page.getByRole("button", { name: "Retry saving", exact: true });
    await retry.scrollIntoViewIfNeeded(); await expect(retry).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    data.failSubmit = false; await retry.click();
    await expect(page.getByRole("heading", { name: "Not this time", exact: true })).toBeFocused();
    for (const label of ["Play a regular quiz", "Back to home", "Share on X"]) {
      const link = page.getByRole("link", { name: label, exact: true });
      await link.scrollIntoViewIfNeeded(); await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= height).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("daily-result.png"), fullPage: true });
  });
}
