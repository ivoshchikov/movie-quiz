import type { ProcessedImage } from "./imageProcessing";
export type CardPhase =
  | "Draft"
  | "Processing"
  | "Ready"
  | "Uploading"
  | "Added"
  | "Failed"
  | "Checking status";
export interface QuestionDraft {
  id: string;
  createdAt: number;
  name: string;
  category: number;
  difficulty: number;
  options: string[];
  correct: number | null;
  phase: CardPhase;
  processed?: ProcessedImage;
  categoryOverride: boolean;
  difficultyOverride: boolean;
  locked: boolean;
  message?: string;
  duplicate?: boolean;
  allowDuplicate?: boolean;
  questionId?: number;
  imagePath?: string;
}
const TTL = 7 * 24 * 60 * 60 * 1000,
  BUDGET = 50 * 1024 * 1024;
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("hq_private_question_drafts_v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Draft storage is unavailable."));
    request.onblocked = () =>
      reject(new Error("Close other draft tabs and try again."));
  });
function base64(bytes: Uint8Array) {
  let result = "";
  for (let i = 0; i < bytes.length; i += 16384)
    result += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(result);
}
function unbase64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
async function record(owner: string, value?: unknown): Promise<unknown> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        "drafts",
        value === undefined ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("drafts");
      const request =
        value === undefined ? store.get(owner) : store.put(value, owner);
      let result: unknown;
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () =>
        reject(new Error("Draft storage is full or unavailable."));
      tx.onabort = () =>
        reject(new Error("Draft storage is full or unavailable."));
    });
  } finally {
    db.close();
  }
}
export async function saveDrafts(
  owner: string,
  key: CryptoKey,
  cards: QuestionDraft[],
  removed: string[] = [],
): Promise<void> {
  const write = async () => {
    const merged = new Map(
      (await loadDrafts(owner, key)).map((c) => [c.id, c]),
    );
    for (const id of removed) merged.delete(id);
    for (const card of cards) {
      if (card.phase === "Added" || card.questionId) merged.delete(card.id);
      else merged.set(card.id, card);
    }
    const pending = [...merged.values()].filter(
      (c) => c.phase !== "Added" && Date.now() - c.createdAt <= TTL,
    );
    if (
      pending.length > 50 ||
      pending.reduce(
        (n, c) => n + ((c.processed?.blob.size ?? 0) * 4) / 3 + 4000,
        0,
      ) > BUDGET
    )
      throw new Error(
        "Drafts exceed the 50 MiB limit. Remove completed cards or keep this tab open.",
      );
    const items = [];
    for (const card of pending) {
      const { processed, ...fields } = card;
      items.push({
        ...fields,
        phase: card.locked ? "Checking status" : processed ? "Ready" : "Draft",
        processed: processed
          ? {
              ...processed,
              blob: base64(new Uint8Array(await processed.blob.arrayBuffer())),
            }
          : undefined,
      });
    }
    const bytes = new TextEncoder().encode(
      JSON.stringify({ version: 1, owner, items }),
    );
    if (bytes.length > BUDGET)
      throw new Error("Drafts exceed the 50 MiB limit.");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(owner) },
      key,
      bytes,
    );
    await record(owner, { version: 1, iv, cipher });
  };
  if (navigator.locks)
    return navigator.locks.request(`hq:admin-drafts:${owner}`, write);
  return write();
}
export async function loadDrafts(
  owner: string,
  key: CryptoKey,
): Promise<QuestionDraft[]> {
  const saved = (await record(owner)) as
    { version?: number; iv?: Uint8Array; cipher?: ArrayBuffer } | undefined;
  if (!saved) return [];
  if (
    saved.version !== 1 ||
    !(saved.iv instanceof Uint8Array) ||
    saved.iv.length !== 12 ||
    !(saved.cipher instanceof ArrayBuffer) ||
    saved.cipher.byteLength > BUDGET + 32
  )
    throw new Error("Saved drafts could not be restored.");
  const bytes = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: Uint8Array.from(saved.iv),
      additionalData: new TextEncoder().encode(owner),
    },
    key,
    saved.cipher,
  );
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (
    value.version !== 1 ||
    value.owner !== owner ||
    !Array.isArray(value.items) ||
    value.items.length > 50
  )
    throw new Error("Saved drafts could not be restored.");
  const result: QuestionDraft[] = [];
  for (const item of value.items) {
    if (
      typeof item.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(item.id) ||
      typeof item.createdAt !== "number" ||
      item.createdAt > Date.now() + 1000 ||
      typeof item.name !== "string" ||
      ![1, 2, 3, 4].includes(item.category) ||
      ![1, 2, 3].includes(item.difficulty) ||
      !Array.isArray(item.options) ||
      item.options.length !== 4 ||
      item.options.some(
        (o: unknown) => typeof o !== "string" || o.length > 200,
      ) ||
      !(
        item.correct === null ||
        (Number.isInteger(item.correct) &&
          item.correct >= 0 &&
          item.correct <= 3)
      ) ||
      typeof item.locked !== "boolean"
    )
      throw new Error("Saved drafts could not be restored.");
    if (Date.now() - item.createdAt > TTL) continue;
    const processed = item.processed
      ? {
          ...item.processed,
          blob: new Blob([unbase64(item.processed.blob)], {
            type: "image/webp",
          }),
        }
      : undefined;
    if (
      processed &&
      (processed.blob.size > 1048576 ||
        typeof processed.sourceHash !== "string" ||
        !/^[0-9a-f]{64}$/.test(processed.sourceHash))
    )
      throw new Error("Saved drafts could not be restored.");
    result.push({
      ...item,
      processed,
      phase: item.locked ? "Checking status" : processed ? "Ready" : "Draft",
      message: item.locked
        ? "Check the saved operation before retrying."
        : processed
          ? undefined
          : "Attach this image again to continue.",
    });
  }
  return result;
}
export const draftIsReady = (c: QuestionDraft) =>
  !!c.processed &&
  c.correct !== null &&
  c.options.length === 4 &&
  c.options.every(
    (s) =>
      !!s.trim() &&
      s.trim().length <= 200 &&
      !s.includes("\ufffd") &&
      !Array.from(s).some(
        (ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127,
      ),
  ) &&
  new Set(c.options.map((s) => s.trim().normalize("NFC").toLowerCase()))
    .size === 4;
