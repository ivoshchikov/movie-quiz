import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn, difficulties } from "./fixtures";

const answers = ["Jojo Rabbit (2019)", "The Boy in the Striped Pajamas (2008)", "The Book Thief (2013)", "Pan’s Labyrinth (2006)"];
const epoch = new Date("2026-10-06T12:00:00Z");
interface Options { size?: number; seconds?: number; lives?: number; signedIn?: boolean; options?: string[]; ratio?: [number, number]; }
async function fixture(page: Page, options: Options = {}) {
  await page.clock.install({ time: epoch });
  await page.clock.pauseAt(new Date(epoch.getTime() + 1000));
  await page.clock.setSystemTime(epoch);
  const calls = await mockQuizApi(page);
  if (options.signedIn) await mockSignedIn(page);
  const choices = options.options ?? answers;
  const questions = Array.from({ length: options.size ?? 6 }, (_, index) => ({
    id: 1000 + index, image_url: `https://quiz-fixture.supabase.co/game-fixture-${index}.svg`,
    options_json: choices, category_id: 1, difficulty_level_id: 1,
  }));
  let checks = 0;
  await page.route("**/rest/v1/difficulty_level?**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify(difficulties.map(level => level.id === 1 ? { ...level, time_limit_secs: options.seconds ?? 30, lives: options.lives ?? 3 } : level)) }));
  await page.route("**/rest/v1/rpc/get_question", route => {
    const payload = route.request().postDataJSON();
    calls.push({ name: "get_question", payload });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(questions.filter(question => !payload.p_exclude_ids?.includes(question.id)).slice(0, 1)) });
  });
  await page.route("**/rest/v1/question?**", route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("select") !== "correct_answer") return route.fallback();
    checks++;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ correct_answer: choices[0] }) });
  });
  await page.route(/\/game-fixture-\d+\.svg(?:\?.*)?$/, route => {
    const [width, height] = options.ratio ?? [239, 100];
    return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#30453e"/><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#789685"/></svg>` });
  });
  return { calls, checks: () => checks, choices };
}
async function start(page: Page, choices = answers) {
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByRole("button", { name: choices[0], exact: true })).toBeEnabled();
}
async function end(page: Page) {
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await page.getByRole("button", { name: "End quiz & save" }).click();
  await expect(page).toHaveURL(/\/result$/);
}

test("settings and image must both load before the question clock and choices unlock", async ({ page }) => {
  await fixture(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/game-fixture-0.svg", async route => { await held; await route.fallback(); });
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByText("Loading image…", { exact: true })).toBeVisible();
  await page.clock.runFor(45000);
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeDisabled();
  await expect(page.locator(".hq-game-timer-label strong")).toHaveText("30 s");
  await expect(page.locator(".hq-game-lives strong")).toHaveText("3 / 3");
  release();
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  await page.clock.runFor(2000);
  await expect(page.locator(".hq-game-timer-label strong")).toHaveText("28 s");
  await expect(page.locator(".hq-game-footer strong")).toHaveText("00:47");
});

