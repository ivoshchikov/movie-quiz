import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn } from "./fixtures";
import { gameFixture, gameAnswers } from "./game-fixtures";
import { dailyFixture, dailyChoices } from "./daily-fixtures";
import { pickFixture } from "./this-that-fixture";

async function commands(page: Page) {
  return page.evaluate(() => (window.dataLayer ?? []).map(entry => Array.from(entry as IArguments)));
}
async function events(page: Page, name: string) {
  return (await commands(page)).filter(args => args[0] === "event" && args[1] === name)
    .map(args => args[2] as Record<string, unknown>);
}
async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByRole("button", { name: gameAnswers[0], exact: true })).toBeEnabled();
}
async function end(page: Page) {
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await page.getByRole("button", { name: "End quiz & save" }).click();
  await expect(page).toHaveURL(/\/result$/);
}

test("a slow tag loads/configures once and SPA visits have one sanitized pageview each", async ({ page }) => {
  await mockQuizApi(page);
  let release = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  let scripts = 0;
  await page.route("https://www.googletagmanager.com/**", async route => {
    scripts++; await held; await route.fulfill({ contentType: "text/javascript", body: "" });
  });
  await page.goto("/?utm_source=x&utm_medium=social&code=private-code#access_token=private-token", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => (await events(page, "page_view")).length).toBe(1);
  await page.evaluate(async () => {
    const { loadGA } = await import(new URL("/src/analytics/ga.ts", location.origin).href);
    for (let i = 0; i < 5; i++) loadGA();
  });
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Blog", exact: true }).click();
  await expect.poll(async () => (await events(page, "page_view")).length).toBe(2);
  const views = await events(page, "page_view");
  expect(views[1].page_referrer).toBe("http://localhost:5173/?utm_source=x&utm_medium=social");
  expect((await commands(page)).filter(args => args[0] === "config")).toHaveLength(1);
  expect((await commands(page)).find(args => args[0] === "config")?.[2]).not.toHaveProperty("debug_mode");
  expect(views.every(view => !("debug_mode" in view))).toBe(true);
  expect(scripts).toBe(1);
  expect(JSON.stringify(await commands(page))).not.toMatch(/private-code|private-token/);
  expect(await page.evaluate(() => window.dataLayer.every(entry => Object.prototype.toString.call(entry) === "[object Arguments]"))).toBe(true);
  release();
});

test("debug mode is explicit and does not leak into ordinary visits after reload", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/?debug_mode=1");
  await expect.poll(async () => (await events(page, "page_view")).length).toBe(1);
  expect((await commands(page)).find(args => args[0] === "config")?.[2]).toHaveProperty("debug_mode", true);
  expect((await events(page, "page_view"))[0]).toHaveProperty("debug_mode", true);
  await page.goto("/");
  await expect.poll(async () => (await events(page, "page_view")).length).toBe(1);
  expect((await commands(page)).find(args => args[0] === "config")?.[2]).not.toHaveProperty("debug_mode");
  expect((await events(page, "page_view"))[0]).not.toHaveProperty("debug_mode");
});

test("QA opt-out survives navigation and reload and can be explicitly cleared", async ({ page }) => {
  await mockQuizApi(page);
  await page.goto("/?analytics=off");
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  expect(await commands(page)).toEqual([]);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Blog", exact: true }).click();
  await page.reload();
  expect(await commands(page)).toEqual([]);
  expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
  await page.goto("/?analytics=on");
  await expect.poll(async () => (await events(page, "page_view")).length).toBe(1);
});

test("a preview hostname cannot send fixture or production analytics", async ({ page }) => {
  await mockQuizApi(page);
  await page.route("http://preview.invalid:5173/**", async route => {
    const response = await route.fetch({ url: route.request().url().replace("preview.invalid", "localhost") });
    await route.fulfill({ response });
  });
  await page.goto("http://preview.invalid:5173/");
  await expect(page.getByRole("button", { name: "Play Movie Stills" })).toBeEnabled();
  expect(await commands(page)).toEqual([]);
  expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
});

test("owner visits and administrative paths stay outside analytics", async ({ page }) => {
  await mockQuizApi(page);
  await mockSignedIn(page, "112743d7-f683-4bbb-8117-068e89a00f22");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  expect(await commands(page)).toEqual([]);
  await page.goto("/admin/questions?search=private-answer");
  await expect(page.locator("#main-content")).toBeVisible();
  expect(await commands(page)).toEqual([]);
});

