import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { gameFixture, gameAnswers as answers } from "./game-fixtures";
async function start(page: Page, choices = answers) {
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(
    page.getByRole("button", { name: choices[0], exact: true }),
  ).toBeEnabled();
}
async function end(page: Page) {
  await page.getByRole("button", { name: "Exit quiz", exact: true }).click();
  await page.getByRole("button", { name: "End quiz & save" }).click();
  await expect(page).toHaveURL(/\/result$/);
}
test("server clock runs during image loading and a missing image cannot grant extra time", async ({
  page,
}) => {
  const data = await gameFixture(page, { lives: 1, seconds: 10 });
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/game-fixture-0.svg", async (r) => {
    await held;
    await r.fallback();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByText("Loading image…", { exact: true })).toBeVisible();
  await page.clock.runFor(10000);
  await expect(page.getByText("Time’s up. 1 life lost.")).toBeVisible();
  expect(data.accepted).toBe(1);
  release();
  await page.clock.runFor(1900);
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.locator(".hq-result-stats dd")).toHaveText("00:10");
});
test("double clicks lock one choice and use the authoritative score and lives", async ({
  page,
}) => {
  const data = await gameFixture(page);
  await start(page);
  await page
    .getByRole("button", { name: answers[0], exact: true })
    .evaluate((b) => {
      (b as HTMLButtonElement).click();
      (b as HTMLButtonElement).click();
    });
  await expect(page.getByText("Correct! +1 point")).toBeVisible();
  expect(data.accepted).toBe(1);
  await expect(page.locator(".hq-game-stat strong")).toHaveText("1");
  await page.clock.runFor(1000);
  await expect(page.getByText("Question 2", { exact: true })).toBeVisible();
  expect(data.calls.find((c) => c.name === "quiz_next")?.payload).toEqual({
    p_session: [...data.games.keys()][0],
  });
  expect(
    data.calls.some((c) =>
      [
        "get_game_question",
        "upsert_user_best",
        "touch_question_stats",
      ].includes(c.name),
    ),
  ).toBe(false);
});
test("wrong answers and timeouts cost lives and never reveal the right choice", async ({
  page,
}) => {
  await gameFixture(page);
  await start(page);
  await page.getByRole("button", { name: answers[1], exact: true }).click();
  await expect(page.getByText("Incorrect. 1 life lost.")).toBeVisible();
  await expect(page.locator(".hq-answer-correct")).toHaveCount(0);
  await expect(page.locator(".hq-game-lives strong")).toHaveText("2 / 3");
  await page.clock.runFor(1900);
  await expect(
    page.getByRole("button", { name: answers[0], exact: true }),
  ).toBeEnabled();
  await page.clock.runFor(30100);
  await expect(page.getByText("Time’s up. 1 life lost.")).toBeVisible();
  await expect(page.locator(".hq-game-lives strong")).toHaveText("1 / 3");
});
test("last accepted answer ends the server timer before the final feedback animation", async ({
  page,
}) => {
  await gameFixture(page, { size: 1, signedIn: true });
  await start(page);
  await page.clock.runFor(2500);
  await page.getByRole("button", { name: answers[0], exact: true }).click();
  await expect(page.getByText("Correct! +1 point")).toBeVisible();
  await page.clock.runFor(1000);
  await expect(
    page.getByRole("heading", { name: "All questions completed!" }),
  ).toBeVisible();
  await expect(page.locator(".hq-result-stats dd").first()).toHaveText("00:02");
  await expect(page.getByRole("status")).toContainText(
    "Synced with your account",
  );
});
test("an uncertain answer retries the same choice without resetting its server deadline", async ({
  page,
}) => {
  const d = await gameFixture(page);
  d.failAnswer = true;
  await start(page);
  await page.getByRole("button", { name: answers[0], exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t be confirmed");
  await expect(
    page.getByRole("button", { name: answers[1], exact: true }),
  ).toBeDisabled();
  await page.clock.runFor(31000);
  d.failAnswer = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("Time’s up. 1 life lost.")).toBeVisible();
  expect(d.accepted).toBe(1);
});
test("exit waits for an accepted answer response and sends only the session ID", async ({
  page,
}) => {
  const d = await gameFixture(page, { signedIn: true });
  let release = () => {};
  d.holdAnswer = new Promise<void>((r) => (release = r));
  await start(page);
  await page.getByRole("button", { name: answers[0], exact: true }).click();
  await expect.poll(() => d.accepted).toBe(1);
  await end(page);
  expect(d.calls.filter((c) => c.name === "quiz_finish")).toHaveLength(0);
  release();
  await expect(page.getByRole("status")).toContainText(
    "Synced with your account",
  );
  await expect(page.locator(".hq-result-score strong")).toHaveText("1");
  expect(d.calls.find((c) => c.name === "quiz_finish")?.payload).toEqual({
    p_session: [...d.games.keys()][0],
  });
});
test("local score and time changes never become a server result", async ({
  page,
}) => {
  const d = await gameFixture(page, { signedIn: true });
  d.failFinish = true;
  await start(page);
  await end(page);
  await expect(page.getByRole("status")).toContainText("Couldn’t sync");
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage).filter((k) =>
      k.startsWith("hq:quiz:pending:"),
    )) {
      const r = JSON.parse(localStorage.getItem(k)!);
      r.score = 999999;
      r.elapsedSecs = 0;
      localStorage.setItem(k, JSON.stringify(r));
    }
  });
  d.failFinish = false;
  await page.reload();
  await expect(page.getByRole("status")).toContainText(
    "Synced with your account",
  );
  await expect(page.locator(".hq-result-score strong")).toHaveText("0");
  expect(
    d.calls
      .filter((c) => c.name === "quiz_finish")
      .every((c) => Object.keys(c.payload).join(",") === "p_session"),
  ).toBe(true);
});
test("keyboard shortcuts use the visible server order and cannot send a second choice", async ({
  page,
}) => {
  const d = await gameFixture(page);
  await start(page);
  await page.keyboard.press("2");
  await page.keyboard.press("1");
  await expect(page.getByText("Incorrect. 1 life lost.")).toBeVisible();
  expect(d.accepted).toBe(1);
  expect(d.calls.find((c) => c.name === "quiz_answer")?.payload.p_answer).toBe(
    answers[1],
  );
});
test("changing the device wall clock does not reset the displayed countdown", async ({
  page,
}) => {
  const d = await gameFixture(page);
  await start(page);
  d.serverTime = Date.parse([...d.games.values()][0].server_now);
  await page.clock.setSystemTime(new Date("2030-01-01"));
  await page.clock.runFor(2000);
  await expect(page.locator(".hq-game-timer-label strong")).toHaveText("28 s");
});
test("failed setup and malformed server responses are recoverable without inventing a completed game", async ({
  page,
}) => {
  const d = await gameFixture(page);
  d.failStart = true;
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t load");
  d.failStart = false;
  d.malformed = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "next question couldn’t load",
  );
  d.malformed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("button", { name: answers[0], exact: true }),
  ).toBeEnabled();
});
test("browser Back cancellation preserves the running game; reload closes it", async ({
  page,
}) => {
  await gameFixture(page);
  await start(page);
  page.once("dialog", (d) => d.dismiss());
  await page.goBack();
  await expect(page).toHaveURL(/\/play$/);
  await expect(
    page.getByRole("button", { name: answers[0], exact: true }),
  ).toBeEnabled();
  page.once("dialog", (d) => d.accept());
  await page.reload();
  await expect(page).toHaveURL(/\/result$/);
});
test("direct play without settings remains usable and an empty bank is not a victory", async ({
  page,
}) => {
  await gameFixture(page, { size: 0 });
  await page.goto("/play");
  await expect(page.getByRole("link", { name: "Choose a quiz" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "Play Movie Stills" }).click();
  await expect(
    page.getByRole("heading", { name: "More questions are on the way" }),
  ).toBeVisible();
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 568, height: 320 },
]) {
  test(`error and feedback states fit ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await gameFixture(page);
    let imageFails = true,
      answerFails = true;
    await page.route(/\/game-fixture-0\.svg(?:\?.*)?$/, (route) =>
      imageFails ? route.abort() : route.fallback(),
    );
    await page.route("**/rest/v1/rpc/quiz_answer", (route) =>
      answerFails
        ? route.fulfill({ status: 503, body: '{"message":"fixture failure"}' })
        : route.fallback(),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Play Movie Stills" }).click();
    await expect(page.getByRole("alert")).toContainText("image couldn’t load");
    const fits = async () => {
      const geometry = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        bounds: [
          ...document.querySelectorAll(
            ".hq-game button, .hq-game-image-message, .hq-game-feedback",
          ),
        ].map((element) => element.getBoundingClientRect().toJSON()),
      }));
      expect(geometry.height).toBeLessThanOrEqual(viewport.height + 1);
      for (const rect of geometry.bounds)
        expect(rect.bottom).toBeLessThanOrEqual(viewport.height + 1);
    };
    await fits();
    imageFails = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByRole("button", { name: answers[0], exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: answers[0], exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "answer couldn’t be confirmed",
    );
    await page.screenshot({
      path: test.info().outputPath("answer-error.png"),
      fullPage: true,
    });
    await test
      .info()
      .attach("error-geometry", {
        body: await page.evaluate(() =>
          JSON.stringify(
            [
              ...document.querySelectorAll(
                ".hq-game-answers, .hq-game-answer, .hq-game-feedback, .hq-inline-action",
              ),
            ].map((element) => ({
              name: element.className,
              rect: element.getBoundingClientRect().toJSON(),
            })),
          ),
        ),
        contentType: "application/json",
      });
    await fits();
    answerFails = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByText("Correct! +1 point", { exact: true }),
    ).toBeVisible();
    await fits();
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 600 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 320, height: 568 },
  { width: 320, height: 480 },
  { width: 360, height: 540 },
  { width: 844, height: 390 },
  { width: 568, height: 320 },
]) {
  test(`all gameplay controls and the full image fit ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const choices = [
      "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb (1964)",
      ...answers.slice(1),
    ];
    await gameFixture(page, {
      choices: choices,
      ratio: viewport.width < 600 ? [9, 16] : [239, 100],
    });
    await start(page, choices);
    const geometry = await page.evaluate(() => {
      const selector =
        ".hq-play-header, .hq-game-heading, .hq-game-image, .hq-game-timer, .hq-game-answer, .hq-game-feedback, .hq-game-stats, .hq-game-footer";
      const elements = [
        ...document.querySelectorAll<HTMLElement>(selector),
      ].map((element) => ({
        name: element.className,
        rect: element.getBoundingClientRect().toJSON(),
        overflow: element.scrollHeight > element.clientHeight + 1,
        text: element.querySelector(".hq-answer-text")?.textContent,
        textHeight: element
          .querySelector(".hq-answer-text")
          ?.getBoundingClientRect().height,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      const image =
        document.querySelector<HTMLImageElement>(".hq-game-image img")!;
      return {
        elements,
        width: innerWidth,
        height: innerHeight,
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        objectFit: getComputedStyle(image).objectFit,
        loaded: image.complete && image.naturalWidth > 0,
      };
    });
    await test
      .info()
      .attach("geometry", {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
    await page.screenshot({
      path: test.info().outputPath("game.png"),
      fullPage: true,
    });
    expect(geometry.pageWidth).toBeLessThanOrEqual(viewport.width + 1);
    expect(geometry.pageHeight).toBeLessThanOrEqual(viewport.height + 1);
    expect(geometry.loaded).toBeTruthy();
    expect(geometry.objectFit).toBe("contain");
    for (const item of geometry.elements) {
      expect(item.rect.top, item.name).toBeGreaterThanOrEqual(0);
      expect(item.rect.bottom, item.name).toBeLessThanOrEqual(
        viewport.height + 1,
      );
      expect(item.rect.right, item.name).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      expect(item.overflow, item.name).toBeFalsy();
    }
    await expect(
      page.getByRole("link", { name: "Blog", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Leaderboard", exact: true }),
    ).toHaveCount(0);
  });
}

test('signing out in another tab never transfers the running account session to the guest',async({page,context})=>{
 const d=await gameFixture(page,{signedIn:true});await start(page);await page.getByRole('button',{name:answers[0],exact:true}).click();await expect(page.getByText('Correct! +1 point')).toBeVisible();await page.clock.runFor(1000);await expect(page.getByText('Question 2',{exact:true})).toBeVisible();
 const other=await context.newPage();const {mockQuizApi}=await import('./fixtures');await mockQuizApi(other);await other.goto('/');await other.getByRole('button',{name:'Account menu'}).click();await other.getByRole('menuitem',{name:'Log out'}).click();
 await expect(page.locator('.hq-game-stat strong')).toHaveText('0');await expect(page.getByText('Question 1',{exact:true})).toBeVisible();expect(d.games.size).toBe(2);await other.close();
});
