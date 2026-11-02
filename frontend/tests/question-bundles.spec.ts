import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { zipSync, unzipSync, strToU8 } from "fflate";
import { mockQuizApi, mockSignedIn } from "./fixtures";
import {
  bundleOperationId,
  canonical,
} from "../../supabase/functions/admin-questions/content.mjs";
import {
  sha256,
  imageHeader,
} from "../../supabase/functions/admin-questions/webpHeader.mjs";
import type {
  BundleQuestion,
  BundleIdentity,
  ContentMetadata,
} from "../src/contentBundle/types";

// Node 18 CI does not expose Web Crypto globally by default.
if (!globalThis.crypto)
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });

const owner = "112743d7-f683-4bbb-8117-068e89a00f22";
const exampleRoot = "../docs/examples/question-content-bundle/";
const sample = JSON.parse(readFileSync(exampleRoot + "manifest.json", "utf8"))
  .questions[2] as BundleQuestion;
const sampleImage = new Uint8Array(
  readFileSync(exampleRoot + sample.image.file),
);
function packageBytes(
  count = 50,
  change?: (
    questions: BundleQuestion[],
    files: Record<string, Uint8Array>,
  ) => void,
) {
  const files = { [sample.image.file]: sampleImage };
  const questions = Array.from({ length: count }, (_, i) => ({
    ...structuredClone(sample),
    temp_id: `fixture-${i + 1}`,
    correct_answer: `Example Actress ${i + 1}`,
    options: [
      `Example Actress ${i + 1}`,
      "Second actress",
      "Third actress",
      "Fourth actress",
    ],
  }));
  change?.(questions, files);
  return Buffer.from(
    zipSync({
      ...files,
      "manifest.json": strToU8(
        JSON.stringify({
          schema_version: "hardquiz.question-content-bundle/1.0",
          package_id: "HQ-BROWSER-TEST",
          language: "en",
          question_count: questions.length,
          supported_by_current_admin_importer: false,
          questions,
        }),
      ),
    }),
  );
}
function acceptanceBytes() {
  return process.env.HQ_BUNDLE_ACCEPTANCE_ZIP
    ? readFileSync(process.env.HQ_BUNDLE_ACCEPTANCE_ZIP)
    : packageBytes();
}
function manifestOf(bytes: Buffer) {
  return JSON.parse(
    new TextDecoder().decode(unzipSync(bytes)["manifest.json"]),
  ) as { package_id: string; questions: BundleQuestion[] };
}
interface Payload {
  id: string;
  category_id: number;
  difficulty_level_id: number;
  options: string[];
  correct_index: number;
  source_hash: string;
  bundle?: BundleIdentity;
  content_metadata?: ContentMetadata;
}
interface Status {
  status: string;
  question_id: number | null;
  image_path: string;
  fingerprint: string;
}
async function fixture(
  page: Page,
  account: "owner" | "player" | "guest" = "owner",
) {
  const calls = await mockQuizApi(page);
  if (account !== "guest")
    await mockSignedIn(page, account === "owner" ? owner : "fixture-user");
  const state = {
    imports: [] as Payload[],
    hashes: [] as string[],
    statuses: new Map<string, Status>(),
    loseResponse: false,
    failImport: false,
    failStatuses: false,
    failKey: false,
    committed: 0,
    readCalls: 0,
  };
  await page.route("**/rest/v1/rpc/is_admin", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(account === "owner"),
    }),
  );
  await page.route("**/rest/v1/rpc/admin_draft_key", (r) =>
    r.fulfill({
      status: state.failKey ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify("ab".repeat(32)),
    }),
  );
  await page.route("**/rest/v1/rpc/admin_import_status", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        state.statuses.get(r.request().postDataJSON().p_id) ?? null,
      ),
    }),
  );
  await page.route("**/rest/v1/rpc/admin_bundle_warnings", (r) =>
    r.fulfill({ contentType: "application/json", body: "{}" }),
  );
  await page.route("**/rest/v1/rpc/admin_bundle_status", async (r) => {
    state.readCalls++;
    if (state.failStatuses)
      return r.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    const { p_package_id, p_temp_ids } = r.request().postDataJSON();
    const entries = await Promise.all(
      (p_temp_ids as string[]).map(async (temp) => {
        const status = state.statuses.get(
          await bundleOperationId(p_package_id, temp),
        );
        return status ? [temp, status] : null;
      }),
    );
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        Object.fromEntries(entries.filter((e): e is [string, Status] => !!e)),
      ),
    });
  });
  await page.route("**/functions/v1/admin-questions", async (r) => {
    if (r.request().headers()["content-type"].startsWith("application/json"))
      return r.fulfill({
        contentType: "application/json",
        body: '{"cleaned":0}',
      });
    const form = await new Request(r.request().url(), {
      method: "POST",
      headers: r.request().headers(),
      body: r.request().postDataBuffer()!,
    }).formData();
    const payload = JSON.parse(String(form.get("question"))) as Payload;
    const bytes = new Uint8Array(
        await (form.get("image") as Blob).arrayBuffer(),
      ),
      hash = await sha256(bytes);
    imageHeader(bytes, [2, 3].includes(payload.category_id) ? 1600 : 1920);
    state.imports.push(payload);
    state.hashes.push(hash);
    const fingerprint = await sha256(
      new TextEncoder().encode(
        JSON.stringify({
          hash,
          category_id: payload.category_id,
          difficulty_level_id: payload.difficulty_level_id,
          options: payload.options.map((s) => s.trim().normalize("NFC")),
          correct_index: payload.correct_index,
          source_hash: payload.source_hash ?? null,
          ...(payload.bundle ? { bundle: canonical(payload.bundle) } : {}),
          ...(payload.content_metadata
            ? { content_metadata: canonical(payload.content_metadata) }
            : {}),
        }),
      ),
    );
    const previous = state.statuses.get(payload.id);
    if (previous && previous.fingerprint !== fingerprint)
      return r.fulfill({
        status: 400,
        contentType: "application/json",
        body: '{"error":"Import data changed"}',
      });
    const prefix = (
      {
        1: "general/g",
        2: "actors/act",
        3: "actresses/actr",
        4: "series/tv",
      } as Record<number, string>
    )[payload.category_id];
    const status = previous ?? {
      status: "reserved",
      question_id: null,
      image_path: `${prefix}_${String(state.statuses.size + 1).padStart(5, "0")}.webp`,
      fingerprint,
    };
    state.statuses.set(payload.id, status);
    if (state.failImport)
      return r.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"unconfirmed"}',
      });
    if (status.status !== "committed") {
      status.status = "committed";
      status.question_id = 600 + ++state.committed;
    }
    if (state.loseResponse) {
      state.loseResponse = false;
      return r.abort();
    }
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(status),
    });
  });
  return { state, calls };
}
async function open(page: Page, bytes = acceptanceBytes()) {
  await expect(
    page.getByLabel("Question package ZIP", { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Question package ZIP", { exact: true })
    .setInputFiles({
      name: "actresses_questions.zip",
      mimeType: "application/zip",
      buffer: bytes,
    });
  await expect(page.getByText(/Validation complete:/)).toBeVisible({
    timeout: 30000,
  });
}
async function create(page: Page, count = 50) {
  await page
    .getByRole("button", { name: "Select all available records" })
    .click();
  await page
    .getByRole("button", { name: `Create ${count} local drafts`, exact: true })
    .click();
  await expect(
    page.getByText(`Created ${count} filled drafts.`, { exact: false }),
  ).toBeVisible({ timeout: 30000 });
}
function card(page: Page, index = 1) {
  return page.getByRole("article", {
    name: `Upload card ${index}`,
    exact: true,
  });
}
async function waitStoredAnswer(page: Page, value: string, count?: number) {
  await expect
    .poll(
      () =>
        page.evaluate(
          async ({ value, count }) => {
            const db = await new Promise<IDBDatabase>((resolve, reject) => {
              const r = indexedDB.open("hq_private_question_drafts_v1", 1);
              r.onsuccess = () => resolve(r.result);
              r.onerror = reject;
            });
            const record = await new Promise<
              { iv: Uint8Array; cipher: ArrayBuffer } | undefined
            >((resolve) => {
              const r = db
                .transaction("drafts")
                .objectStore("drafts")
                .get("112743d7-f683-4bbb-8117-068e89a00f22");
              r.onsuccess = () => resolve(r.result);
            });
            db.close();
            if (!record) return false;
            const key = await crypto.subtle.importKey(
              "raw",
              new Uint8Array(32).fill(171),
              "AES-GCM",
              false,
              ["decrypt"],
            );
            const bytes = await crypto.subtle.decrypt(
              {
                name: "AES-GCM",
                iv: Uint8Array.from(record.iv),
                additionalData: new TextEncoder().encode(
                  "112743d7-f683-4bbb-8117-068e89a00f22",
                ),
              },
              key,
              record.cipher,
            );
            const data = JSON.parse(new TextDecoder().decode(bytes));
            return (
              data.items.some((c: { options: string[] }) =>
                c.options.includes(value),
              ) &&
              (count === undefined || data.items.length === count)
            );
          },
          { value, count },
        ),
      { timeout: 10000 },
    )
    .toBe(true);
}

test("acceptance ZIP creates 50 filled local drafts, preserves edits/recovery, adds only selected and reopens without duplicates", async ({
  page,
}) => {
  test.setTimeout(90000);
  const { state } = await fixture(page),
    bytes = acceptanceBytes(),
    manifest = manifestOf(bytes);
  await page.goto("/admin/questions/new");
  await open(page, bytes);
  expect(state.imports).toHaveLength(0);
  expect(state.statuses.size).toBe(0);
  await create(page);
  await expect(page.getByRole("article", { name: /Upload card/ })).toHaveCount(
    50,
  );
  const first = manifest.questions[0];
  await expect(card(page).getByLabel("Category", { exact: true })).toHaveValue(
    "3",
  );
  await expect(
    card(page).getByRole("radio", {
      name: `Mark answer ${"ABCD"[first.correct_index]} correct for question 1`,
    }),
  ).toBeChecked();
  await expect(
    card(page).getByLabel(`Answer ${"ABCD"[first.correct_index]}`, {
      exact: true,
    }),
  ).toHaveValue(first.correct_answer);
  await expect(
    page.getByRole("button", { name: "Add 0 ready questions", exact: true }),
  ).toBeDisabled();
  await card(page)
    .getByLabel("Answer A", { exact: true })
    .fill("Edited answer for review");
  await waitStoredAnswer(page, "Edited answer for review");
  await page.reload();
  await page.getByRole("button", { name: "Restore 50 saved drafts" }).click();
  await expect(card(page).getByLabel("Answer A", { exact: true })).toHaveValue(
    "Edited answer for review",
  );
  await card(page, 2)
    .getByRole("checkbox", { name: "Select question 2 for adding" })
    .check();
  await card(page, 4)
    .getByRole("checkbox", { name: "Select question 4 for adding" })
    .check();
  await page
    .getByRole("button", { name: "Add 2 ready questions", exact: true })
    .click();
  await expect(
    page.getByText("Image and question saved.", { exact: true }),
  ).toHaveCount(2, { timeout: 15000 });
  expect(state.committed).toBe(2);
  expect(state.imports).toHaveLength(2);
  for (const [i, payload] of state.imports.entries()) {
    const original = manifest.questions.find(
      (q) => q.temp_id === payload.bundle!.temp_id,
    )!;
    expect(payload.content_metadata!.image.attribution_text).toBe(
      original.image.attribution_text,
    );
    expect(payload.content_metadata!.image.license_url).toBe(
      original.image.license_url,
    );
    expect(state.hashes[i]).toBe(original.image.sha256);
  }
  await open(page, bytes);
  await expect(
    page
      .getByLabel("Package records")
      .getByRole("checkbox", { name: `Import ${first.temp_id}`, exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("article", { name: /Upload card/ })).toHaveCount(
    50,
  );
  await expect(card(page).getByLabel("Answer A", { exact: true })).toHaveValue(
    "Edited answer for review",
  );
  expect(state.committed).toBe(2);
});

test("existing unopened saved drafts survive capacity errors and importing only part of a package", async ({
  page,
}) => {
  test.setTimeout(60000);
  const { state } = await fixture(page);
  await page.goto("/admin/questions/new");
  await open(page, packageBytes(1));
  await create(page, 1);
  await card(page)
    .getByLabel("Answer A", { exact: true })
    .fill("Existing saved work");
  await waitStoredAnswer(page, "Existing saved work");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Restore 1 saved drafts" }),
  ).toBeVisible();
  const other = packageBytes(50, (questions) => {
    for (const q of questions) q.temp_id = `other-${q.temp_id}`;
  });
  await open(page, other);
  await page
    .getByRole("button", { name: "Select all available records" })
    .click();
  await page
    .getByRole("button", { name: "Create 50 local drafts", exact: true })
    .click();
  await expect(
    page.getByText(/Selection will not fit with existing drafts/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restore 1 saved drafts" }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Import other-fixture-1", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Create 49 local drafts", exact: true })
    .click();
  await expect(page.getByRole("article", { name: /Upload card/ })).toHaveCount(
    50,
  );
  await expect(card(page).getByLabel("Answer A", { exact: true })).toHaveValue(
    "Existing saved work",
  );
  expect(state.imports).toHaveLength(0);
});

test("selected drafts can be excluded together without deleting the other local work", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/admin/questions/new");
  await open(page, packageBytes(4));
  await create(page, 4);
  await card(page, 1)
    .getByRole("checkbox", { name: "Select question 1 for adding" })
    .check();
  await card(page, 3)
    .getByRole("checkbox", { name: "Select question 3 for adding" })
    .check();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Remove selected drafts", exact: true })
    .click();
  await expect(page.getByRole("article", { name: /Upload card/ })).toHaveCount(
    2,
  );
  await waitStoredAnswer(page, "Example Actress 2", 2);
  await page.reload();
  await page
    .getByRole("button", { name: "Restore 2 saved drafts", exact: true })
    .click();
  await expect(page.getByRole("article", { name: /Upload card/ })).toHaveCount(
    2,
  );
  await expect(card(page).getByLabel("Answer A", { exact: true })).toHaveValue(
    "Example Actress 2",
  );
});

test("a lost server response confirms one question; reserved uploads retry the same immutable ID", async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto("/admin/questions/new");
  await open(page, packageBytes(2));
  await create(page, 2);
  state.loseResponse = true;
  await card(page)
    .getByRole("button", { name: "Add this question", exact: true })
    .click();
  await expect(
    card(page).getByText("Image and question saved.", { exact: true }),
  ).toBeVisible();
  expect(state.committed).toBe(1);
  expect(state.imports).toHaveLength(1);
  state.failImport = true;
  await card(page, 2)
    .getByRole("button", { name: "Add this question", exact: true })
    .click();
  await expect(
    card(page, 2).getByText("Not confirmed", { exact: true }),
  ).toBeVisible();
  const id = state.imports[1].id;
  state.failImport = false;
  await card(page, 2)
    .getByRole("button", { name: "Retry this question", exact: true })
    .click();
  await expect(
    card(page, 2).getByText("Image and question saved.", { exact: true }),
  ).toBeVisible();
  expect(state.imports[2].id).toBe(id);
  expect(state.committed).toBe(2);
  await page.getByRole("button", { name: "Clear added cards" }).click();
  await open(page, packageBytes(2));
  await expect(page.getByText(/Already added as question/)).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Select all available records" }),
  ).toBeDisabled();
});

test("reopening an unchanged ZIP recovers an unconfirmed operation after local drafts are lost", async ({
  page,
}) => {
  const { state } = await fixture(page);
  const bytes = packageBytes(1);
  await page.goto("/admin/questions/new");
  await open(page, bytes);
  await create(page, 1);
  state.failImport = true;
  await card(page)
    .getByRole("button", { name: "Add this question", exact: true })
    .click();
  await expect(
    card(page).getByText("Not confirmed", { exact: true }),
  ).toBeVisible();
  const id = state.imports[0].id;
  await page.goto("/");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("hq_private_question_drafts_v1", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("drafts", "readwrite");
      tx.objectStore("drafts").clear();
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.goto("/admin/questions/new");
  await open(page, bytes);
  await create(page, 1);
  await expect(
    card(page).getByText("Not confirmed", { exact: true }),
  ).toBeVisible();
  expect(state.imports).toHaveLength(1);
  state.failImport = false;
  await card(page)
    .getByRole("button", { name: "Retry this question", exact: true })
    .click();
  await expect(
    card(page).getByText("Image and question saved.", { exact: true }),
  ).toBeVisible();
  expect(state.imports[1].id).toBe(id);
  expect(state.committed).toBe(1);
});

test("individual invalid records stay excluded; safe attribution renders as text and image replacement clears old credits", async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto("/admin/questions/new");
  const bytes = packageBytes(2, (questions) => {
    questions[0].image.sha256 = "0".repeat(64);
    questions[1].image.attribution_text =
      '<img src=x onerror="window.creditExecuted=true">';
    questions[1].image.attribution_html =
      "<script>window.creditExecuted=true</script>";
  });
  await open(page, bytes);
  await expect(
    page.getByRole("checkbox", { name: "Import fixture-1", exact: true }),
  ).toBeDisabled();
  await create(page, 1);
  await card(page)
    .getByText("Image sources and attribution", { exact: true })
    .click();
  await expect(
    card(page)
      .locator(".hq-image-credit p")
      .filter({ hasText: '<img src=x onerror="window.creditExecuted=true">' }),
  ).toBeVisible();
  expect(await page.evaluate(() => "creditExecuted" in window)).toBe(false);
  await card(page)
    .getByLabel("Attach image for question 1", { exact: true })
    .setInputFiles("tests/assets/question-portrait.png");
  await expect(
    card(page).getByText("Image sources and attribution", { exact: true }),
  ).toHaveCount(0);
  await expect(
    card(page).getByText("Processing image…", { exact: true }),
  ).toHaveCount(0, { timeout: 30000 });
  await card(page)
    .getByRole("button", { name: "Add this question", exact: true })
    .click();
  await expect(
    card(page).getByText("Image and question saved.", { exact: true }),
  ).toBeVisible();
  expect(state.imports[0].content_metadata).toBeUndefined();
  expect(state.imports[0].bundle?.temp_id).toBe("fixture-2");
});

test("malformed archives and unavailable status checks never create drafts or assume an empty history", async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto("/admin/questions/new");
  await expect(
    page.getByLabel("Question package ZIP", { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Question package ZIP", { exact: true })
    .setInputFiles({
      name: "broken.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("not a zip"),
    });
  await expect(page.getByText(/ZIP must be at most|Invalid ZIP/)).toBeVisible();
  expect(state.readCalls).toBe(0);
  state.failStatuses = true;
  await page
    .getByLabel("Question package ZIP", { exact: true })
    .setInputFiles({
      name: "bundle.zip",
      mimeType: "application/zip",
      buffer: packageBytes(1),
    });
  await expect(
    page.getByLabel("Import question package").getByRole("alert"),
  ).toBeVisible();
  await expect(page.getByRole("article", { name: /Upload card/ })).toHaveCount(
    0,
  );
  expect(state.imports).toHaveLength(0);
});

for (const account of ["guest", "player"] as const)
  test(`${account} cannot open package or draft data`, async ({ page }) => {
    const { state } = await fixture(page, account);
    await page.goto("/admin/questions/new");
    await expect(
      page.getByLabel("Question package ZIP", { exact: true }),
    ).toHaveCount(0);
    expect(state.readCalls).toBe(0);
    expect(state.imports).toHaveLength(0);
  });

test("draft storage unavailability disables package import and preserves the existing manual flow", async ({
  page,
}) => {
  const { state } = await fixture(page);
  state.failKey = true;
  await page.goto("/admin/questions/new");
  await expect(page.getByText(/Draft recovery is unavailable/)).toBeVisible();
  await expect(
    page.getByLabel("Question package ZIP", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Choose images", { exact: true })).toBeEnabled();
});

for (const category of [1, 2, 3, 4])
  test(`ordinary manual image addition remains compatible for category ${category}`, async ({
    page,
  }) => {
    const { state } = await fixture(page);
    await page.goto("/admin/questions/new");
    await expect(
      page.getByLabel("Choose images", { exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel("Default category", { exact: true })
      .selectOption(String(category));
    await page
      .getByLabel("Choose images", { exact: true })
      .setInputFiles("tests/assets/question-portrait.png");
    await expect(
      card(page).getByText("Processing image…", { exact: true }),
    ).toHaveCount(0, { timeout: 30000 });
    for (const [i, value] of ["One", "Two", "Three", "Four"].entries())
      await card(page)
        .getByLabel(`Answer ${"ABCD"[i]}`, { exact: true })
        .fill(value);
    await card(page)
      .getByRole("radio", { name: "Mark answer A correct for question 1" })
      .check();
    await page
      .getByRole("button", { name: "Add 1 ready question", exact: true })
      .click();
    await expect(
      card(page).getByText("Image and question saved.", { exact: true }),
    ).toBeVisible();
    expect(state.imports[0].category_id).toBe(category);
    expect(state.imports[0].bundle).toBeUndefined();
    expect(state.imports[0].content_metadata).toBeUndefined();
  });

test("a category edit resizes only when necessary and updates the saved credit for those new bytes", async ({
  page,
}) => {
  const { state } = await fixture(page),
    image = new Uint8Array(
      readFileSync("../supabase/tests/assets/question.webp"),
    ),
    hash = await sha256(image);
  const bytes = packageBytes(1, (questions, files) => {
    const q = questions[0];
    q.category_id = 1;
    q.category_name = "All movies";
    q.image.width = 1920;
    q.image.height = 960;
    q.image.bytes = image.length;
    q.image.sha256 = hash;
    files[q.image.file] = image;
  });
  await page.goto("/admin/questions/new");
  await open(page, bytes);
  await create(page, 1);
  await card(page).getByLabel("Category", { exact: true }).selectOption("2");
  await expect(
    card(page).getByText("Processing image…", { exact: true }),
  ).toHaveCount(0, { timeout: 30000 });
  await card(page)
    .getByRole("button", { name: "Add this question", exact: true })
    .click();
  await expect(
    card(page).getByText("Image and question saved.", { exact: true }),
  ).toBeVisible();
  expect(state.imports[0].content_metadata!.image.width).toBe(1600);
  expect(state.imports[0].content_metadata!.image.sha256).toBe(state.hashes[0]);
  expect(state.imports[0].content_metadata!.image.photographer).toBe(
    sample.image.photographer,
  );
  expect(state.imports[0].content_metadata!.image.processing.changes).toContain(
    "Hard Quiz: resized",
  );
});

test("full image credits load only on request after a result and imported HTML stays inert", async ({
  page,
}) => {
  await mockQuizApi(page);
  let reads = 0;
  await page.addInitScript(() =>
    localStorage.setItem(
      "hq:quiz:last:guest",
      JSON.stringify({
        id: "00000000-0000-4000-8000-000000001001",
        serverGame: true,
        playKey: "fixture",
        userId: null,
        categoryId: 3,
        difficultyId: 1,
        score: 2,
        elapsedSecs: 5,
        finishReason: "completed",
        saveStatus: "device",
        finishedAt: Date.now(),
      }),
    ),
  );
  await page.route("**/rest/v1/rpc/question_image_credits", (r) => {
    reads++;
    expect(r.request().postDataJSON().p_mode).toBe("normal");
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          image_url: "fixture.svg",
          metadata: {
            image: {
              ...sample.image,
              attribution_text: "<script>window.creditExecuted=true</script>",
            },
          },
        },
      ]),
    });
  });
  await page.goto("/result");
  await expect(page.getByText("Image credits", { exact: true })).toBeVisible();
  expect(reads).toBe(0);
  await page.getByText("Image credits", { exact: true }).click();
  await expect(
    page
      .locator(".hq-image-credit p")
      .filter({ hasText: "<script>window.creditExecuted=true</script>" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".hq-image-credit")
      .getByRole("link", { name: "Image source", exact: true }),
  ).toHaveAttribute("href", sample.image.source_page_url);
  expect(reads).toBe(1);
  expect(await page.evaluate(() => "creditExecuted" in window)).toBe(false);
});

for (const theme of ["dark", "light", "christmas"])
  test(`package review fits 390px in ${theme} theme`, async ({ page }) => {
    await fixture(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (theme) => localStorage.setItem("hard-quiz-theme", theme),
      theme,
    );
    await page.goto("/admin/questions/new");
    await open(page, packageBytes(2));
    await create(page, 2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      card(page).getByRole("button", {
        name: "Add this question",
        exact: true,
      }),
    ).toBeVisible();
    if (process.env.HQ_BUNDLE_SCREENSHOTS)
      await page.screenshot({
        path: `test-results/bundle-${theme}-mobile.png`,
        fullPage: true,
      });
  });