for (const [referrer, ignore] of [["https://accounts.google.com/o/oauth2/?code=private-code", true], ["https://quiz-fixture.supabase.co/", true], ["https://quiz-fixture.supabase.co/auth/v1/callback?code=private-code", true], ["https://www.google.com/search?q=movie+quiz", false], ["https://www.bing.com/search?q=movie+quiz", false], ["https://cinema.example/guide", false], ["https://quiz-fixture.supabase.co/storage/v1/object/public/guide", false]] as const) {
  test(`referral handling distinguishes ${new URL(referrer).hostname}${new URL(referrer).pathname} from search`, async ({ page }) => {
    await mockQuizApi(page);
    await page.goto("/?utm_source=partner&utm_campaign=pilot", { referer: referrer });
    await expect.poll(async () => (await events(page, "page_view")).length).toBe(1);
    const config = (await commands(page)).find(args => args[0] === "config")?.[2];
    const ref = new URL(referrer);
    expect(config).toMatchObject({ page_referrer: ignore ? "" : ref.origin + ref.pathname });
    if (ignore) expect(config).toHaveProperty("ignore_referrer", true);
    else expect(config).not.toHaveProperty("ignore_referrer");
    for (const view of await events(page, "page_view")) {
      if (ignore) expect(view).toHaveProperty("ignore_referrer", true);
      else expect(view).not.toHaveProperty("ignore_referrer");
    }
    expect((await events(page, "page_view"))[0].page_location).toContain("utm_source=partner");
    expect(JSON.stringify(await commands(page))).not.toContain("private-code");
  });
}

