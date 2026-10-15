import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { dailyFixture, dailyChoices, dailyEpoch } from "./daily-fixtures";
async function start(page: Page) {
  await page.goto("/daily");
  await page.getByRole("button", { name: "Start Daily", exact: true }).click();
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toBeEnabled();
}
test("guest and introduction reveal no question, options or start request", async ({
  page,
}) => {
  const d = await dailyFixture(page, false);
  await page.goto("/daily");
  await expect(
    page.getByRole("button", { name: "Log in to play" }),
  ).toBeVisible();
  expect(d.calls.some((c) => c.name === "daily_begin")).toBe(false);
  await expect(page.locator('img[alt="Daily image to identify"]')).toHaveCount(
    0,
  );
});
test("viewing checks status only; Start atomically requests the question and starts the clock", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  await page.goto("/daily");
  await expect(page.getByRole("button", { name: "Start Daily" })).toBeVisible();
  expect(d.calls.some((c) => c.name === "daily_begin")).toBe(false);
  await page.getByRole("button", { name: "Start Daily" }).click();
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toBeEnabled();
  expect(d.starts.size).toBe(1);
  expect(
    d.calls.some(
      (c) =>
        c.name === "get_daily_question_public" ||
        c.name === "start_daily_session",
    ),
  ).toBe(false);
});
test("choices wait for the image while the authoritative answer clock includes loading", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  let release = () => {};
  const hold = new Promise<void>((r) => (release = r));
  await page.route("**/daily-fixture.svg", async (r) => {
    await hold;
    await r.fallback();
  });
  await page.goto("/daily");
  await page.getByRole("button", { name: "Start Daily" }).click();
  await expect(page.getByText("Loading image…", { exact: true })).toBeVisible();
  await page.clock.runFor(5000);
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toBeDisabled();
  expect(d.starts.size).toBe(1);
  release();
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: dailyChoices[0], exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Correct!", exact: true }),
  ).toBeVisible();
  expect([...d.results.values()][0].time_spent).toBeGreaterThanOrEqual(5);
});
test("accepted correctness and time come from the server and the question disappears", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  d.serverCorrect = false;
  await start(page);
  await page
    .getByRole("button", { name: dailyChoices[0], exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Not this time" }),
  ).toBeVisible();
  await expect(page.getByText("Synced with your account")).toBeVisible();
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toHaveCount(0);
  expect(
    d.calls.find((c) => c.name === "submit_daily_answer")?.payload.p_time,
  ).toBe(0);
});
test("reopening an answered Daily reads the receipt without requesting any question", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  d.results.set("fixture-user:2026-10-07", {
    is_answered: true,
    is_correct: true,
    time_spent: 8,
    answered_at: dailyEpoch.toISOString(),
  });
  await page.goto("/daily");
  await expect(
    page.getByRole("heading", { name: "Correct!", exact: true }),
  ).toBeVisible();
  expect(d.calls.some((c) => c.name === "daily_begin")).toBe(false);
});
test("competing clicks and keys freeze one choice immediately", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  await start(page);
  await page
    .getByRole("button", { name: dailyChoices[1], exact: true })
    .evaluate((b) => {
      (b as HTMLButtonElement).click();
      (b as HTMLButtonElement).click();
    });
  await page.keyboard.press("1");
  await expect(
    page.getByRole("heading", { name: "Not this time" }),
  ).toBeVisible();
  expect(d.calls.filter((c) => c.name === "submit_daily_answer")).toHaveLength(
    1,
  );
});
test("failed submission retries the same answer after reload using the original server clock", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  d.failSubmit = true;
  await start(page);
  await page
    .getByRole("button", { name: dailyChoices[1], exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry saving" }),
  ).toBeVisible();
  const begun = [...d.starts.values()][0];
  await page.clock.runFor(4000);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retry saving" }),
  ).toBeVisible();
  d.failSubmit = false;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(
    page.getByRole("heading", { name: "Not this time" }),
  ).toBeVisible();
  expect([...d.starts.values()][0]).toBe(begun);
  expect(
    d.calls
      .filter((c) => c.name === "submit_daily_answer")
      .every((c) => c.payload.p_answer === dailyChoices[1]),
  ).toBe(true);
});
test("an unconfirmed saved answer is recovered by reading, without a second submission", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  d.failConfirmation = true;
  await start(page);
  await page
    .getByRole("button", { name: dailyChoices[0], exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry saving" }),
  ).toBeVisible();
  d.failConfirmation = false;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(
    page.getByRole("heading", { name: "Correct!", exact: true }),
  ).toBeVisible();
  expect(d.calls.filter((c) => c.name === "submit_daily_answer")).toHaveLength(
    1,
  );
});
test("failed status and start requests have clear retry paths and never unlock answers", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  d.failStatus = true;
  await page.goto("/daily");
  await expect(
    page.getByRole("heading", { name: "Daily couldn’t load" }),
  ).toBeVisible();
  d.failStatus = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Daily" })).toBeVisible();
  d.failStart = true;
  await page.getByRole("button", { name: "Start Daily" }).click();
  await expect(
    page.getByRole("heading", { name: "Daily couldn’t load" }),
  ).toBeVisible();
  d.failStart = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toBeEnabled();
});
test("reopening before reset resumes the original server start and same option order", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  await start(page);
  const first = [...d.starts.values()][0];
  await page.goto("/");
  await page.clock.runFor(3000);
  await page.goto("/daily");
  await page.getByRole("button", { name: "Continue Daily" }).click();
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toBeEnabled();
  expect([...d.starts.values()][0]).toBe(first);
  expect(d.starts.size).toBe(1);
});
test("Chicago midnight removes an unanswered question and discards pending answers instead of sending yesterday", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  await page.clock.setSystemTime(new Date("2026-10-08T04:59:58Z"));
  d.failSubmit = true;
  await start(page);
  await page
    .getByRole("button", { name: dailyChoices[0], exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry saving" }),
  ).toBeVisible();
  const before = d.calls.filter((c) => c.name === "submit_daily_answer").length;
  await page.clock.runFor(2500);
  await expect(page.getByRole("button", { name: "Start Daily" })).toBeVisible();
  await expect(page.getByText("Selected answer", { exact: true })).toHaveCount(
    0,
  );
  d.failSubmit = false;
  expect(d.calls.filter((c) => c.name === "submit_daily_answer")).toHaveLength(
    before,
  );
  expect(d.results.size).toBe(0);
});
test("a device clock change does not choose a different Daily or reset the elapsed timer", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  await start(page);
  d.serverTime = dailyEpoch.getTime();
  await page.clock.setSystemTime(new Date("2031-01-01"));
  await page.clock.runFor(3000);
  await expect(page.locator(".hq-daily-timer strong")).not.toHaveText("00:00");
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toBeEnabled();
  expect(d.starts.size).toBe(1);
});
test("the Daily leaderboard shows a limited top and exact own rank", async ({
  page,
}) => {
  await dailyFixture(page);
  await page.goto("/daily");
  await page
    .getByRole("button", { name: "Streak leaderboard", exact: true })
    .click();
  await expect(page.locator(".hq-daily-streak-list li")).toHaveCount(5);
  await expect(page.getByText(/Your rank:/)).toContainText("#2");
  await page.getByRole("button", { name: "Show top 20" }).click();
  await expect(page.locator(".hq-daily-streak-list li")).toHaveCount(20);
});
for (const [at, remaining] of [
  ["2026-03-09T04:59:00Z", "01:00"],
  ["2026-11-02T05:59:00Z", "01:00"],
])
  test(`server reset deadline handles DST: ${at}`, async ({ page }) => {
    const d = await dailyFixture(page);
    d.serverTime = Date.parse(at);
    await page.goto("/daily");
    await expect(page.locator(".hq-daily-next strong")).toHaveText(remaining);
  });
