import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { GameResult } from "../src/game/resultStorage";
import { gameFixture, gameAnswers } from "./game-fixtures";
const storedResult = (o: Partial<GameResult> = {}): GameResult => ({
  id: "stored-run",
  playKey: "old-play",
  userId: null,
  categoryId: 1,
  difficultyId: 1,
  score: 17,
  elapsedSecs: 83,
  finishReason: "exit",
  saveStatus: "device",
  ...o,
});
async function seed(page: Page, r: GameResult) {
  await page.addInitScript(
    (r) =>
      localStorage.setItem(
        "hq:quiz:last:" + (r.userId ?? "guest"),
        JSON.stringify(r),
      ),
    r,
  );
}
async function play(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(
    page.getByRole("button", { name: gameAnswers[0], exact: true }),
  ).toBeEnabled();
}
async function end(page: Page, correct = true) {
  if (correct) {
    await page
      .getByRole("button", { name: gameAnswers[0], exact: true })
      .click();
    await expect(page.getByText("Correct! +1 point")).toBeVisible();
    await page.clock.runFor(2200);
  }
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await page.getByRole("button", { name: "End quiz & save" }).click();
  await expect(page).toHaveURL(/\/result$/);
}
test("fresh guest result shows mode, server duration and local status with contextual login", async ({
  page,
}) => {
  const d = await gameFixture(page);
  await play(page);
  await end(page);
  await expect(
    page.getByRole("heading", { name: "Quiz ended", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".hq-result-mode")).toHaveText(
    "Movie Stills · Easy",
  );
  await expect(page.locator(".hq-result-score strong")).toHaveText("1");
  await expect(page.locator(".hq-result-stats dd")).toHaveText("00:02");
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  expect(d.calls.some((c) => c.name === "upsert_user_best")).toBe(false);
  await page
    .getByRole("complementary", { name: "Guest account" })
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Log in to Hard Quiz" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/result$/);
});
for (const [name, best, award] of [
  ["first", null, "Your first personal best!"],
  ["higher score", { score: 0, time: 20 }, "New personal best!"],
  ["shorter equal score", { score: 1, time: 20 }, "New personal best!"],
  ["lower score", { score: 9, time: 80 }, null],
  ["slower equal score", { score: 1, time: 1 }, null],
] as const)
  test(`server-confirmed award: ${name}`, async ({ page }) => {
    const d = await gameFixture(page, { signedIn: true, best });
    await play(page);
    await end(page);
    await expect(page.getByRole("status")).toContainText(
      "Synced with your account",
    );
    if (award)
      await expect(page.getByText(award, { exact: true })).toBeVisible();
    else await expect(page.locator(".hq-result-record")).toHaveCount(0);
    expect(d.calls.find((c) => c.name === "quiz_finish")?.payload).toEqual({
      p_session: [...d.games.keys()][0],
    });
  });
test("an unavailable finish receipt is retryable and never claims saved or invents an award", async ({
  page,
}) => {
  const d = await gameFixture(page, { signedIn: true });
  d.failFinish = true;
  await play(page);
  await end(page);
  await expect(page.getByRole("status")).toContainText("Couldn’t sync");
  await expect(page.locator(".hq-result-record")).toHaveCount(0);
  d.failFinish = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Synced with your account",
  );
});
test("a held finish shows syncing and still allows replay", async ({
  page,
}) => {
  await gameFixture(page, { signedIn: true });
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/rest/v1/rpc/quiz_finish", async (r) => {
    await held;
    await r.fallback();
  });
  await play(page);
  await end(page);
  await expect(page.getByRole("status")).toContainText("Syncing");
  await expect(
    page.getByRole("link", { name: "Play again", exact: true }),
  ).toBeEnabled();
  release();
  await expect(page.getByRole("status")).toContainText(
    "Synced with your account",
  );
});
test("legacy results remain readable and pending aggregate scores are never uploaded", async ({
  page,
}) => {
  const d = await gameFixture(page, { signedIn: true });
  const r = storedResult({ userId: "fixture-user", saveStatus: "pending" });
  await seed(page, r);
  await page.addInitScript(
    (r) => localStorage.setItem("hq:quiz:pending:" + r.id, JSON.stringify(r)),
    r,
  );
  await page.goto("/result");
  await expect(
    page.getByRole("heading", { name: "Last quiz result" }),
  ).toBeVisible();
  await expect(page.locator(".hq-result-score strong")).toHaveText("17");
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  expect(
    d.calls.some(
      (c) => c.name === "quiz_finish" || c.name === "upsert_user_best",
    ),
  ).toBe(false);
});
test("an absent result differs from a genuine zero and supports keyboard replay", async ({
  page,
}) => {
  await gameFixture(page);
  await page.goto("/result");
  await expect(
    page.getByRole("heading", { name: "No result yet" }),
  ).toBeVisible();
  await play(page);
  await end(page, false);
  await expect(page.locator(".hq-result-score strong")).toHaveText("0");
  await page.getByRole("link", { name: "Play again", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: gameAnswers[0], exact: true }),
  ).toBeEnabled();
});
test("foreign and corrupt local results are neither displayed nor submitted", async ({
  page,
}) => {
  const d = await gameFixture(page, { signedIn: true });
  await page.addInitScript(() => {
    localStorage.setItem(
      "hq:quiz:last:fixture-user",
      JSON.stringify({
        id: "foreign",
        playKey: "p",
        userId: "another-account",
        categoryId: 1,
        difficultyId: 1,
        score: 999,
        elapsedSecs: 0,
        finishReason: "exit",
        saveStatus: "pending",
      }),
    );
    localStorage.setItem(
      "hq:quiz:pending:foreign",
      localStorage.getItem("hq:quiz:last:fixture-user")!,
    );
  });
  await page.goto("/result");
  await expect(
    page.getByRole("heading", { name: "No result yet" }),
  ).toBeVisible();
  expect(d.calls.some((c) => c.name === "quiz_finish")).toBe(false);
});
test("unavailable browser storage keeps a guest result visible without a saved claim", async ({
  page,
}) => {
  await gameFixture(page);
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new Error("blocked");
    };
  });
  await play(page);
  await end(page, false);
  await expect(page.locator(".hq-result-score strong")).toHaveText("0");
  await expect(page.getByRole("status")).toContainText(
    "Browser storage is unavailable",
  );
});
test("result leaderboard link preserves its mode through a reload", async ({
  page,
}) => {
  await gameFixture(page);
  await seed(page, storedResult({ categoryId: 2, difficultyId: 3 }));
  await page.goto("/result");
  await page
    .getByRole("link", { name: "View leaderboard", exact: true })
    .click();
  await expect(page).toHaveURL(/category=2&difficulty=3$/);
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Actors", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("radio", { name: "Hard", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
});
test("a late older receipt cannot replace the newest locally retained result", async ({
  page,
}) => {
  const d = await gameFixture(page, { signedIn: true });
  await play(page);
  await end(page, false);
  await expect(page.getByRole("status")).toContainText(
    "Synced with your account",
  );
  const first = [...d.games.keys()][0];
  await page.evaluate(
    (id) =>
      window.dispatchEvent(
        new CustomEvent("hq:quiz:result-updated", {
          detail: {
            id: "old-other-run",
            playKey: "old",
            userId: "fixture-user",
            categoryId: 1,
            difficultyId: 1,
            score: 999,
            elapsedSecs: 1,
            finishReason: "exit",
            saveStatus: "saved",
            serverGame: true,
            ignored: id,
          },
        }),
      ),
    first,
  );
  await expect(page.locator(".hq-result-score strong")).toHaveText("0");
});