test("article CTA connects to one three-answer game without internal UTM or capability IDs", async ({ page }) => {
  const data = await gameFixture(page, { size: 3 });
  await page.goto("/blog/is-whalefall-based-on-a-book?utm_source=x&utm_medium=social");
  await page.getByRole("link", { name: "Choose a game", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:5173/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  for (let number = 1; number <= 3; number++) {
    await expect(page.getByText(`Question ${number}`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: gameAnswers[0], exact: true }).evaluate(button => {
      (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click();
    });
    await expect(page.getByText("Correct! +1 point")).toBeVisible();
    await page.clock.runFor(1000);
  }
  await expect(page).toHaveURL(/\/result$/);
  const clicked = await events(page, "article_to_quiz_click"), started = await events(page, "quiz_start");
  expect(clicked).toHaveLength(1); expect(clicked[0]).toMatchObject({ game_mode: "games" }); expect(started).toHaveLength(1);
  expect(started[0]).toMatchObject({ cta_id: clicked[0].cta_id, article_slug: "is-whalefall-based-on-a-book", game_mode: "normal", analytics_version: 2 });
  expect(await events(page, "quiz_answer")).toHaveLength(3);
  expect(await events(page, "quiz_first_answer")).toHaveLength(1);
  expect(await events(page, "qualified_play")).toHaveLength(1);
  expect((await events(page, "quiz_end"))[0]).toMatchObject({ finish_reason: "completed", result_confirmed: true, answer_count: 3 });
  for (const name of ["quiz_answer", "quiz_first_answer", "qualified_play", "quiz_end"]) {
    for (const event of await events(page, name)) expect(event.run_id).toBe(started[0].run_id);
  }
  const serialized = JSON.stringify(await commands(page));
  for (const game of data.games.values()) {
    expect(serialized).not.toContain(game.id);
    if (game.round) expect(serialized).not.toContain(game.round.id);
  }
  await page.reload();
  await expect(page).toHaveURL(/\/result$/);
  expect(await events(page, "quiz_end")).toHaveLength(0);
});

test("failed and unresolved answer requests do not count as accepted answers", async ({ page }) => {
  const data = await gameFixture(page);
  await start(page);
  data.failAnswer = true;
  await page.getByRole("button", { name: gameAnswers[0], exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your answer couldn’t be confirmed.");
  expect(await events(page, "quiz_answer")).toHaveLength(0);
  data.failAnswer = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("Correct! +1 point")).toBeVisible();
  expect(await events(page, "quiz_answer")).toHaveLength(1);
  await page.clock.runFor(1000);
  await page.route("**/rest/v1/rpc/quiz_answer", async route => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([...data.games.values()][0]) });
  }, { times: 1 });
  await page.getByRole("button", { name: gameAnswers[0], exact: true }).click();
  await expect(page.getByRole("button", { name: gameAnswers[0], exact: true })).toBeEnabled();
  expect(await events(page, "quiz_answer")).toHaveLength(1);
  await page.getByRole("button", { name: gameAnswers[0], exact: true }).click();
  await expect(page.getByText("Correct! +1 point")).toBeVisible();
  expect(await events(page, "quiz_answer")).toHaveLength(2);
});

test("three timeouts resolve rounds without inventing an engaged player", async ({ page }) => {
  await gameFixture(page, { seconds: 2, lives: 3 });
  await start(page);
  for (let i = 0; i < 3; i++) {
    await expect(page.getByRole("button", { name: gameAnswers[0], exact: true })).toBeEnabled();
    await page.clock.runFor(2100);
    await expect(page.getByText("Time’s up. 1 life lost.")).toBeVisible();
    await page.clock.runFor(1900);
  }
  await expect(page).toHaveURL(/\/result$/);
  expect(await events(page, "quiz_answer")).toHaveLength(3);
  expect(await events(page, "quiz_first_answer")).toHaveLength(0);
  expect(await events(page, "qualified_play")).toHaveLength(0);
  expect((await events(page, "quiz_end"))[0]).toMatchObject({ finish_reason: "out-of-lives", answer_count: 0, resolved_count: 3 });
});

test("an accepted response received after leaving the game is still measured once", async ({ page }) => {
  const data = await gameFixture(page);
  await start(page);
  let release = () => {};
  data.holdAnswer = new Promise<void>(resolve => { release = resolve; });
  await page.getByRole("button", { name: gameAnswers[0], exact: true }).click();
  await expect.poll(() => data.accepted).toBe(1);
  await end(page);
  expect(await events(page, "quiz_answer")).toHaveLength(0);
  release();
  await expect.poll(async () => (await events(page, "quiz_answer")).length).toBe(1);
  expect(await events(page, "quiz_end")).toHaveLength(1);
});

test("Daily continue and confirmation retries share an ID and passive receipts do not resubmit", async ({ page, context }) => {
  const data = await dailyFixture(page);
  await page.goto("/daily");
  await page.getByRole("button", { name: "Start Daily" }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  const first = (await events(page, "daily_start"))[0];
  await page.reload();
  await page.getByRole("button", { name: "Continue Daily" }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  expect(await events(page, "daily_start")).toHaveLength(0);
  expect((await events(page, "daily_resume"))[0].run_id).toBe(first.run_id);
  data.failConfirmation = true;
  await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  expect(await events(page, "daily_submit")).toHaveLength(0);
  data.failConfirmation = false;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("heading", { name: "Correct!", exact: true })).toBeVisible();
  expect(await events(page, "daily_submit")).toHaveLength(1);
  expect((await events(page, "daily_submit"))[0].run_id).toBe(first.run_id);
  expect(await events(page, "qualified_play")).toHaveLength(1);
  await context.route("https://twitter.com/intent/**", route => route.fulfill({ body: "Local share target fixture" }));
  await page.getByRole("link", { name: "Share on X" }).click();
  expect(await events(page, "share_click")).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Correct!", exact: true })).toBeVisible();
  expect(await events(page, "daily_start")).toHaveLength(0);
  expect(await events(page, "daily_submit")).toHaveLength(0);
  expect(await events(page, "qualified_play")).toHaveLength(0);
  expect(await events(page, "daily_view")).toHaveLength(1);
});

test("analytics storage failure cannot prevent a quiz or its first-answer event", async ({ page }) => {
  await gameFixture(page, { size: 1 });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Storage denied", "SecurityError"); };
  });
  await start(page);
  await page.getByRole("button", { name: gameAnswers[0], exact: true }).click();
  await expect(page.getByText("Correct! +1 point")).toBeVisible();
  expect(await events(page, "quiz_answer")).toHaveLength(1);
  expect(await events(page, "quiz_first_answer")).toHaveLength(1);
});

test("article to Daily survives sign-in and an email request is not a login success", async ({ page }) => {
  await dailyFixture(page, false);
  await page.goto("/blog/is-whalefall-based-on-a-book");
  await page.getByRole("link", { name: "Choose a game", exact: true }).click();
  await page.getByRole("radio", { name: "Daily", exact: true }).click();
  await page.getByRole("link", { name: "Play Daily", exact: true }).click();
  await page.getByRole("button", { name: "Log in to play" }).click();
  expect(await events(page, "login_view")).toHaveLength(1);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("fixture@example.test");
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email", exact: true })).toBeVisible();
  expect(await events(page, "login_success")).toHaveLength(0);
  await page.route("**/auth/v1/user", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: "fixture-user", aud: "authenticated", role: "authenticated", email: "fixture@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" }) }));
  await page.evaluate(async () => {
    const { supabase } = await import(new URL("/src/supabase.ts", location.origin).href);
    const payload = btoa(JSON.stringify({ sub: "fixture-user", role: "authenticated", exp: 4102444800 })).replace(/=/g, "");
    await supabase.auth.setSession({ access_token: `e30.${payload}.fixture`, refresh_token: "fixture-refresh-token" });
  });
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
  expect(await events(page, "login_success")).toHaveLength(1);
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(page.getByRole("button", { name: dailyChoices[0], exact: true })).toBeEnabled();
  expect((await events(page, "daily_start"))[0]).toMatchObject({ cta_id: (await events(page, "article_to_quiz_click"))[0].cta_id, article_slug: "is-whalefall-based-on-a-book" });
  expect(JSON.stringify(await commands(page))).not.toMatch(/fixture@example|fixture-refresh|e30\./);
});