test("a choice locks immediately, scores once and proceeds independently of statistics", async ({ page }) => {
  const data = await fixture(page);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/rest/v1/rpc/touch_question_stats", async route => { await held; await route.fallback(); });
  await start(page);
  await page.getByRole("button", { name: answers[0], exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-game-stat strong")).toHaveText("1");
  expect(data.checks()).toBe(1);
  await page.clock.runFor(800);
  await expect(page.getByText("Question 1", { exact: true })).toBeVisible();
  await page.clock.runFor(200);
  await expect(page.getByText("Question 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  expect(data.calls.filter(call => call.name === "get_question").at(-1)?.payload.p_exclude_ids).toEqual([1000]);
  release();
});

test("wrong answers and timeouts have longer feedback and never reveal the correct choice", async ({ page }) => {
  await fixture(page);
  await start(page);
  await page.getByRole("button", { name: answers[1], exact: true }).click();
  await expect(page.getByText("Incorrect. 1 life lost.", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-answer-wrong .hq-answer-text")).toHaveText(answers[1]);
  await expect(page.locator(".hq-answer-correct")).toHaveCount(0);
  await expect(page.locator(".hq-game-lives strong")).toHaveText("2 / 3");
  await page.clock.runFor(1500);
  await expect(page.getByText("Question 1", { exact: true })).toBeVisible();
  await page.clock.runFor(400);
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  // Simulate suspended/background timers: wall time advances, callbacks do not.
  await page.clock.setSystemTime(new Date(epoch.getTime() + 61000));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText("Time’s up. 1 life lost.", { exact: true })).toBeVisible();
  await expect(page.locator(".hq-answer-correct, .hq-answer-wrong")).toHaveCount(0);
  await expect(page.locator(".hq-game-lives strong")).toHaveText("1 / 3");
  await page.clock.runFor(1900);
  await expect(page.getByText("Question 3", { exact: true })).toBeVisible();
});

test("the last life is shown as lost and the result records the actual elapsed time", async ({ page }) => {
  const data = await fixture(page, { lives: 1, seconds: 10, signedIn: true });
  await start(page);
  await page.clock.runFor(10000);
  await expect(page.locator(".hq-game-lives strong")).toHaveText("0 / 1");
  await expect(page.locator(".hq-answer-correct")).toHaveCount(0);
  await page.clock.runFor(1800);
  await expect(page).toHaveURL(/\/result$/);
  await expect.poll(() => data.calls.filter(call => call.name === "upsert_user_best").length).toBe(1);
  expect(data.calls.find(call => call.name === "upsert_user_best")?.payload).toMatchObject({ p_score: 0, p_time: 11, p_user_id: "fixture-user" });
  await expect(page.getByRole("status")).toContainText("Result saved.");
});

test("clearing the question bank congratulates the player; play again starts a fresh run", async ({ page }) => {
  await fixture(page, { size: 1 });
  await start(page);
  await page.getByRole("button", { name: answers[0], exact: true }).click();
  await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.getByRole("heading", { name: "You cleared the whole quiz!" })).toBeVisible();
  await expect(page.getByText(/Every question played, and lives still left/)).toBeVisible();
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  await expect(page.locator(".hq-game-stat strong")).toHaveText("0");
  await expect(page.getByText("Question 1", { exact: true })).toBeVisible();
});

test("image and answer-check errors retry without losing a life or accepting another choice", async ({ page }) => {
  const data = await fixture(page);
  let imageFails = true, answerFails = true;
  await page.route(/\/game-fixture-0\.svg(?:\?.*)?$/, route => imageFails ? route.abort() : route.fallback());
  await page.route("**/rest/v1/question?**", route => new URL(route.request().url()).searchParams.get("select") === "correct_answer" && answerFails ? route.fulfill({ status: 503, body: '{"message":"fixture failure"}' }) : route.fallback());
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByRole("alert")).toContainText("image couldn’t load");
  await page.clock.runFor(40000);
  await expect(page.locator(".hq-game-lives strong")).toHaveText("3 / 3");
  imageFails = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  await page.getByRole("button", { name: answers[0], exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("answer couldn’t be checked");
  await page.clock.runFor(40000);
  await expect(page.locator(".hq-game-stat strong")).toHaveText("0");
  await expect(page.getByRole("button", { name: answers[1], exact: true })).toBeDisabled();
  answerFails = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
  expect(data.checks()).toBe(1);
});

test("exit confirmation keeps the timer running and saves one final result", async ({ page }) => {
  const data = await fixture(page, { signedIn: true });
  await start(page);
  await page.getByRole("button", { name: answers[0], exact: true }).click();
  await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("cannot be resumed");
  await page.clock.runFor(5000);
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  await expect(page.locator(".hq-game-timer-label strong")).toHaveText("25 s");
  await end(page);
  await expect.poll(() => data.calls.filter(call => call.name === "upsert_user_best").length).toBe(1);
  expect(data.calls.find(call => call.name === "upsert_user_best")?.payload).toMatchObject({ p_score: 1, p_time: 6 });
  await expect(page.getByRole("heading", { name: "Quiz ended" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Quiz ended" })).toBeVisible();
});

test("failed saves survive reload and retry with the same final score and elapsed time", async ({ page }) => {
  await fixture(page, { signedIn: true });
  let fail = true;
  const saves: Record<string, unknown>[] = [];
  await page.route("**/rest/v1/rpc/upsert_user_best", route => {
    saves.push(route.request().postDataJSON());
    return fail ? route.fulfill({ status: 503, body: '{"message":"fixture failure"}' }) : route.fallback();
  });
  await start(page);
  await page.clock.runFor(7000);
  await end(page);
  await expect(page.getByRole("status")).toContainText("Saving to your account will retry");
  const first = saves[0];
  fail = false;
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Result saved.");
  expect(saves.length).toBeGreaterThan(1);
  expect(saves.every(item => JSON.stringify(item) === JSON.stringify(first))).toBeTruthy();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("hq:quiz:pending:")).length)).toBe(0);
});

test("browser back can be cancelled and reload ends the session instead of resuming it", async ({ page }) => {
  await fixture(page);
  await start(page);
  page.once("dialog", dialog => { void dialog.dismiss(); });
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  await page.clock.runFor(3000);
  page.once("dialog", dialog => { void dialog.accept(); });
  await page.reload();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByRole("heading", { name: "Quiz ended" })).toBeVisible();
  await expect(page.getByText("00:03", { exact: true })).toBeVisible();
});

test("opening play directly gives a usable start action, and an empty bank is not a victory", async ({ page }) => {
  await fixture(page, { size: 0 });
  await page.goto("/play");
  await expect(page.getByRole("heading", { name: "Ready to play?" })).toBeVisible();
  await page.getByRole("link", { name: "Choose a quiz" }).click();
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByRole("heading", { name: "More questions are on the way" })).toBeVisible();
  await expect(page.getByText("You cleared the whole quiz!", { exact: true })).toHaveCount(0);
});

test("keyboard shortcuts match the visible order and cannot submit twice", async ({ page }) => {
  const data = await fixture(page);
  await start(page);
  const key = await page.getByRole("button", { name: answers[0], exact: true }).getAttribute("aria-keyshortcuts");
  await page.evaluate(key => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: key!, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: key!, bubbles: true }));
  }, key);
  await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
  expect(data.checks()).toBe(1);
  await expect(page.locator(".hq-game-stat strong")).toHaveText("1");
});

