import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mockAdmin,
  selectAdminQuestion,
  adminQuestion,
  historyRow,
  ADMIN_TODAY,
} from "./admin-fixtures";

test("guests receive an administrator login return path without admin data reads", async ({
  page,
}) => {
  const { state } = await mockAdmin(page, false);
  await page.goto("/admin/daily?debug=1");
  await expect(
    page.getByRole("link", { name: "Log in to manage Daily" }),
  ).toHaveAttribute("href", "/login?redirect=%2Fadmin%2Fdaily");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  expect(state.calls).toEqual([]);
});
test("denied access and a failed rights check have distinct retryable states", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.admin = false;
  await page.goto("/admin/daily");
  await expect(
    page.getByRole("heading", { name: "Administrator access required" }),
  ).toBeVisible();
  expect(state.calls.every((call) => call.name === "is_admin")).toBe(true);
  state.rightsError = true;
  await page.reload();
  await expect(
    page.getByText("Administrator access could not be checked."),
  ).toBeVisible();
  state.rightsError = false;
  state.admin = true;
  await page.getByRole("button", { name: "Retry access check" }).click();
  await expect(page.getByLabel("Daily date")).toBeVisible();
});
test("assignment errors never look like a free date and prevent saving", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.assignmentError = true;
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await expect(
    page.getByText("No question assigned", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Assign Daily question" }),
  ).toBeDisabled();
  state.assignmentError = false;
  await page.getByRole("button", { name: "Retry assignment check" }).click();
  await expect(
    page.getByRole("button", { name: "Assign Daily question" }),
  ).toBeEnabled();
});
test("debounced literal search escapes wildcards, hides old responses, and can be cleared", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  await page.goto("/admin/daily");
  const input = page.getByLabel("Search by answer");
  await input.fill("F");
  await input.fill("Film%_");
  await expect(
    page.getByRole("button", { name: "Select question 801" }),
  ).toBeVisible();
  expect(state.searches).toEqual(["ilike.%Film\\%\\_%"]);
  state.searchDelay = 700;
  await input.fill("Old");
  await expect.poll(() => state.searches.length).toBe(2);
  state.searchRows = [adminQuestion(802, "Latest Film")];
  state.previewRows.set(802, adminQuestion(802, "Latest Film"));
  state.searchDelay = 0;
  await input.fill("Latest");
  await expect(page.getByText("Latest Film", { exact: true })).toBeVisible();
  await page.waitForTimeout(750);
  await expect(page.getByText("Search Film", { exact: true })).toHaveCount(0);
  await input.fill("");
  await expect(
    page.getByText("Start typing an answer to find a question."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Select question 802" }),
  ).toHaveCount(0);
});
test("search reports errors, no matches, and the 30-result limit clearly", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.searchError = true;
  await page.goto("/admin/daily");
  await page.getByLabel("Search by answer").fill("Film");
  await expect(page.getByText("Questions could not be loaded.")).toBeVisible();
  state.searchError = false;
  state.searchRows = [];
  await page.getByRole("button", { name: "Retry search" }).click();
  await expect(
    page.getByText("No matching questions. Try another answer."),
  ).toBeVisible();
  state.searchRows = Array.from({ length: 30 }, (_, i) =>
    adminQuestion(900 + i, `Film ${i}`),
  );
  await page.getByLabel("Search by answer").fill("Other");
  await expect(
    page.getByRole("button", { name: /^Select question / }),
  ).toHaveCount(30);
  await expect(page.getByText(/30 matches shown. Refine/)).toBeVisible();
});
test("preview includes four options, correct answer, readable names, and question ID", async ({
  page,
}) => {
  await mockAdmin(page);
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await expect(page.locator(".hq-admin-options li")).toHaveCount(4);
  await expect(page.locator(".hq-admin-correct")).toHaveText(
    "Search FilmCorrect answer",
  );
  await expect(page.locator(".hq-admin-preview")).toContainText(
    "Movie Stills · Easy · #801",
  );
});
test("ID fallback rejects invalid IDs, distinguishes missing data, and blocks incomplete options", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  await page.goto("/admin/daily");
  await page.getByText("Find a question by ID", { exact: true }).click();
  for (const id of ["0", "-1", "1.5", "9007199254740992"]) {
    await page.getByLabel("Question ID", { exact: true }).fill(id);
    await page.getByRole("button", { name: "Load question" }).click();
    await expect(
      page.getByText("Enter a positive whole question ID."),
    ).toBeVisible();
  }
  await page.getByLabel("Question ID", { exact: true }).fill("999");
  await page.getByRole("button", { name: "Load question" }).click();
  await expect(
    page.getByText("Question #999 is unavailable. Choose another question."),
  ).toBeVisible();
  state.previewRows.set(801, {
    ...adminQuestion(),
    options_json: ["Search Film", "Duplicate", "Duplicate", "Fourth"],
  });
  await page.getByLabel("Question ID", { exact: true }).fill("801");
  await page.getByRole("button", { name: "Load question" }).click();
  await expect(page.getByText(/has incomplete game data/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Assign Daily question" }),
  ).toHaveCount(0);
});
test("broken images show a finite fallback and require a successful explicit retry", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.previewRows.set(801, {
    ...adminQuestion(),
    image_url: "https://quiz-fixture.supabase.co/broken.svg",
  });
  let images = 0,
    fail = true;
  await page.route("**/broken.svg", (route) => {
    images++;
    return fail
      ? route.fulfill({ status: 404, body: "" })
      : route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"/>',
        });
  });
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await expect(page.getByRole("button", { name: "Retry image" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Assign Daily question" }),
  ).toBeDisabled();
  expect(images).toBe(1);
  fail = false;
  await page.getByRole("button", { name: "Retry image" }).click();
  await expect(
    page.getByRole("button", { name: "Assign Daily question" }),
  ).toBeEnabled();
  expect(images).toBe(2);
});
test("confirmed save uses actor and assignment revision, and prevents a second submission", async ({
  page,
}) => {
  const { state, otherCalls } = await mockAdmin(page);
  state.writeDelay = 300;
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  const button = page.getByRole("button", { name: "Assign Daily question" });
  await button.dblclick();
  await expect(
    page.getByText("Saved: Search Film for Oct 10, 2026."),
  ).toBeVisible();
  const writes = state.calls.filter(
    (call) => call.name === "set_daily_question_admin",
  );
  expect(writes).toHaveLength(1);
  expect(writes[0].payload).toEqual({
    p_date: ADMIN_TODAY,
    p_question_id: 801,
    p_expected_question_id: null,
    p_expected_version: 0,
    p_expected_user_id: "fixture-user",
    p_expected_question: {
      image_url: "https://quiz-fixture.supabase.co/fixture.svg",
      correct_answer: "Search Film",
      options_json: [
        "Search Film",
        "Second answer",
        "Third answer",
        "Fourth answer",
      ],
      category_id: 1,
      difficulty_level_id: 1,
    },
  });
  expect(
    otherCalls.some((call) =>
      /set_daily_question$|start_daily_session|submit_daily_result|get_daily_question/.test(
        call.name,
      ),
    ),
  ).toBe(false);
});
test("replacement is confirmed in a keyboard-accessible dialog and Escape cancels without writing", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.current = 800;
  state.version = 3;
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await page.getByRole("button", { name: "Review replacement" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Current: Current Film");
  await expect(
    dialog.getByRole("button", { name: "Keep current question" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(
    state.calls.filter((call) => call.name === "set_daily_question_admin"),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Review replacement" }).click();
  await dialog.getByRole("button", { name: "Confirm replacement" }).click();
  await expect(page.getByText(/Saved: Search Film/)).toBeVisible();
  expect(
    state.calls.find((call) => call.name === "set_daily_question_admin")
      ?.payload.p_expected_version,
  ).toBe(3);
});
for (const change of ["attempt", "revision", "question"] as const)
  test(`preflight refuses a stale draft when ${change} changes`, async ({
    page,
  }) => {
    const { state } = await mockAdmin(page);
    state.current = 800;
    await page.goto("/admin/daily");
    await selectAdminQuestion(page);
    await page.getByRole("button", { name: "Review replacement" }).click();
    if (change === "attempt") state.attempts = 1;
    if (change === "revision") state.version++;
    if (change === "question")
      state.previewRows.set(801, {
        ...adminQuestion(),
        correct_answer: "Changed",
        options_json: ["Changed", "Second", "Third", "Fourth"],
      });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm replacement" })
      .click();
    await expect(
      page.getByText(
        "The question or assignment changed. Review the latest details before saving again.",
      ),
    ).toBeVisible();
    expect(
      state.calls.filter((call) => call.name === "set_daily_question_admin"),
    ).toHaveLength(0);
  });
test("past dates and started attempts are read only; Today and Tomorrow follow Central time", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.current = 800;
  state.attempts = 1;
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await expect(
    page.getByText("This date is locked because an attempt has started."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review replacement" }),
  ).toBeDisabled();
  await page.getByLabel("Daily date").fill("2026-10-09");
  await expect(page.getByText("Past dates are read only.")).toBeVisible();
  await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
  await expect(page.getByLabel("Daily date")).toHaveValue("2026-10-11");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByLabel("Daily date")).toHaveValue("2026-10-10");
});
test("a Central midnight refreshes Today without silently changing the draft date", async ({
  page,
}) => {
  await mockAdmin(page);
  await page.goto("/admin/daily");
  await expect(page.getByLabel("Daily date")).toHaveValue(ADMIN_TODAY);
  await page.clock.setFixedTime(new Date("2026-10-11T05:01:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText(/Today: Oct 11, 2026/)).toBeVisible();
  await expect(page.getByLabel("Daily date")).toHaveValue(ADMIN_TODAY);
  await expect(page.getByText("Past dates are read only.")).toBeVisible();
});
test("a lost write reply is confirmed by a read without sending another write", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.writeMode = "lost-saved";
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await page.getByRole("button", { name: "Assign Daily question" }).click();
  await expect(page.getByText(/Saved: Search Film/)).toBeVisible();
  expect(
    state.calls.filter((call) => call.name === "set_daily_question_admin"),
  ).toHaveLength(1);
});
test("an uncertain save stays locked and verification is read only", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.writeMode = "lost-unknown";
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await page.getByRole("button", { name: "Assign Daily question" }).click();
  await expect(page.getByText(/The save could not be confirmed/)).toBeVisible();
  await expect(page.getByLabel("Daily date")).toBeDisabled();
  state.assignmentError = false;
  state.current = 801;
  state.version++;
  await page
    .getByRole("button", { name: "Check save status", exact: true })
    .click();
  await expect(page.getByText(/Saved: Search Film/)).toBeVisible();
  expect(
    state.calls.filter((call) => call.name === "set_daily_question_admin"),
  ).toHaveLength(1);
});
test("a server conflict after preflight shows failure and refreshes the current assignment", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.writeMode = "reject";
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await page.getByRole("button", { name: "Assign Daily question" }).click();
  await expect(
    page.getByText(/The question or assignment changed/),
  ).toBeVisible();
  await expect(
    page.getByText("No question assigned", { exact: true }),
  ).toBeVisible();
  expect(
    state.calls.filter((call) => call.name === "set_daily_question_admin"),
  ).toHaveLength(1);
});
test("history errors remain separate from successful saves and preserve confirmed rows", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  await page.goto("/admin/daily");
  await expect(page.getByText("History Film", { exact: true })).toBeVisible();
  await selectAdminQuestion(page);
  state.historyError = true;
  await page.getByRole("button", { name: "Assign Daily question" }).click();
  await expect(page.getByText(/Saved: Search Film/)).toBeVisible();
  await expect(
    page.getByText(/History could not be refreshed. Previously loaded/),
  ).toBeVisible();
  await expect(page.getByText("History Film", { exact: true })).toBeVisible();
  state.historyError = false;
  await page.getByRole("button", { name: "Retry history" }).click();
  await expect(page.getByText(/History could not be refreshed/)).toHaveCount(0);
});
test("history paginates by 20, reports loaded count, filters dates, and handles zero answers", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.historyRows = Array.from({ length: 21 }, (_, i) => {
    const d = new Date("2026-10-09T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    return {
      ...historyRow(d.toISOString().slice(0, 10), 800 + i),
      total_answers: 0,
      correct_answers: 0,
    };
  });
  await page.goto("/admin/daily");
  await expect(page.getByText(/20 dates loaded/)).toBeVisible();
  await expect(page.getByText("No answers yet", { exact: true })).toHaveCount(
    20,
  );
  await page.getByRole("button", { name: "Load more dates" }).click();
  await expect(page.getByText(/21 dates loaded/)).toBeVisible();
  expect(
    state.calls
      .filter((call) => call.name === "get_daily_history_admin")
      .map((call) => call.payload.p_offset),
  ).toEqual([0, 20]);
  await page.getByLabel("From", { exact: true }).fill("2026-10-08");
  await page.getByLabel("To", { exact: true }).fill("2026-10-09");
  await expect(page.locator(".hq-admin-history > li")).toHaveCount(2);
  await page.getByLabel("To", { exact: true }).fill("2026-10-07");
  await expect(page.getByText(/From on or before To/)).toBeVisible();
});
test("missing source details keep the current assignment and historical record visible", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.current = 800;
  state.previewRows.delete(800);
  await page.goto("/admin/daily");
  await expect(
    page.getByText(
      "The source question is unavailable. Its assignment is still recorded.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Question #800", { exact: true })).toBeVisible();
  await expect(page.getByText("History Film", { exact: true })).toBeVisible();
});
test("logout during a pending write clears private details and ignores its later reply", async ({
  page,
}) => {
  const { state } = await mockAdmin(page);
  state.writeDelay = 1200;
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await page.getByRole("button", { name: "Assign Daily question" }).click();
  await expect
    .poll(
      () =>
        state.calls.filter((call) => call.name === "set_daily_question_admin")
          .length,
    )
    .toBe(1);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: /Log out/ }).click();
  await expect(
    page.getByRole("link", { name: "Log in to manage Daily" }),
  ).toBeVisible();
  await page.waitForTimeout(1300);
  await expect(page.getByText(/Saved: Search Film/)).toHaveCount(0);
  await expect(page.getByText("History Film", { exact: true })).toHaveCount(0);
});
for (const [width, height] of [
  [320, 740],
  [390, 844],
  [768, 1024],
  [844, 390],
  [1440, 900],
])
  test(`admin controls fit ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await mockAdmin(page);
    await page.goto("/admin/daily");
    await selectAdminQuestion(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const selector of ["#daily-date", "#daily-search", ".hq-admin-save"])
      expect(
        (await page.locator(selector).boundingBox())!.height,
      ).toBeGreaterThanOrEqual(44);
    if (width === 1440) {
      await page.screenshot({
        path: process.env.HQ_ADMIN_SCREENSHOTS
          ? join(process.env.HQ_ADMIN_SCREENSHOTS, "admin-desktop.png")
          : testInfo.outputPath("admin-desktop.png"),
        fullPage: true,
      });
    }
    if (width === 390) {
      await page.screenshot({
        path: process.env.HQ_ADMIN_SCREENSHOTS
          ? join(process.env.HQ_ADMIN_SCREENSHOTS, "admin-mobile.png")
          : testInfo.outputPath("admin-mobile.png"),
        fullPage: true,
      });
    }
  });
test("admin fits enlarged text and provides visible keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdmin(page);
  await page.goto("/admin/daily");
  await selectAdminQuestion(page);
  await page.addStyleTag({
    content:
      ".hq-admin { font-size: 24px } .hq-admin-help,.hq-admin-field input,.hq-admin-field label,.hq-admin-options li { font-size: 20px }",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Daily date").focus();
  await page.keyboard.press("Tab");
  expect(
    await page
      .locator(":focus")
      .evaluate((el) => getComputedStyle(el).outlineWidth),
  ).toBe("3px");
});
test("built initial admin HTML and routing are noindex and absent from the sitemap", async () => {
  const html = readFileSync("dist/admin/daily.html", "utf8");
  expect(html).toContain('name="robots" content="noindex, nofollow"');
  expect(html).toContain("Daily administration | Hard Quiz");
  expect(readFileSync("dist/sitemap.xml", "utf8")).not.toContain("/admin/");
  const routes = JSON.parse(readFileSync("vercel.json", "utf8")).routes;
  const route = routes.find(
    (rule: { src?: string }) =>
      rule.src && new RegExp(rule.src).test("/admin/daily"),
  );
  expect(route.dest).toBe("/admin/daily.html");
  expect(route.headers["X-Robots-Tag"]).toBe("noindex, nofollow");
});
