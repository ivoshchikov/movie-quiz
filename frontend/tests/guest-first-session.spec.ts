import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { gameFixture } from "./game-fixtures";
import { dailyFixture, dailyChoices } from "./daily-fixtures";

const actors = ["James McAvoy", "Michael Fassbender", "Tom Hiddleston", "Cillian Murphy"];
async function exit(page: Page) {
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await page.getByRole("button", { name: "End quiz & save", exact: true }).click();
  await expect(page).toHaveURL(/\/result$/);
  await page.clock.runFor(16);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`guest completes an article-to-game journey and replays the selected mode at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const data = await gameFixture(page, { choices: actors, ratio: [2, 3], size: 4 });
    await page.goto("/blog/is-whalefall-based-on-a-book?utm_source=qa&utm_medium=referral");
    await page.getByRole("link", { name: "Choose a quiz", exact: true }).click();
    await page.clock.runFor(16);
    await expect(page.getByText("Play free. No account needed.", { exact: true })).toBeVisible();
    await expect(page.getByText("Account required. Build your streak one day at a time.", { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`guest-home-${viewport.width}.png`), fullPage: true });
    await page.getByRole("radio", { name: /Actors/ }).click();
    await page.getByRole("radio", { name: "Medium", exact: true }).click();
    await page.getByRole("button", { name: "Play Actors", exact: true }).click();
    for (let question = 1; question <= 3; question++) {
      await expect(page.getByText(`Question ${question}`, { exact: true })).toBeVisible();
      await page.getByRole("button", { name: actors[0], exact: true }).click();
      await expect(page.getByText("Correct! +1 point", { exact: true })).toBeVisible();
      await page.clock.runFor(1000);
    }
    await expect(page.getByText("Question 4", { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`guest-game-${viewport.width}.png`), fullPage: true });
    await exit(page);
    await expect(page.locator(".hq-result-score strong")).toHaveText("3");
    await expect(page.locator(".hq-result-mode")).toContainText("Actors");
    await expect(page.locator(".hq-result-mode")).toContainText("Medium");
    await expect(page.getByRole("link", { name: "View leaderboard", exact: true })).toHaveAttribute("href", "/leaderboard?category=2&difficulty=2");
    expect(data.accepted).toBe(3);
    await page.screenshot({ path: test.info().outputPath(`guest-result-${viewport.width}.png`), fullPage: true });
    await page.getByRole("link", { name: "Play again", exact: true }).click();
    await expect(page.getByText("Question 1", { exact: true })).toBeVisible();
    expect(data.calls.filter(call => call.name === "quiz_start")).toHaveLength(2);
    expect(data.games.size).toBe(2);
    expect(data.calls.filter(call => call.name === "quiz_start").every(call => call.payload.p_category_id === 2 && call.payload.p_difficulty_id === 2)).toBe(true);
    expect(data.calls.some(call => ["daily_begin", "submit_daily_answer", "upsert_user_best"].includes(call.name))).toBe(false);
    expect(await page.getByRole("dialog").count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await exit(page);
  });

  test(`first-time Daily visitor signs in, chooses a nickname and starts deliberately at ${viewport.width}px`, async ({ page }) => {
    const data = await dailyFixture(page, false);
    await page.setViewportSize(viewport);
    let nickname: string | null = null;
    await page.route("**/rest/v1/profiles?**", route => {
      const request = route.request();
      if (request.method() === "POST" || request.method() === "PATCH") nickname = request.postDataJSON().nickname;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ nickname, avatar_url: null }) });
    });
    await page.goto("/blog/is-whalefall-based-on-a-book");
    await page.getByRole("link", { name: "Try Daily", exact: true }).click();
    await expect(page.getByText("Daily requires an account to save your answer and track your streak.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Log in to play" }).click();
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("guest-session@example.test");
    await page.getByRole("button", { name: "Send sign-in link", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Check your email", exact: true })).toBeVisible();
    expect(data.calls.some(call => ["daily_begin", "submit_daily_answer"].includes(call.name))).toBe(false);
    await page.route("**/auth/v1/user", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: "fixture-user", aud: "authenticated", role: "authenticated", email: "guest-session@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" }) }));
    await page.evaluate(async () => {
      const { supabase } = await import(new URL("/src/supabase.ts", location.origin).href);
      const payload = btoa(JSON.stringify({ sub: "fixture-user", role: "authenticated", exp: 4102444800 })).replace(/=/g, "");
      await supabase.auth.setSession({ access_token: `e30.${payload}.fixture`, refresh_token: "fixture-refresh-token" });
    });
    await expect(page.getByRole("dialog", { name: "Choose your nickname", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("NewFilmFan");
    await page.clock.runFor(500);
    await page.getByRole("button", { name: "Save and continue", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start Daily", exact: true })).toBeEnabled();
    expect(data.calls.some(call => call.name === "daily_begin")).toBe(false);
    await page.screenshot({ path: test.info().outputPath(`daily-ready-${viewport.width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Start Daily", exact: true }).click();
    await page.getByRole("button", { name: dailyChoices[0], exact: true }).click();
    await expect(page.getByRole("heading", { name: "Correct!", exact: true })).toBeVisible();
    expect(data.calls.filter(call => call.name === "daily_begin")).toHaveLength(1);
    expect(data.calls.filter(call => call.name === "submit_daily_answer")).toHaveLength(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Play", exact: true }).click();
    await expect(page.getByText("Account required. Build your streak one day at a time.", { exact: true })).toBeVisible();
  });
}