test("malformed question data is recoverable without consuming a question or a life", async ({ page }) => {
  await fixture(page);
  let malformed = true;
  await page.route("**/rest/v1/rpc/get_question", route => malformed ? route.fulfill({ contentType: "application/json", body: JSON.stringify([{ id: 1000, category_id: 1, difficulty_level_id: 1, image_url: "", options_json: ["Only one choice"] }]) }) : route.fallback());
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByRole("alert")).toContainText("next question couldn’t load");
  await expect(page.locator(".hq-game-lives strong")).toHaveText("3 / 3");
  malformed = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  await expect(page.getByText("Question 1", { exact: true })).toBeVisible();
});

test("closing a tab keeps its final result and reopening never resumes the game", async ({ page, context }) => {
  await fixture(page, { signedIn: true });
  await start(page);
  await page.getByRole("button", { name: answers[0], exact: true }).click();
  await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  await page.clock.runFor(6000);
  await page.route("**/rest/v1/rpc/upsert_user_best", route => route.abort());
  page.once("dialog", dialog => { void dialog.accept(); });
  const closed = page.waitForEvent("close");
  await page.close({ runBeforeUnload: true });
  await closed;
  const reopened = await context.newPage();
  await fixture(reopened, { signedIn: true });
  await reopened.goto("/result");
  await expect(reopened.getByRole("heading", { name: "Quiz ended" })).toBeVisible();
  await expect(reopened.getByText("00:07", { exact: true })).toBeVisible();
  const result = await reopened.evaluate(() => JSON.parse(localStorage.getItem("hq:quiz:last:fixture-user")!));
  expect(result).toMatchObject({ score: 1, elapsedSecs: 7, finishReason: "exit" });
  await expect(reopened.getByRole("status")).toContainText("Result saved.");
  await reopened.goto("/play");
  await expect(reopened.getByRole("heading", { name: "Ready to play?" })).toBeVisible();
  await reopened.close();
});

test("pending results belonging to another account are never submitted", async ({ page }) => {
  const data = await fixture(page, { signedIn: true });
  await page.addInitScript(() => localStorage.setItem("hq:quiz:pending:other-run", JSON.stringify({ id: "other-run", playKey: "old-play", userId: "other-user", categoryId: 1,
    difficultyId: 1, score: 9, elapsedSecs: 90, finishReason: "exit", saveStatus: "pending" })));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  expect(data.calls.filter(call => call.name === "upsert_user_best")).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem("hq:quiz:pending:other-run"))).toBeTruthy();
});

