import { useEffect, useRef, useState } from "react";
import type {
  BundleCatalog,
  BundleValidation,
  BundleEntry,
} from "../contentBundle/types";
import type { QuestionDraft } from "./questionDrafts";
import { draftStorageBytes } from "./questionDrafts";
import {
  bundleStatuses,
  bundleWarnings,
  importFingerprint,
} from "./questionsApi";
import { bundleOperationId } from "../../../supabase/functions/admin-questions/content.mjs";
import "../image-credits.css";

async function filledDraft(
  result: BundleValidation,
  e: BundleEntry,
): Promise<QuestionDraft> {
  const { questionMetadata } = await import("../contentBundle/validate");
  const q = e.question!,
    image = q.image;
  return {
    id: await bundleOperationId(result.packageId, q.temp_id),
    createdAt: Date.now(),
    name: image.file,
    category: q.category_id,
    difficulty: q.difficulty_level_id,
    options: [...q.options],
    correct: q.correct_index,
    phase: "Ready",
    categoryOverride: true,
    difficultyOverride: true,
    locked: false,
    selected: false,
    bundle: { package_id: result.packageId, temp_id: q.temp_id },
    contentMetadata: questionMetadata(q, result.manifestHash),
    contentWarnings: e.warnings,
    processed: {
      blob: new Blob([Uint8Array.from(result.files.get(image.file)!)], {
        type: "image/webp",
      }),
      sourceHash: image.sha256,
      sourceBytes: image.bytes,
      sourceWidth: image.width,
      sourceHeight: image.height,
      width: image.width,
      height: image.height,
    },
  };
}