test("browser storage failure still permits an authoritative result with an honest warning", async ({
  page,
}) => {
  await dailyFixture(page);
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.startsWith("hq:")) throw new Error("blocked"); original.call(this,key,value); };
  });
  await start(page);
  await expect(
    page.getByText(
      "Browser storage is unavailable. Keep this page open until your answer is saved.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: dailyChoices[0], exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Correct!", exact: true }),
  ).toBeVisible();
});
test("a malformed question fails closed and can recover through Start retry", async ({
  page,
}) => {
  const d = await dailyFixture(page);
  d.malformedQuestion = true;
  await page.goto("/daily");
  await page.getByRole("button", { name: "Start Daily" }).click();
  await expect(
    page.getByRole("heading", { name: "Daily couldn’t load" }),
  ).toBeVisible();
  d.malformedQuestion = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: dailyChoices[0], exact: true }),
  ).toBeEnabled();
});

for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [768, 1024],
  [390, 844],
  [375, 667],
  [320, 568],
  [320, 480],
  [844, 390],
  [568, 320],
]) {
  test(`Daily fits ${width}×${height} with a full portrait image and long answer`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const choices = [
      dailyChoices[0],
      "The Boy in the Striped Pajamas (2008)",
      "A Very Long Movie Title With a Subtitle and Release Year (2026)",
      dailyChoices[3],
    ];
    const data = await dailyFixture(page, true, choices);
    data.imageRatio = [2, 3];
    await start(page);
    const geometry = await page.evaluate(() => {
      const image = document.querySelector(
        ".hq-game-image img",
      ) as HTMLImageElement;
      const elements = Array.from(
        document.querySelectorAll(
          ".hq-game-image, .hq-game-answer, .hq-daily-timer, .hq-game-feedback, .hq-game-footer",
        ),
      );
      return {
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
        height: innerHeight,
        fit: getComputedStyle(image).objectFit,
        boxes: elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
        }),
      };
    });
    expect(geometry.width).toBeLessThanOrEqual(width);
    expect(geometry.fit).toBe("contain");
    for (const box of geometry.boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.bottom).toBeLessThanOrEqual(height);
    }
    await page.screenshot({
      path: test.info().outputPath("daily-question.png"),
    });
  });
}

for (const [width, height] of [
  [320, 568],
  [844, 390],
]) {
  test(`result and pending error remain accessible at ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const data = await dailyFixture(page);
    data.failSubmit = true;
    await start(page);
    await page
      .getByRole("button", { name: dailyChoices[1], exact: true })
      .click();
    const retry = page.getByRole("button", {
      name: "Retry saving",
      exact: true,
    });
    await retry.scrollIntoViewIfNeeded();
    await expect(retry).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    data.failSubmit = false;
    await retry.click();
    await expect(
      page.getByRole("heading", { name: "Not this time", exact: true }),
    ).toBeFocused();
    for (const label of ["Play a regular quiz", "Back to home", "Share on X"]) {
      const link = page.getByRole("link", { name: label, exact: true });
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(
        box &&
          box.x >= 0 &&
          box.x + box.width <= width &&
          box.y >= 0 &&
          box.y + box.height <= height,
      ).toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath("daily-result.png"),
      fullPage: true,
    });
  });
}