test("restoring an existing account does not invent a successful login", async ({ page }) => {
  await dailyFixture(page);
  await page.goto("/daily");
  await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
  expect(await events(page, "login_success")).toHaveLength(0);
  expect(await events(page, "login_view")).toHaveLength(0);
});

test("This or That links an article to confirmed preferences without changing quiz qualification", async ({ page }) => {
  const data = await pickFixture(page);
  await page.goto("/blog/is-whalefall-based-on-a-book");
  await page.getByRole("link", { name: "Choose a game", exact: true }).click();
  await page.getByRole("radio", { name: "This or That", exact: true }).click();
  expect(await events(page, "comparison_start")).toHaveLength(0);
  await page.getByRole("button", { name: "Choose my first pair", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose Actor 1", exact: true })).toBeEnabled();
  for (let number = 1; number <= 3; number++) {
    await page.getByRole("button", { name: `Choose Actor ${number * 2 - 1}`, exact: true }).click();
    await expect(page.getByText("Choice saved", { exact: true })).toBeVisible();
    if (number < 3) { await page.clock.runFor(1250); await expect(page.getByRole("button", { name: `Choose Actor ${number * 2 + 1}`, exact: true })).toBeEnabled(); }
  }
  const started = await events(page, "comparison_start"), choices = await events(page, "comparison_choice");
  expect(started).toHaveLength(1); expect(choices).toHaveLength(3);
  expect(started[0]).toMatchObject({ game_mode: "this_or_that", article_slug: "is-whalefall-based-on-a-book", cta_id: (await events(page, "article_to_quiz_click"))[0].cta_id });
  expect(choices.every(row => row.run_id === started[0].run_id && row.article_slug === started[0].article_slug)).toBe(true);
  expect(await events(page, "comparison_first_choice")).toHaveLength(1);
  expect(await events(page, "qualified_play")).toHaveLength(0);
  expect(await events(page, "quiz_start")).toHaveLength(0);
  const serialized = JSON.stringify(await commands(page));
  for (const game of data.games.values()) { expect(serialized).not.toContain(game.id); if (game.round) expect(serialized).not.toContain(game.round.id); }
});

test("comparison retries count only confirmed preferences; restoration and skips do not invent participation", async ({ page }) => {
  const data = await pickFixture(page);
  await page.goto("/this-or-that");
  await page.getByRole("button", { name: "Choose my first pair", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose Actor 1", exact: true })).toBeEnabled();
  data.loseChoose = true;
  await page.getByRole("button", { name: "Like both equally", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  expect(await events(page, "comparison_choice")).toHaveLength(0);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Both equally — saved", { exact: true })).toBeVisible();
  expect(await events(page, "comparison_choice")).toHaveLength(1);
  expect(await events(page, "comparison_first_choice")).toHaveLength(1);
  await page.reload();
  await expect(page.getByText("Both equally — saved", { exact: true })).toBeVisible();
  await page.clock.runFor(1300);
  await expect(page.getByRole("button", { name: "Skip this pair", exact: true })).toBeEnabled();
  expect(await events(page, "comparison_start")).toHaveLength(0);
  expect(await events(page, "comparison_choice")).toHaveLength(0);
  await page.getByRole("button", { name: "Skip this pair", exact: true }).click();
  await expect(page.getByText("Pair skipped", { exact: true })).toBeVisible();
  expect(await events(page, "comparison_choice")).toHaveLength(0);
  await page.clock.runFor(1250);
  await expect(page.getByRole("button", { name: "Choose Actor 5", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Choose Actor 5", exact: true }).click();
  await expect(page.getByText("Choice saved", { exact: true })).toBeVisible();
  expect(await events(page, "comparison_choice")).toHaveLength(1);
  expect(await events(page, "comparison_first_choice")).toHaveLength(0);
});
