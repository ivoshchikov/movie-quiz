import { supabase } from "../supabase";

export interface BankQuestion {
  id: number;
  image_url: string;
  correct_answer: string;
  options_json: unknown[];
  category_id: number | null;
  difficulty_level_id: number;
  needs_review: boolean;
  admin_revision?: number;
  invalid_options?: string;
}
export interface BankResult {
  rows: BankQuestion[];
  total: number;
  bank_total: number;
  page: number;
  page_size: number;
  summary: {
    category_id: number;
    difficulty_level_id: number;
    count: number;
  }[];
}
export interface BankFilters {
  search: string;
  category: number | null;
  difficulty: number | null;
  sort: "id_desc" | "id_asc" | "answer_asc";
  page: number;
}
export interface ImportStatus {
  status: "reserved" | "uploaded" | "committed" | "expired";
  question_id: number | null;
  image_path: string;
  fingerprint?: string;
}
export interface ImportPayload {
  id: string;
  category_id: number;
  difficulty_level_id: number;
  options: string[];
  correct_index: number;
  source_hash: string;
  allow_duplicate: boolean;
  edit_question_id?: number;
  edit_revision?: number;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
function question(v: unknown): BankQuestion {
  if (
    !object(v) ||
    !count(v.id) ||
    v.id < 1 ||
    typeof v.image_url !== "string" ||
    typeof v.correct_answer !== "string" ||
    !(v.category_id === null || count(v.category_id)) ||
    !count(v.difficulty_level_id) ||
    typeof v.needs_review !== "boolean" ||
    (v.admin_revision !== undefined && (!count(v.admin_revision) || v.admin_revision < 1))
  )
    throw new Error("Invalid question response");
  return {
    ...v,
    options_json: Array.isArray(v.options_json) ? v.options_json : [],
    invalid_options: Array.isArray(v.options_json)
      ? undefined
      : JSON.stringify(v.options_json),
  } as unknown as BankQuestion;
}
export async function loadBank(
  filters: BankFilters,
  signal: AbortSignal,
): Promise<BankResult> {
  const { data, error } = await supabase
    .rpc("admin_question_bank", {
      p_search: filters.search,
      p_category_id: filters.category,
      p_difficulty_id: filters.difficulty,
      p_sort: filters.sort,
      p_page: filters.page,
    })
    .abortSignal(signal);
  if (error) throw error;
  if (
    !object(data) ||
    !Array.isArray(data.rows) ||
    !count(data.total) ||
    !count(data.bank_total) ||
    !count(data.page) ||
    data.page < 1 ||
    data.page_size !== 25 ||
    !Array.isArray(data.summary) ||
    !data.summary.every(
      (s) =>
        object(s) &&
        count(s.category_id) &&
        count(s.difficulty_level_id) &&
        count(s.count),
    )
  )
    throw new Error("Invalid question list");
  const rows = data.rows.map(question);
  if (new Set(rows.map((r) => r.id)).size !== rows.length)
    throw new Error("Duplicate question IDs");
  return { ...data, rows } as unknown as BankResult;
}
export async function loadQuestion(
  id: number,
  signal: AbortSignal,
): Promise<BankQuestion | null> {
  const { data, error } = await supabase
    .rpc("admin_question_detail", { p_id: id })
    .abortSignal(signal);
  if (error) throw error;
  return data === null ? null : question(data);
}
export async function importStatus(
  id: string,
  signal: AbortSignal,
): Promise<ImportStatus | null> {
  const { data, error } = await supabase
    .rpc("admin_import_status", { p_id: id })
    .abortSignal(signal);
  if (error) throw error;
  if (data === null) return null;
  if (
    !object(data) ||
    !["reserved", "uploaded", "committed", "expired"].includes(
      String(data.status),
    ) ||
    !(data.question_id === null || count(data.question_id)) ||
    typeof data.image_path !== "string"
  )
    throw new Error("Invalid import status");
  return data as unknown as ImportStatus;
}
export async function draftKey(signal: AbortSignal): Promise<CryptoKey> {
  const { data, error } = await supabase
    .rpc("admin_draft_key")
    .abortSignal(signal);
  if (error) throw error;
  if (typeof data !== "string" || !/^[0-9a-f]{64}$/.test(data))
    throw new Error("Draft recovery unavailable");
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(data.match(/../g)!, (x) => parseInt(x, 16)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
export class ImportError extends Error {
  constructor(
    public readonly kind:
      "duplicate" | "busy" | "unknown" | "invalid" | "conflict",
    message: string,
    public readonly questionId?: number,
  ) {
    super(message);
  }
}
export async function importFingerprint(payload: ImportPayload, blob: Blob) {
  const hash = async (bytes: BufferSource) =>
    Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
  const fileHash = await hash(await blob.arrayBuffer());
  return hash(
    new TextEncoder().encode(
      JSON.stringify({
        hash: fileHash,
        category_id: payload.category_id,
        difficulty_level_id: payload.difficulty_level_id,
        options: payload.options.map((s) => s.trim().normalize("NFC")),
        correct_index: payload.correct_index,
        source_hash: payload.source_hash ?? null,
      }),
    ),
  );
}
async function callImport(
  body: FormData | Record<string, unknown>,
  signal: AbortSignal,
): Promise<Response> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Sign in again to continue.");
  signal.throwIfAborted();
  return fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-questions`,
    {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      signal,
    },
  );
}
export async function sendImport(
  payload: ImportPayload,
  blob: Blob,
  signal: AbortSignal,
): Promise<ImportStatus> {
  const form = new FormData();
  form.append("question", JSON.stringify(payload));
  form.append("image", blob, "question.webp");
  const response = await callImport(form, signal);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (data?.status === "duplicate")
      throw new ImportError(
        "duplicate",
        "This image is already in the bank or upload queue.",
        data.question_id,
      );
    if (data?.status === "busy")
      throw new ImportError(
        "busy",
        "This question is still being saved. Check status in a moment.",
      );
    if (data?.status === "conflict")
      throw new ImportError(
        "conflict",
        "This question changed or was deleted. Reload before continuing.",
      );
    if (response.status === 400)
      throw new ImportError(
        "invalid",
        typeof data?.error === "string"
          ? data.error
          : "Question validation failed.",
      );
    throw new ImportError(
      "unknown",
      "Saving could not be confirmed. Check status or retry.",
    );
  }
  if (
    !object(data) ||
    data.status !== "committed" ||
    !count(data.question_id) ||
    data.question_id < 1 ||
    typeof data.image_path !== "string"
  )
    throw new ImportError(
      "unknown",
      "Saving could not be confirmed. Check status or retry.",
    );
  return data as unknown as ImportStatus;
}
export async function cleanupImports(signal: AbortSignal) {
  const response = await callImport({ action: "cleanup" }, signal);
  if (!response.ok) throw new Error("Cleanup unavailable");
}

export async function changeQuestion(
  operation: string,
  row: BankQuestion,
  options: string[] | null,
  correctIndex: number | null,
  remove: boolean,
  signal: AbortSignal,
) {
  const { data, error } = await supabase
    .rpc("admin_change_question", {
      p_operation: operation,
      p_id: row.id,
      p_revision: row.admin_revision,
      p_options: options,
      p_correct_index: correctIndex,
      p_delete: remove,
    })
    .abortSignal(signal);
  if (error) {
    if (error.code === "40001" || /Question unavailable/.test(error.message))
      throw new ImportError(
        "conflict",
        "This question changed or was deleted. Reload before continuing.",
      );
    if (/Invalid answers/.test(error.message))
      throw new ImportError(
        "invalid",
        "Enter four different answers and choose the correct one.",
      );
    throw new ImportError(
      "unknown",
      "Saving could not be confirmed. Retry the same operation.",
    );
  }
  if (
    !object(data) ||
    data.status !== "committed" ||
    data.question_id !== row.id ||
    data.deleted !== remove
  )
    throw new ImportError(
      "unknown",
      "Saving could not be confirmed. Retry the same operation.",
    );
}