for (const size of [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 1366, height: 900 },
]) {
  test(`completed results remain readable and all actions are reachable at ${size.width} × ${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await gameFixture(page, { size: 1 });
    await play(page);
    await page
      .getByRole("button", { name: "Jojo Rabbit (2019)", exact: true })
      .click();
    await expect(
      page.getByText("Correct! +1 point", { exact: true }),
    ).toBeVisible();
    await page.clock.runFor(1000);
    await expect(
      page.getByRole("heading", { name: "All questions completed!" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    for (const name of ["Play again", "Back to home", "View leaderboard"]) {
      const link = page.getByRole("link", { name, exact: true });
      await link.scrollIntoViewIfNeeded();
      const box = await link.boundingBox();
      expect(
        box &&
          box.x >= 0 &&
          box.x + box.width <= size.width &&
          box.y >= 0 &&
          box.y + box.height <= size.height,
      ).toBeTruthy();
    }
    if (size.width === 1366)
      await page.screenshot({
        path: test.info().outputPath("result-desktop.png"),
        fullPage: true,
      });
    if (size.width === 375)
      await page.screenshot({
        path: test.info().outputPath("result-mobile.png"),
        fullPage: true,
      });
    await page.getByRole("link", { name: "Back to home", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Play Movie Stills" }),
    ).toBeVisible();
  });
}
