import Ajv from "ajv";
import schema from "../../../docs/question-content-bundle.schema.json";
import {
  imageHeader,
  sha256,
} from "../../../supabase/functions/admin-questions/webpHeader.mjs";
import {
  safeHttpUrl,
  validateContentMetadata,
} from "../../../supabase/functions/admin-questions/content.mjs";
import { readSafeZip, safeArchivePath } from "./safeZip";
import type {
  BundleCatalog,
  BundleEntry,
  BundleQuestion,
  BundleValidation,
  ContentMetadata,
} from "./types";

export const CURRENT_CATALOG: BundleCatalog = {
  categories: [
    { id: 1, name: "All movies" },
    { id: 2, name: "Actors" },
    { id: 3, name: "Actresses" },
    { id: 4, name: "TV series" },
  ],
  levels: [
    { id: 1, name: "Easy", key: "easy" },
    { id: 2, name: "Medium", key: "normal" },
    { id: 3, name: "Hard", key: "hard" },
  ],
};
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(schema);
const validateTop = ajv.compile({
  ...schema,
  $id: undefined,
  properties: {
    ...schema.properties,
    questions: { type: "array", minItems: 1, maxItems: 50 },
  },
});
const validateQuestion = ajv.getSchema(`${schema.$id}#/definitions/question`)!;
const key = (s: string) => s.normalize("NFC").trim().toLowerCase();
const labelKey = (s: string) =>
  ({
    movies: "all movies",
    "movie stills": "all movies",
    "tv series": "tv series",
  })[key(s)] ?? key(s);