export default function ContentBundleImport({
  catalog,
  existing,
  disabled,
  onImport,
}: {
  catalog: BundleCatalog;
  existing: QuestionDraft[];
  disabled: boolean;
  onImport: (cards: QuestionDraft[]) => Promise<void>;
}) {
  const [result, setResult] = useState<BundleValidation | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unavailable, setUnavailable] = useState<Map<string, string>>(
    new Map(),
  );
  const [resumable, setResumable] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  async function open(file: File) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    setSelected(new Set());
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    try {
      if (!file.name.toLowerCase().endsWith(".zip") || file.size > 50 * 1048576)
        throw Error("Choose a ZIP file up to 50 MiB. XLSX is for review only.");
      const { validateBundle } = await import("../contentBundle/validate");
      const value = await validateBundle(
        new Uint8Array(await file.arrayBuffer()),
        catalog,
        {
          signal: c.signal,
          progress: (message) => {
            if (!c.signal.aborted) setProgress(message);
          },
          decode: async (bytes) => {
            const bitmap = await createImageBitmap(
              new Blob([Uint8Array.from(bytes)], { type: "image/webp" }),
            );
            try {
              return { width: bitmap.width, height: bitmap.height };
            } finally {
              bitmap.close();
            }
          },
        },
      );
      c.signal.throwIfAborted();
      if (value.errors.length) throw Error(value.errors.join(" "));
      setProgress("Checking previous imports…");
      const eligible = value.entries.filter((e) => !e.errors.length);
      const [statuses, warnings] = await Promise.all([
        bundleStatuses(
          value.packageId,
          eligible.map((e) => e.tempId),
          c.signal,
        ),
        bundleWarnings(
          eligible.map((e) => ({
            temp_id: e.tempId,
            category_id: e.question!.category_id,
            names: [
              e.question!.correct_answer,
              ...(e.question!.identity?.aliases ?? []),
            ],
            wikidata_id: e.question!.identity?.wikidata_id ?? null,
            sha256: e.question!.image.sha256,
          })),
          c.signal,
        ),
      ]);
      const blocked = new Map<string, string>(),
        resumes = new Set<string>();
      for (const e of eligible) {
        e.warnings.push(...(warnings[e.tempId] ?? []));
        if (
          existing.some(
            (card) =>
              card.bundle?.package_id === value.packageId &&
              card.bundle.temp_id === e.tempId,
          )
        )
          blocked.set(
            e.tempId,
            "Already in local drafts; existing edits will be kept.",
          );
        else if (statuses[e.tempId]?.status === "committed")
          blocked.set(
            e.tempId,
            `Already added as question #${statuses[e.tempId].question_id}.`,
          );
        else if (statuses[e.tempId]?.status === "expired")
          blocked.set(
            e.tempId,
            "Previous operation expired. Review it in the original queue; do not reuse this package identity.",
          );
        else if (statuses[e.tempId]) {
          const draft = await filledDraft(value, e);
          const fingerprint = await importFingerprint(
            {
              id: draft.id,
              category_id: draft.category,
              difficulty_level_id: draft.difficulty,
              options: draft.options,
              correct_index: draft.correct!,
              source_hash: draft.processed!.sourceHash,
              allow_duplicate: false,
              bundle: draft.bundle,
              content_metadata: draft.contentMetadata,
            },
            draft.processed!.blob,
          );
          if (fingerprint === statuses[e.tempId].fingerprint) {
            resumes.add(e.tempId);
            e.warnings.push(
              "Unconfirmed upload found. Restoring this record only checks its status; retry explicitly to complete it.",
            );
          } else
            blocked.set(
              e.tempId,
              "This unconfirmed operation contains edits not present in this ZIP. Restore its original draft to retry safely.",
            );
        }
      }
      c.signal.throwIfAborted();
      setUnavailable(blocked);
      setResumable(resumes);
      setResult(value);
      setProgress(
        `Validation complete: ${eligible.length}/${value.entries.length} valid; ${blocked.size} previously opened or added.`,
      );
    } catch (e) {
      if (!c.signal.aborted) {
        setError(
          e instanceof Error ? e.message : "Package could not be checked.",
        );
        setProgress("");
      }
    } finally {
      active.current = false;
      if (!c.signal.aborted) setBusy(false);
    }
  }
  const selectable =
    result?.entries.filter(
      (e) =>
        !e.errors.length &&
        !unavailable.has(e.tempId) &&
        !existing.some(
          (c) =>
            c.bundle?.package_id === result.packageId &&
            c.bundle.temp_id === e.tempId,
        ),
    ) ?? [];
  async function createDrafts() {
    if (!result || active.current) return;
    active.current = true;
    setBusy(true);
    setError("");
    const c = controller.current!;
    try {
      const additions: QuestionDraft[] = [];
      for (const e of selectable.filter((e) => selected.has(e.tempId))) {
        const draft = await filledDraft(result, e);
        if (resumable.has(e.tempId)) {
          draft.locked = true;
          draft.phase = "Checking status";
        }
        additions.push(draft);
      }
      c.signal.throwIfAborted();
      if (!additions.length)
        throw Error("Select at least one available question.");
      if (
        existing.length + additions.length > 50 ||
        draftStorageBytes([...existing, ...additions]) > 50 * 1048576
      )
        throw Error(
          "Selection will not fit with existing drafts (50 cards / 50 MiB). Select fewer records, or restore and explicitly remove drafts to free space. Nothing has been removed.",
        );
      setProgress(`Saving ${additions.length} local drafts…`);
      await onImport(additions);
      c.signal.throwIfAborted();
      setSelected(new Set());
      setUnavailable(
        (previous) =>
          new Map([
            ...previous,
            ...additions.map(
              (card) =>
                [
                  card.bundle!.temp_id,
                  "Created in local drafts; review the card below.",
                ] as [string, string],
            ),
          ]),
      );
      setProgress(
        `Created ${additions.length} filled drafts. No questions were added to the bank. Review cards below and explicitly add your selection.`,
      );
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : "Drafts could not be saved.");
    } finally {
      active.current = false;
      if (!c.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="hq-bundle-panel" aria-label="Import question package">
      <h2>Import question package</h2>
      <p>
        Choose a prepared ZIP to validate its questions and create filled local
        drafts. Adding to the live bank is a separate action after review.
      </p>
      <label>
        Question package ZIP
        <input
          type="file"
          accept=".zip,application/zip"
          aria-label="Question package ZIP"
          disabled={disabled || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void open(file);
          }}
        />
      </label>
      <p>
        {existing.length}/50 existing cards ·{" "}
        {(draftStorageBytes(existing) / 1048576).toFixed(1)}/50 MiB of draft
        storage. XLSX is an optional review copy.
      </p>
      {progress && (
        <p role="status" aria-live="polite">
          {progress}
        </p>
      )}
      {error && (
        <p role="alert" className="hq-bank-warning">
          {error}
        </p>
      )}
      {result && (
        <>
          <p>
            <strong>{result.packageId}</strong> · {result.entries.length}{" "}
            records · {result.entries.filter((e) => e.errors.length).length}{" "}
            with errors
          </p>
          <div className="hq-bundle-actions">
            <button
              className="hq-secondary"
              disabled={busy || disabled || !selectable.length}
              onClick={() =>
                setSelected(new Set(selectable.map((e) => e.tempId)))
              }
            >
              Select all available records
            </button>
            <button
              className="hq-secondary"
              disabled={busy || !selected.size}
              onClick={() => setSelected(new Set())}
            >
              Clear package selection
            </button>
            <button
              className="hq-primary"
              disabled={busy || disabled || !selected.size}
              onClick={() => void createDrafts()}
            >
              Create {selected.size} local drafts
            </button>
          </div>
          <div className="hq-bundle-records" aria-label="Package records">
            {result.entries.map((e) => (
              <div className="hq-bundle-record" key={e.index}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Import ${e.tempId}`}
                    disabled={
                      busy || !!e.errors.length || !selectable.includes(e)
                    }
                    checked={selected.has(e.tempId)}
                    onChange={(event) =>
                      setSelected((previous) => {
                        const next = new Set(previous);
                        if (event.target.checked) next.add(e.tempId);
                        else next.delete(e.tempId);
                        return next;
                      })
                    }
                  />
                  <span>
                    {e.tempId} ·{" "}
                    {e.question?.correct_answer ?? "Invalid record"}
                  </span>
                </label>
                {e.errors.map((text, i) => (
                  <small key={`e${i}`}>Error: {text}</small>
                ))}
                {e.warnings.map((text, i) => (
                  <small key={`w${i}`}>Review: {text}</small>
                ))}
                {unavailable.get(e.tempId) && (
                  <small>{unavailable.get(e.tempId)}</small>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
