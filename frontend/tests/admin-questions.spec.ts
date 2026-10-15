import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mockQuizApi, mockSignedIn } from "./fixtures";
const owner = "112743d7-f683-4bbb-8117-068e89a00f22";
const answers = ["Private Film", "Another Film", "Third Film", "Fourth Film"];
const row = (id: number) => ({
  id,
  image_url: `general/g_${String(id).padStart(5, "0")}.webp`,
  correct_answer: `Private Film ${id}`,
  options_json: [`Private Film ${id}`, ...answers.slice(1)],
  category_id: 1,
  difficulty_level_id: 1,
  needs_review: false,
  admin_revision: 1,
});
async function fixture(
  page: Page,
  account: "owner" | "player" | "guest" = "owner",
) {
  const calls = await mockQuizApi(page);
  if (account !== "guest")
    await mockSignedIn(page, account === "owner" ? owner : "fixture-user");
  const data = {
    rows: Array.from({ length: 60 }, (_, i) => row(i + 1)),
    bankCalls: [] as Record<string, unknown>[],
    detailCalls: 0,
    failBank: false,
    failKey: false,
    failImport: false,
    loseResponse: false,
    duplicate: false,
    imports: [] as {
      id: string;
      category_id: number;
      difficulty_level_id: number;
      options: string[];
      correct_index: number;
      allow_duplicate: boolean;
    }[],
    dimensions: [] as [number, number][],
    statuses: new Map<string, unknown>(),
    rights: account === "owner",
    changes: [] as Record<string, unknown>[],
    conflict: false,
    loseChangeResponse: false,
    operations: new Map<string, unknown>(),
  };
  await page.route("**/rest/v1/rpc/is_admin", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data.rights),
    }),
  );
  await page.route("**/rest/v1/rpc/admin_draft_key", (r) =>
    r.fulfill({
      status: data.failKey ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify("ab".repeat(32)),
    }),
  );
  await page.route("**/rest/v1/rpc/admin_import_status", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        data.statuses.get(r.request().postDataJSON().p_id) ?? null,
      ),
    }),
  );
  await page.route("**/rest/v1/rpc/admin_change_question", async (r) => {
    const p = r.request().postDataJSON();
    data.changes.push(p);
    if (data.conflict)
      return r.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ code: "40001", message: "Question changed" }),
      });
    let result = data.operations.get(p.p_operation);
    if (!result) {
      const q = data.rows.find((q) => q.id === p.p_id)!;
      if (p.p_delete) data.rows = data.rows.filter((q) => q.id !== p.p_id);
      else {
        q.options_json = p.p_options;
        q.correct_answer = p.p_options[p.p_correct_index];
        q.admin_revision++;
      }
      result = {
        status: "committed",
        question_id: p.p_id,
        deleted: p.p_delete,
      };
      data.operations.set(p.p_operation, result);
    }
    if (data.loseChangeResponse) {
      data.loseChangeResponse = false;
      return r.abort();
    }
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
  await page.route("**/rest/v1/rpc/admin_question_bank", (r) => {
    const p = r.request().postDataJSON();
    data.bankCalls.push(p);
    let rows = data.rows.filter(
      (q) =>
        (p.p_category_id == null || q.category_id === p.p_category_id) &&
        (p.p_difficulty_id == null ||
          q.difficulty_level_id === p.p_difficulty_id) &&
        (!p.p_search ||
          `${q.id} ${q.image_url} ${q.options_json.join(" ")}`
            .toLowerCase()
            .includes(p.p_search.toLowerCase())),
    );
    rows = rows.sort((a, b) =>
      p.p_sort === "id_asc"
        ? a.id - b.id
        : p.p_sort === "answer_asc"
          ? a.correct_answer.localeCompare(b.correct_answer)
          : b.id - a.id,
    );
    const total = rows.length,
      page = Math.min(p.p_page, Math.max(1, Math.ceil(total / 25)));
    const summary = [1, 2, 3, 4].flatMap((category_id) =>
      [1, 2, 3].map((difficulty_level_id) => ({
        category_id,
        difficulty_level_id,
        count: data.rows.filter(
          (q) =>
            q.category_id === category_id &&
            q.difficulty_level_id === difficulty_level_id,
        ).length,
      })),
    );
    return r.fulfill({
      status: data.failBank ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        data.failBank
          ? {}
          : {
              rows: rows.slice((page - 1) * 25, page * 25),
              total,
              page,
              page_size: 25,
              bank_total: data.rows.length,
              summary,
            },
      ),
    });
  });
  await page.route("**/rest/v1/rpc/admin_question_detail", (r) => {
    data.detailCalls++;
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        data.rows.find((q) => q.id === r.request().postDataJSON().p_id) ?? null,
      ),
    });
  });
  await page.route("**/functions/v1/admin-questions", async (r) => {
    if (r.request().headers()["content-type"].startsWith("application/json"))
      return r.fulfill({
        contentType: "application/json",
        body: '{"cleaned":0}',
      });
    const request = new Request(r.request().url(), {
      method: "POST",
      headers: r.request().headers(),
      body: r.request().postDataBuffer()!,
    });
    const form = await request.formData();
    const p = JSON.parse(String(form.get("question")));
    data.imports.push(p);
    const bytes = new Uint8Array(
      await (form.get("image") as Blob).arrayBuffer(),
    );
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WEBP");
    expect(bytes.length).toBeLessThanOrEqual(1048576);
    // libwebp's opaque output has a VP8 chunk with dimensions in its frame header.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    data.dimensions.push([
      view.getUint16(26, true) & 0x3fff,
      view.getUint16(28, true) & 0x3fff,
    ]);
    if (data.duplicate && !p.allow_duplicate)
      return r.fulfill({
        status: 409,
        contentType: "application/json",
        body: '{"status":"duplicate","question_id":41}',
      });
    if (data.failImport)
      return r.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"unconfirmed"}',
      });
    const result = {
      status: "committed",
      question_id: p.edit_question_id ?? 300 + data.imports.length,
      image_path: `general/g_${String(100 + data.imports.length).padStart(5, "0")}.webp`,
    };
    if (p.edit_question_id) { const q = data.rows.find(q => q.id === p.edit_question_id)!; q.image_url = result.image_path; q.options_json = p.options; q.correct_answer = p.options[p.correct_index]; q.admin_revision++; }
    data.statuses.set(p.id, result);
    if (data.loseResponse) return r.abort();
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
  return { data, calls };
}
async function attach(page: Page, files = ["question-frame.png"]) {
  await expect(page.getByLabel("Choose images", { exact: true })).toBeEnabled();
  await page
    .getByLabel("Choose images", { exact: true })
    .setInputFiles(files.map((f) => `tests/assets/${f}`));
  await expect(
    page.getByText("Processing image…", { exact: true }),
  ).toHaveCount(0, { timeout: 20000 });
}
async function fill(page: Page, index = 1) {
  const card = page.getByRole("article", {
    name: `Upload card ${index}`,
    exact: true,
  });
  for (const [i, answer] of answers.entries())
    await card
      .getByLabel(`Answer ${String.fromCharCode(65 + i)}`, { exact: true })
      .fill(answer);
  await card
    .getByRole("radio", { name: `Mark answer A correct for question ${index}` })
    .check();
  return card;
}
test("guests and other accounts receive no bank or draft requests and cannot see answers", async ({
  page,
}) => {
  const { data } = await fixture(page, "guest");
  await page.goto("/admin/questions?question=1");
  await expect(
    page.getByRole("link", { name: "Log in to administration" }),
  ).toBeVisible();
  expect(data.bankCalls).toHaveLength(0);
  expect(data.detailCalls).toBe(0);
  await mockSignedIn(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Access denied" }),
  ).toBeVisible();
  expect(data.bankCalls).toHaveLength(0);
  await expect(page.getByText("Private Film 1", { exact: true })).toHaveCount(
    0,
  );
});
test("25 server rows, filters, sorting, page and detail preserve the list and back navigation", async ({
  page,
}) => {
  const { data } = await fixture(page);
  await page.goto("/admin/questions?sort=id_asc&page=2");
  await expect(
    page.getByRole("status").filter({ hasText: "Showing" }),
  ).toHaveText("Showing 26–50 of 60 questions");
  await expect(
    page.getByRole("list", { name: "Questions" }).locator("li"),
  ).toHaveCount(25);
  const initial = data.bankCalls.length;
  await page
    .getByRole("button", { name: "View question 26", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Private Film 26");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("list", { name: "Answer options" })
      .locator("li"),
  ).toHaveCount(4);
  expect(data.bankCalls).toHaveLength(initial);
  await expect(
    page.getByRole("link", { name: "Open original" }),
  ).toHaveAttribute("href", /g_00026.webp$/);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  expect(new URL(page.url()).search).toBe("?sort=id_asc&page=2");
  await page.getByLabel("Search", { exact: true }).fill("Another Film");
  await expect.poll(() => data.bankCalls.at(-1)?.p_search).toBe("Another Film");
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await page.getByLabel("Category", { exact: true }).selectOption("2");
  await expect(
    page.getByRole("heading", { name: "No matching questions" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).first().click();
  await expect(
    page.getByRole("button", { name: "View question 60", exact: true }),
  ).toBeVisible();
  await page.getByText("Bank overview · 60 questions", { exact: true }).click();
  await expect(
    page.getByRole("table").getByRole("row", { name: /Actresses/ }),
  ).toContainText("0");
});
test("API failures retry; empty bank, no results and bad image are distinct states", async ({
  page,
}) => {
  const { data } = await fixture(page);
  data.failBank = true;
  await page.goto("/admin/questions");
  await expect(page.getByRole("alert")).toContainText("could not load");
  data.failBank = false;
  data.rows = [];
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your question bank is empty" }),
  ).toBeVisible();
  data.rows = [row(1)];
  await page.reload();
  await page.route("**/storage/v1/object/public/**", (r) => r.abort());
  await page
    .getByRole("button", { name: "View question 1", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Image unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Private Film 1");
  await expect(page.getByRole("button", { name: "Retry image" })).toBeVisible();
});
test("a delayed old search never replaces the new search results", async ({
  page,
}) => {
  await fixture(page);
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  let arrived = () => {};
  const pending = new Promise<void>((resolve) => (arrived = resolve));
  await page.route("**/rest/v1/rpc/admin_question_bank", async (r) => {
    if (r.request().postDataJSON().p_search === "old") {
      arrived();
      await held;
    }
    await r.fallback();
  });
  await page.goto("/admin/questions");
  await page.getByLabel("Search", { exact: true }).fill("old");
  await pending;
  await page.getByLabel("Search", { exact: true }).fill("Private Film 60");
  await expect(
    page.getByRole("button", { name: "View question 60", exact: true }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("status").filter({ hasText: "Showing" }),
  ).toHaveText("Showing 1–1 of 1 matching questions");
});
test("batch processing preserves proportions, defaults and individual overrides; correct choice is required", async ({
  page,
}) => {
  const { data, calls } = await fixture(page);
  await page.goto("/admin/questions/new");
  await expect(page.getByLabel("Choose images", { exact: true })).toBeEnabled();
  await attach(page, ["question-frame.png", "question-portrait.png"]);
  await fill(page, 1);
  const second = await fill(page, 2);
  await second.getByLabel("Category", { exact: true }).selectOption("2");
  await expect(
    page.getByText("Processing image…", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Default difficulty", { exact: true })
    .selectOption("3");
  await second.getByLabel("Difficulty", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Add 2 ready questions" }).click();
  await expect(page.getByText("Added", { exact: true })).toHaveCount(2);
  expect(
    data.imports.map((p) => [
      p.category_id,
      p.difficulty_level_id,
      p.correct_index,
    ]),
  ).toEqual([
    [1, 3, 0],
    [2, 2, 0],
  ]);
  expect(data.dimensions).toEqual([
    [1920, 960],
    [800, 1600],
  ]);
  expect(
    calls.some((c) =>
      [
        "get_game_question",
        "start_daily_session",
        "submit_daily_answer",
        "upsert_user_best",
      ].includes(c.name),
    ),
  ).toBe(false);
});
test("a lost response is resolved through status and never creates another import ID", async ({
  page,
}) => {
  const { data } = await fixture(page);
  data.loseResponse = true;
  await page.goto("/admin/questions/new");
  await expect(page.getByLabel("Choose images", { exact: true })).toBeEnabled();
  await attach(page);
  await fill(page);
  await page
    .getByRole("button", { name: "Add 1 ready question", exact: true })
    .click();
  await expect(page.getByText("Added", { exact: true })).toBeVisible();
  expect(data.imports).toHaveLength(1);
  await expect(
    page.getByRole("link", { name: "View saved question #301" }),
  ).toBeVisible();
});
test("unconfirmed questions retry the same operation; duplicate upload needs an explicit choice", async ({
  page,
}) => {
  const { data } = await fixture(page);
  data.failImport = true;
  await page.goto("/admin/questions/new");
  await expect(page.getByLabel("Choose images", { exact: true })).toBeEnabled();
  await attach(page);
  await fill(page);
  await page
    .getByRole("button", { name: "Add 1 ready question", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry this question", exact: true }),
  ).toBeEnabled();
  data.failImport = false;
  await page
    .getByRole("button", { name: "Retry this question", exact: true })
    .click();
  await expect(page.getByText("Added", { exact: true })).toBeVisible();
  expect(data.imports[1].id).toBe(data.imports[0].id);
  await page.getByRole("button", { name: "Clear added cards" }).click();
  data.duplicate = true;
  await attach(page);
  await fill(page);
  await page
    .getByRole("button", { name: "Add 1 ready question", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add this image again" }),
  ).toBeVisible();
  await expect(page.getByText("Added", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Add this image again" }).click();
  await expect(page.getByText("Added", { exact: true })).toBeVisible();
  expect(data.imports.at(-1)?.allow_duplicate).toBe(true);
});
test("encrypted drafts restore only by choice, retain processed image and never auto-publish", async ({
  page,
}) => {
  const { data } = await fixture(page);
  await page.goto("/admin/questions/new");
  await expect(
    page.getByText("Drafts will be saved securely in this browser."),
  ).toBeVisible();
  await attach(page);
  await fill(page);
  await expect(
    page.getByText("Drafts saved securely in this browser."),
  ).toBeVisible();
  const saved = await page.evaluate(async (owner) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("hq_private_question_drafts_v1");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return await new Promise<{ cipher: number; plaintext: boolean }>(
      (resolve) => {
        const r = db.transaction("drafts").objectStore("drafts").get(owner);
        r.onsuccess = () => {
          resolve({
            cipher: r.result.cipher.byteLength,
            plaintext: JSON.stringify(r.result).includes("Private Film"),
          });
          db.close();
        };
      },
    );
  }, owner);
  expect(saved.cipher).toBeGreaterThan(1000);
  expect(saved.plaintext).toBe(false);
  await page.reload();
  await page.getByRole("button", { name: "Restore 1 saved drafts" }).click();
  await expect(page.getByLabel("Answer A", { exact: true })).toHaveValue(
    "Private Film",
  );
  await expect(
    page.getByRole("button", { name: "Add 1 ready question", exact: true }),
  ).toBeEnabled();
  expect(data.imports).toHaveLength(0);
});
test("validation and draft recovery failure leave the current tab usable", async ({
  page,
}) => {
  const { data } = await fixture(page);
  data.failKey = true;
  await page.goto("/admin/questions/new");
  await expect(page.getByText(/Draft recovery is unavailable/)).toBeVisible();
  await attach(page);
  const card = await fill(page);
  await card.getByLabel("Answer B", { exact: true }).fill("private film");
  await expect(
    page.getByRole("button", { name: "Add 0 ready questions" }),
  ).toBeDisabled();
  await card.getByLabel("Answer B", { exact: true }).fill("Second");
  await expect(
    page.getByRole("button", { name: "Add 1 ready question", exact: true }),
  ).toBeEnabled();
});
test("mobile bank and image dialog fit the viewport and keyboard returns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await fixture(page);
  await page.goto("/admin/questions");
  await page
    .getByRole("button", { name: "View question 60", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("img")).toHaveCSS(
    "object-fit",
    "contain",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("question-bank-mobile.png"),
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "View question 60", exact: true }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Add questions", exact: true }).click();
  await attach(page);
  await fill(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("question-upload-mobile.png"),
    fullPage: true,
  });
});
test("private routes are noindex in first HTTP metadata and contain no bank data", async () => {
  const routes = JSON.parse(readFileSync("vercel.json", "utf8")).routes;
  for (const name of ["admin/questions", "admin/questions/new"]) {
    const html = readFileSync(`dist/${name}.html`, "utf8");
    expect(html).toContain("noindex, nofollow");
    expect(html).not.toContain("Private Film");
    expect(html).not.toContain("correct_answer");
    const route = routes.find(
      (r: { has?: unknown; src?: string }) => !r.has && r.src && new RegExp(r.src).test(`/${name}`),
    );
    expect(route.headers["Cache-Control"]).toBe("no-store");
    expect(route.headers["X-Robots-Tag"]).toBe("noindex, nofollow");
  }
});

test("edit four answers and correct option, refreshing the existing question", async ({
  page,
}) => {
  const { data: f } = await fixture(page);
  await page.goto("/admin/questions?question=60");
  await page.getByRole("button", { name: "Edit or delete question" }).click();
  for (const [i, value] of [
    "Edited One",
    "Edited Two",
    "Edited Three",
    "Edited Four",
  ].entries())
    await page
      .getByLabel(`Answer ${String.fromCharCode(65 + i)}`, { exact: true })
      .fill(value);
  await page.getByRole("radio", { name: "Correct answer C" }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "changes saved" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Edited Three", { exact: true }),
  ).toHaveCount(2);
  expect(f.changes[0].p_correct_index).toBe(2);
  expect(f.changes[0].p_revision).toBe(1);
  expect(f.rows.find((q) => q.id === 60)?.admin_revision).toBe(2);
});
test("deletion requires confirmation and preserves list filters", async ({
  page,
}) => {
  const { data: f } = await fixture(page);
  await page.goto("/admin/questions?sort=id_asc&question=1");
  await page.getByRole("button", { name: "Edit or delete question" }).click();
  await page
    .getByRole("button", { name: "Delete question", exact: true })
    .click();
  expect(f.changes).toHaveLength(0);
  await expect(
    page.getByText("Delete question #1?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep question" }).click();
  expect(f.changes).toHaveLength(0);
  await page
    .getByRole("button", { name: "Delete question", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/sort=id_asc$/);
  await expect(page.getByText("59 questions in the bank")).toBeVisible();
});
test("a lost deletion response retries the same operation without another deletion", async ({
  page,
}) => {
  const { data: f } = await fixture(page);
  f.loseChangeResponse = true;
  await page.goto("/admin/questions?question=60");
  await page.getByRole("button", { name: "Edit or delete question" }).click();
  await page
    .getByRole("button", { name: "Delete question", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "could not be confirmed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry same operation" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(f.changes).toHaveLength(2);
  expect(f.changes[0].p_operation).toBe(f.changes[1].p_operation);
  expect(f.rows).toHaveLength(59);
});
test("conflicting edits show reload and never claim a successful save", async ({
  page,
}) => {
  const { data: f } = await fixture(page);
  f.conflict = true;
  await page.goto("/admin/questions?question=60");
  await page.getByRole("button", { name: "Edit or delete question" }).click();
  await page.getByLabel("Answer A", { exact: true }).fill("Updated title");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "changed or was deleted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reload question" }).click();
  await expect(
    page.getByRole("button", { name: "Edit or delete question" }),
  ).toBeVisible();
  await expect(page.getByText(/changes saved/)).toHaveCount(0);
});

test("replace an image on mobile without changing the question ID",async({page})=>{
 const {data}=await fixture(page);await page.setViewportSize({width:390,height:844});await page.goto('/admin/questions?question=60');await page.getByRole('button',{name:'Edit or delete question'}).click();
 await page.getByLabel('Replace image (optional)',{exact:true}).setInputFiles('tests/assets/question-frame.png');await expect(page.getByAltText('Replacement image preview')).toBeVisible({timeout:20000});
 await expect(page.getByRole('button',{name:'Save changes',exact:true})).toBeEnabled();
 const bounds=await page.getByRole('dialog').evaluate(e=>({width:e.scrollWidth,viewport:window.innerWidth}));expect(bounds.width).toBeLessThanOrEqual(bounds.viewport);
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByText('Question #60 changes saved.',{exact:true})).toBeVisible();expect(data.imports).toHaveLength(1);expect((data.imports[0] as unknown as {edit_question_id:number}).edit_question_id).toBe(60);expect(data.rows).toHaveLength(60);expect(data.rows.find(q=>q.id===60)?.image_url).not.toBe('general/g_00060.webp');
});

for (const theme of ["light", "dark", "halloween"]) test(`${theme} theme covers the question bank, editor and upload form`, async ({ page }) => {
  const { data } = await fixture(page);
  await page.addInitScript(theme => localStorage.setItem("hard-quiz-theme", theme), theme);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/questions?question=60");
  await expect(page.locator(".hq-bank-dialog-panel")).toBeVisible();
  await expect(page.locator(".hq-bank-dialog-panel")).toHaveCSS("background-color", theme === "light" ? "rgb(255, 255, 255)" : theme === "halloween" ? "rgb(33, 24, 41)" : "rgb(25, 26, 34)");
  await expect(page.getByRole("dialog").locator("img")).toHaveCSS("object-fit", "contain");
  await page.getByRole("button", { name: "Edit or delete question" }).click();
  await expect(page.getByLabel("Answer A", { exact: true })).toHaveCSS("color", theme === "light" ? "rgb(35, 37, 53)" : theme === "halloween" ? "rgb(255, 245, 233)" : "rgb(245, 245, 250)");
  await page.screenshot({ path: test.info().outputPath(`question-editor-${theme}.png`), fullPage: true });
  expect(data.changes).toHaveLength(0);
  await page.keyboard.press("Escape");
  await page.goto("/admin/questions/new");
  await expect(page.locator(".hq-upload-drop")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath(`question-upload-${theme}.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(data.imports).toHaveLength(0);
});