export const identityKey = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export function questionMetadata(
  question: BundleQuestion,
  manifestHash?: string,
): ContentMetadata {
  const { image, identity, ...editorial } = question;
  return validateContentMetadata({
    image,
    ...(identity ? { identity } : {}),
    editorial: {
      ...editorial,
      bundle_schema_version: schema.properties.schema_version.const,
      ...(manifestHash ? { manifest_sha256: manifestHash } : {}),
    },
  });
}
function urlsAreSafe(value: unknown, name = ""): boolean {
  if (Array.isArray(value))
    return value.every((v) =>
      urlsAreSafe(v, name.endsWith("_urls") ? "url" : name),
    );
  if (value && typeof value === "object")
    return Object.entries(value).every(([k, v]) => urlsAreSafe(v, k));
  return (
    typeof value !== "string" ||
    !(name === "url" || name.endsWith("_url")) ||
    !value ||
    safeHttpUrl(value)
  );
}
export async function validateBundle(
  bytes: Uint8Array,
  catalog: BundleCatalog,
  options: {
    signal?: AbortSignal;
    progress?: (message: string) => void;
    decode?: (bytes: Uint8Array) => Promise<{ width: number; height: number }>;
  } = {},
): Promise<BundleValidation> {
  const files = await readSafeZip(
    bytes,
    (done, total) => options.progress?.(`Checking archive ${done}/${total}`),
    options.signal,
  );
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        files.get("manifest.json")!,
      ),
    );
  } catch {
    throw Error("manifest.json is not valid UTF-8 JSON.");
  }
  if (!validateTop(raw))
    throw Error(
      `Invalid manifest: ${ajv.errorsText(validateTop.errors, { separator: "; " })}`,
    );
  const manifestHash = await sha256(files.get("manifest.json")!);
  const questions = raw.questions as unknown[];
  const errors: string[] = [];
  const references = new Set(
    questions.flatMap((q) =>
      q &&
      typeof q === "object" &&
      "image" in q &&
      q.image &&
      typeof q.image === "object" &&
      "file" in q.image &&
      typeof q.image.file === "string"
        ? [q.image.file]
        : [],
    ),
  );
  const unusedImages = [...files.keys()].filter(
    (path) => path.startsWith("images/") && !references.has(path),
  );
  if (unusedImages.length)
    errors.push(
      `Unreferenced image files: ${unusedImages.slice(0, 5).join(", ")}. Remove unused images or reference them in the manifest.`,
    );
  if (raw.question_count !== questions.length)
    errors.push("question_count does not match questions.length.");
  const snapshot = raw.category as { id: number; name: string } | undefined;
  if (
    snapshot &&
    !catalog.categories.some(
      (c) =>
        c.id === snapshot.id && labelKey(c.name) === labelKey(snapshot.name),
    )
  )
    errors.push("Package category snapshot disagrees with current settings.");
  for (const level of (raw.difficulty_levels ?? []) as BundleCatalog["levels"])
    if (
      !catalog.levels.some(
        (l) =>
          l.id === level.id &&
          key(l.name) === key(level.name) &&
          l.key === level.key,
      )
    )
      errors.push(
        `Difficulty snapshot ${level.id} disagrees with current settings.`,
      );
  const ids = new Map<string, number>();
  for (const q of questions)
    if (
      q &&
      typeof q === "object" &&
      "temp_id" in q &&
      typeof q.temp_id === "string"
    )
      ids.set(q.temp_id, (ids.get(q.temp_id) ?? 0) + 1);
  const hashes = new Map<string, string>(),
    identities = new Map<string, string>();
  const entries: BundleEntry[] = [];
  for (const [index, value] of questions.entries()) {
    options.signal?.throwIfAborted();
    const entry: BundleEntry = {
      index,
      tempId: `Record ${index + 1}`,
      errors: [],
      warnings: [],
    };
    entries.push(entry);
    if (!validateQuestion(value)) {
      entry.errors.push(
        ajv.errorsText(validateQuestion.errors, { separator: "; " }),
      );
      continue;
    }
    const q = value as BundleQuestion;
    entry.tempId = q.temp_id;
    entry.question = q;
    if (
      Object.keys(q).some(
        (k) =>
          k.startsWith("correct_") &&
          !["correct_answer", "correct_index", "correct_option_label"].includes(
            k,
          ),
      )
    )
      entry.errors.push(
        "Unsupported additional correct-answer designation; use correct_answer, correct_index and optional correct_option_label.",
      );
    if (ids.get(q.temp_id) !== 1)
      entry.errors.push("Temporary ID is repeated in this package.");
    const category = catalog.categories.find((c) => c.id === q.category_id),
      level = catalog.levels.find((l) => l.id === q.difficulty_level_id);
    if (!category || !level)
      entry.errors.push(
        "Category or difficulty no longer exists in current settings.",
      );
    if (snapshot && q.category_id !== snapshot.id)
      entry.errors.push(
        "Question category disagrees with the package category.",
      );
    if (
      category &&
      q.category_name &&
      labelKey(category.name) !== labelKey(q.category_name)
    )
      entry.errors.push("Category ID and name disagree.");
    if (
      level &&
      ((q.difficulty_name && key(level.name) !== key(q.difficulty_name)) ||
        (q.difficulty_key && level.key !== q.difficulty_key))
    )
      entry.errors.push("Difficulty ID, name or key disagree.");
    if (
      new Set(q.options.map(key)).size !== 4 ||
      q.options.some(
        (o) =>
          !o.trim() ||
          o.includes("\ufffd") ||
          Array.from(o).some(
            (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
          ),
      )
    )
      entry.errors.push(
        "Four distinct non-empty answers without control characters are required.",
      );
    if (
      q.options[q.correct_index] !== q.correct_answer ||
      (q.correct_option_label &&
        q.correct_option_label !== "ABCD"[q.correct_index])
    )
      entry.errors.push("Correct answer, index and label disagree.");
    const entities = q.option_entities as
      | { name: string; wikidata_id?: string }[]
      | undefined;
    if (
      entities &&
      (!Array.isArray(entities) ||
        entities.length !== 4 ||
        entities.some((e, i) => !e || e.name !== q.options[i]) ||
        new Set(entities.map((e) => e.wikidata_id ?? identityKey(e.name)))
          .size !== 4 ||
        (q.identity?.wikidata_id &&
          entities[q.correct_index]?.wikidata_id !== q.identity.wikidata_id))
    )
      entry.errors.push(
        "Option identities disagree or refer to the same entity.",
      );
    if (!urlsAreSafe(q))
      entry.errors.push(
        "Only safe HTTP(S) source and license URLs are accepted.",
      );
    try {
      questionMetadata(q);
    } catch (e) {
      entry.errors.push(
        e instanceof Error ? e.message : "Invalid attribution.",
      );
    }
    if (!safeArchivePath(q.image.file))
      entry.errors.push("Invalid relative image path.");
    const data = files.get(q.image.file);
    if (!data) entry.errors.push(`Missing image: ${q.image.file}`);
    else {
      try {
        if (
          data.length !== q.image.bytes ||
          (await sha256(data)) !== q.image.sha256
        )
          throw Error(
            "Image byte count or SHA-256 does not match the manifest.",
          );
        const dimensions = imageHeader(
          data,
          [2, 3].includes(q.category_id) ? 1600 : 1920,
        );
        if (
          dimensions.width !== q.image.width ||
          dimensions.height !== q.image.height
        )
          throw Error("Image dimensions do not match the manifest.");
        if (options.decode) {
          const decoded = await options.decode(data);
          if (
            decoded.width !== dimensions.width ||
            decoded.height !== dimensions.height
          )
            throw Error(
              "Image could not be decoded with its declared dimensions.",
            );
        }
      } catch (e) {
        entry.errors.push(
          e instanceof Error ? e.message : "Invalid WebP image.",
        );
      }
    }
    if (hashes.has(q.image.sha256))
      entry.warnings.push(
        `Identical image bytes to ${hashes.get(q.image.sha256)}; review before adding.`,
      );
    hashes.set(q.image.sha256, q.temp_id);
    const entityKey = `${q.category_id}:${q.identity?.wikidata_id ?? identityKey(q.correct_answer)}`;
    if (identities.has(entityKey))
      entry.warnings.push(
        `Possible repeated person or work (${identities.get(entityKey)}). Different frames may be intentional.`,
      );
    identities.set(entityKey, q.temp_id);
    options.progress?.(`Checked ${index + 1}/${questions.length} questions`);
  }
  return {
    packageId: raw.package_id as string,
    manifestHash,
    errors,
    entries,
    files,
  };
}