test("settings and question failures retry without premature requests or false completion", async ({ page }) => {
  const data = await fixture(page);
  let failSettings = true, failQuestion = false;
  await page.addInitScript(() => { if (location.pathname === "/play") history.replaceState({ idx: 0, key: "fixture-play", usr: { categoryId: 1, difficultyId: 1 } }, "", location.href); });
  await page.route("**/rest/v1/difficulty_level?**", route => failSettings ? route.fulfill({ status: 503, body: '{"message":"fixture failure"}' }) : route.fallback());
  await page.route("**/rest/v1/rpc/get_question", route => failQuestion ? route.fulfill({ status: 503, body: '{"message":"fixture failure"}' }) : route.fallback());
  await page.goto("/play");
  await expect(page.getByRole("alert")).toContainText("quiz couldn’t load");
  expect(data.calls.filter(call => call.name === "get_question")).toHaveLength(0);
  failSettings = false; failQuestion = true;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("next question couldn’t load");
  await expect(page.locator(".hq-game-lives strong")).toHaveText("3 / 3");
  failQuestion = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
  await expect(page.getByText("Question 1", { exact: true })).toBeVisible();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`error and feedback states fit ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await fixture(page);
    let imageFails = true, answerFails = true;
    await page.route(/\/game-fixture-0\.svg(?:\?.*)?$/, route => imageFails ? route.abort() : route.fallback());
    await page.route("**/rest/v1/question?**", route => new URL(route.request().url()).searchParams.get("select") === "correct_answer" && answerFails ? route.fulfill({ status: 503, body: '{"message":"fixture failure"}' }) : route.fallback());
    await page.goto("/");
    await page.getByRole("button", { name: "Play Movie Stills" }).click();
    await expect(page.getByRole("alert")).toContainText("image couldn’t load");
    const fits = async () => {
      const geometry = await page.evaluate(() => ({ height: document.documentElement.scrollHeight,
        bounds: [...document.querySelectorAll(".hq-game button, .hq-game-image-message, .hq-game-feedback")].map(element => element.getBoundingClientRect().toJSON()) }));
      expect(geometry.height).toBeLessThanOrEqual(viewport.height + 1);
      for (const rect of geometry.bounds) expect(rect.bottom).toBeLessThanOrEqual(viewport.height + 1);
    };
    await fits();
    imageFails = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByRole("button", { name: answers[0], exact: true })).toBeEnabled();
    await page.getByRole("button", { name: answers[0], exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("answer couldn’t be checked");
    await page.screenshot({ path: test.info().outputPath("answer-error.png"), fullPage: true });
    await test.info().attach("error-geometry", { body: await page.evaluate(() => JSON.stringify([...document.querySelectorAll(".hq-game-answers, .hq-game-answer, .hq-game-feedback, .hq-inline-action")].map(element => ({ name: element.className, rect: element.getBoundingClientRect().toJSON() })))), contentType: "application/json" });
    await fits();
    answerFails = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
    await fits();
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 600 }, { width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 }, { width: 320, height: 480 }, { width: 360, height: 540 }, { width: 844, height: 390 }, { width: 568, height: 320 }]) {
  test(`all gameplay controls and the full image fit ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const choices = ["Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb (1964)", ...answers.slice(1)];
    await fixture(page, { options: choices, ratio: viewport.width < 600 ? [9, 16] : [239, 100] });
    await start(page, choices);
    const geometry = await page.evaluate(() => {
      const selector = ".hq-play-header, .hq-game-heading, .hq-game-image, .hq-game-timer, .hq-game-answer, .hq-game-feedback, .hq-game-stats, .hq-game-footer";
      const elements = [...document.querySelectorAll<HTMLElement>(selector)].map(element => ({ name: element.className, rect: element.getBoundingClientRect().toJSON(), overflow: element.scrollHeight > element.clientHeight + 1,
        text: element.querySelector(".hq-answer-text")?.textContent, textHeight: element.querySelector(".hq-answer-text")?.getBoundingClientRect().height, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
      const image = document.querySelector<HTMLImageElement>(".hq-game-image img")!;
      return { elements, width: innerWidth, height: innerHeight, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
        objectFit: getComputedStyle(image).objectFit, loaded: image.complete && image.naturalWidth > 0 };
    });
    await test.info().attach("geometry", { body: JSON.stringify(geometry, null, 2), contentType: "application/json" });
    await page.screenshot({ path: test.info().outputPath("game.png"), fullPage: true });
    expect(geometry.pageWidth).toBeLessThanOrEqual(viewport.width + 1);
    expect(geometry.pageHeight).toBeLessThanOrEqual(viewport.height + 1);
    expect(geometry.loaded).toBeTruthy();
    expect(geometry.objectFit).toBe("contain");
    for (const item of geometry.elements) {
      expect(item.rect.top, item.name).toBeGreaterThanOrEqual(0);
      expect(item.rect.bottom, item.name).toBeLessThanOrEqual(viewport.height + 1);
      expect(item.rect.right, item.name).toBeLessThanOrEqual(viewport.width + 1);
      expect(item.overflow, item.name).toBeFalsy();
    }
    await expect(page.getByRole("link", { name: "Blog", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Leaderboard", exact: true })).toHaveCount(0);
  });
}
