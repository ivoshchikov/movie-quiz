import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getCategories, getDifficulties } from "../api";
import { categoryLabel } from "../hooks/useQuizCatalog";
import { useReadRequest } from "../hooks/useReadRequest";
import Seo from "../components/Seo";
import AdminAccess from "../admin/AdminAccess";
import { prepareImage } from "../admin/prepareImage";
import { imageLimit } from "../admin/imageProcessing";
import {
  draftKey,
  importStatus,
  sendImport,
  importFingerprint,
  cleanupImports,
  ImportError,
} from "../admin/questionsApi";
import type { ImportPayload, ImportStatus } from "../admin/questionsApi";
import { loadDrafts, saveDrafts, draftIsReady } from "../admin/questionDrafts";
import type { QuestionDraft } from "../admin/questionDrafts";
import "../admin-daily.css";
import "../admin-questions.css";

const bytes = (n: number) =>
  n >= 1048576
    ? `${(n / 1048576).toFixed(1)} MiB`
    : `${(n / 1024).toFixed(1)} KiB`;
export default function AdminQuestionsNewPage() {
  const { user } = useAuth();
  return (
    <>
      <Seo
        title="Add questions | Hard Quiz"
        description="Private question image upload and preview."
        url="https://hard-quiz.com/admin/questions/new"
        noindex
      />
      <AdminAccess>
        <QuestionUploader key={user?.id} owner={user?.id ?? ""} />
      </AdminAccess>
    </>
  );
}
function QuestionUploader({ owner }: { owner: string }) {
  const [cards, setCards] = useState<QuestionDraft[]>([]),
    cardsRef = useRef<QuestionDraft[]>([]);
  const [category, setCategory] = useState(1),
    [difficulty, setDifficulty] = useState(1);
  const [key, setKey] = useState<CryptoKey | null>(null),
    [canPersist, setCanPersist] = useState(false);
  const [saved, setSaved] = useState<QuestionDraft[]>([]),
    [draftMessage, setDraftMessage] = useState("Checking draft recovery…");
  const [notice, setNotice] = useState(""),
    [running, setRunning] = useState(false),
    [dragging, setDragging] = useState(false);
  const files = useRef(new Map<string, File>()),
    removed = useRef(new Set<string>()),
    mounted = useRef(true),
    processing = useRef(false),
    uploading = useRef(false);
  const lifetime = useRef(new AbortController()),
    processingAbort = useRef<AbortController | null>(null),
    requests = useRef(new Set<AbortController>()),
    saveGeneration = useRef(0);
  const mutate = useCallback(
    (update: (cards: QuestionDraft[]) => QuestionDraft[]) => {
      if (!mounted.current) return;
      cardsRef.current = update(cardsRef.current);
      setCards(cardsRef.current);
    },
    [],
  );
  const catalogLoad = useCallback(
    (signal: AbortSignal) =>
      Promise.all([getCategories(signal), getDifficulties(signal)]),
    [],
  );
  const catalog = useReadRequest(`${owner}:upload-catalog`, catalogLoad);
  const [categories, levels] = catalog.value ?? [[], []];
  useEffect(() => {
    const currentRequests = requests.current,
      currentFiles = files.current;
    mounted.current = true;
    lifetime.current = new AbortController();
    const signal = lifetime.current.signal;
    void draftKey(signal)
      .then(async (secret) => {
        const drafts = await loadDrafts(owner, secret);
        if (!mounted.current || signal.aborted) return;
        setKey(secret);
        setSaved(drafts);
        setCanPersist(true);
        setDraftMessage(
          drafts.length
            ? "Saved drafts are available to restore."
            : "Drafts will be saved securely in this browser.",
        );
      })
      .catch(() => {
        if (mounted.current && !signal.aborted)
          setDraftMessage(
            "Draft recovery is unavailable. Keep this tab open until saving is confirmed. Existing saved drafts have been kept.",
          );
      });
    void cleanupImports(signal).catch(() => {});
    return () => {
      mounted.current = false;
      lifetime.current.abort();
      processingAbort.current?.abort();
      for (const request of currentRequests) request.abort();
      currentFiles.clear();
    };
  }, [owner]);
  useEffect(() => {
    if (!key || !canPersist || !cards.length) return;
    const generation = ++saveGeneration.current;
    const timer = setTimeout(() => {
      void saveDrafts(owner, key, cards, [...removed.current])
        .then(() => {
          if (mounted.current && saveGeneration.current === generation)
            setDraftMessage("Drafts saved securely in this browser.");
        })
        .catch((error) => {
          if (mounted.current && saveGeneration.current === generation)
            setDraftMessage(
              error instanceof Error
                ? error.message
                : "Draft saving is unavailable. Keep this tab open.",
            );
        });
    }, 700);
    return () => clearTimeout(timer);
  }, [cards, key, canPersist, owner]);
  async function drain() {
    if (processing.current) return;
    processing.current = true;
    try {
      while (mounted.current) {
        const card = cardsRef.current.find(
          (c) => c.phase === "Processing" && !c.locked,
        );
        if (!card) break;
        const original = files.current.get(card.id),
          previous = card.processed;
        const file =
          original ??
          (previous
            ? new File([previous.blob], card.name, { type: "image/webp" })
            : null);
        if (!file) {
          mutate((all) =>
            all.map((c) =>
              c.id === card.id
                ? {
                    ...c,
                    phase: "Draft",
                    message: "Attach this image again to continue.",
                  }
                : c,
            ),
          );
          continue;
        }
        const controller = new AbortController();
        processingAbort.current = controller;
        try {
          const value = await prepareImage(
            file,
            card.category,
            controller.signal,
          );
          mutate((all) =>
            all.map((c) =>
              c.id === card.id && c.category === card.category
                ? {
                    ...c,
                    phase: "Ready",
                    processed: previous
                      ? {
                          ...value,
                          sourceHash: previous.sourceHash,
                          sourceBytes: previous.sourceBytes,
                          sourceWidth: previous.sourceWidth,
                          sourceHeight: previous.sourceHeight,
                        }
                      : value,
                    message: undefined,
                  }
                : c,
            ),
          );
        } catch (error) {
          if (mounted.current)
            mutate((all) =>
              all.map((c) =>
                c.id === card.id && c.category === card.category
                  ? {
                      ...c,
                      phase: "Failed",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Image processing failed.",
                    }
                  : c,
              ),
            );
        }
      }
    } finally {
      processing.current = false;
      processingAbort.current = null;
    }
  }
  function addFiles(incoming: File[]) {
    if (catalog.loading || catalog.error) {
      setNotice(
        "Wait for category and difficulty settings before attaching images.",
      );
      return;
    }
    setNotice("");
    const room = 50 - cardsRef.current.length;
    const accepted = incoming.slice(0, Math.max(0, room));
    if (accepted.length < incoming.length)
      setNotice(
        "A queue can contain up to 50 questions. Clear added cards before attaching more.",
      );
    const additions = accepted.map((file) => {
      const id = crypto.randomUUID();
      files.current.set(id, file);
      return {
        id,
        createdAt: Date.now(),
        name: file.name || "Pasted image",
        category,
        difficulty,
        options: ["", "", "", ""],
        correct: null,
        phase: "Processing",
        categoryOverride: false,
        difficultyOverride: false,
        locked: false,
      } as QuestionDraft;
    });
    mutate((all) => [...all, ...additions]);
    void drain();
  }
  function setCardCategory(id: string, value: number, override = true) {
    mutate((all) =>
      all.map((c) =>
        c.id === id && !c.locked
          ? {
              ...c,
              category: value,
              categoryOverride: override,
              phase:
                c.processed &&
                Math.max(c.processed.width, c.processed.height) <=
                  imageLimit(value) &&
                !files.current.has(id)
                  ? "Ready"
                  : "Processing",
            }
          : c,
      ),
    );
    void drain();
  }
  function commonCategory(value: number) {
    setCategory(value);
    for (const c of cardsRef.current)
      if (!c.categoryOverride && !c.locked) setCardCategory(c.id, value, false);
  }
  function commonDifficulty(value: number) {
    setDifficulty(value);
    mutate((all) =>
      all.map((c) =>
        !c.difficultyOverride && !c.locked ? { ...c, difficulty: value } : c,
      ),
    );
  }
  const payload = (card: QuestionDraft): ImportPayload => ({
    id: card.id,
    category_id: card.category,
    difficulty_level_id: card.difficulty,
    options: card.options,
    correct_index: card.correct!,
    source_hash: card.processed!.sourceHash,
    allow_duplicate: card.allowDuplicate === true,
  });
  async function readStatus(card: QuestionDraft): Promise<ImportStatus | null> {
    const controller = new AbortController();
    requests.current.add(controller);
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      return await importStatus(card.id, controller.signal);
    } finally {
      clearTimeout(timer);
      requests.current.delete(controller);
    }
  }
  async function applyStatus(card: QuestionDraft, status: ImportStatus | null) {
    if (!status) return false;
    if (
      status.fingerprint &&
      card.processed &&
      status.fingerprint !==
        (await importFingerprint(payload(card), card.processed.blob))
    ) {
      mutate((all) =>
        all.map((c) =>
          c.id === card.id
            ? {
                ...c,
                phase: "Failed",
                locked: true,
                questionId: status.question_id ?? undefined,
                imagePath: status.image_path,
                message:
                  "This draft changed in another tab. Review the saved question or check the original tab before continuing.",
              }
            : c,
        ),
      );
      return true;
    }
    if (status.status === "committed") {
      files.current.delete(card.id);
      mutate((all) =>
        all.map((c) =>
          c.id === card.id
            ? {
                ...c,
                phase: "Added",
                locked: true,
                questionId: status.question_id!,
                imagePath: status.image_path,
                message: "Image and question saved.",
              }
            : c,
        ),
      );
      return true;
    }
    if (status.status === "expired") {
      mutate((all) =>
        all.map((c) =>
          c.id === card.id
            ? {
                ...c,
                phase: "Failed",
                locked: false,
                message:
                  "This saved operation expired. Reattach the image as a new question.",
              }
            : c,
        ),
      );
      return true;
    }
    return false;
  }
  async function check(card: QuestionDraft) {
    mutate((all) =>
      all.map((c) =>
        c.id === card.id
          ? { ...c, phase: "Checking status", message: "Checking the server…" }
          : c,
      ),
    );
    try {
      const status = await readStatus(card);
      if (await applyStatus(card, status)) return;
      mutate((all) =>
        all.map((c) =>
          c.id === card.id
            ? {
                ...c,
                phase: "Failed",
                message: status
                  ? "Saving is not confirmed yet. Retry this operation."
                  : "No saved question is confirmed. Retry this operation.",
              }
            : c,
        ),
      );
    } catch {
      mutate((all) =>
        all.map((c) =>
          c.id === card.id
            ? {
                ...c,
                phase: "Checking status",
                message:
                  "Status could not be checked. Try again when the connection returns.",
              }
            : c,
        ),
      );
    }
  }
  async function run(ids: string[]) {
    if (uploading.current) return;
    uploading.current = true;
    setRunning(true);
    mutate((all) =>
      all.map((c) =>
        ids.includes(c.id) && draftIsReady(c)
          ? {
              ...c,
              locked: true,
              phase: "Checking status",
              message: "Checking the server before saving…",
            }
          : c,
      ),
    );
    if (key && canPersist)
      try {
        await saveDrafts(owner, key, cardsRef.current, [...removed.current]);
      } catch {
        if (mounted.current)
          setDraftMessage(
            "Draft saving failed. Keep this tab open until all additions are confirmed.",
          );
      }
    const pending = [...ids];
    const next = async () => {
      while (mounted.current && pending.length) {
        const id = pending.shift()!,
          card = cardsRef.current.find((c) => c.id === id);
        if (
          !card ||
          !draftIsReady(card) ||
          card.phase === "Added" ||
          card.questionId
        )
          continue;
        try {
          const status = await readStatus(card);
          if (await applyStatus(card, status)) continue;
          mutate((all) =>
            all.map((c) =>
              c.id === id
                ? {
                    ...c,
                    phase: "Uploading",
                    message: "Uploading image and saving question…",
                  }
                : c,
            ),
          );
          const controller = new AbortController();
          requests.current.add(controller);
          const timer = setTimeout(() => controller.abort(), 45000);
          try {
            const saved = await sendImport(
              payload(card),
              card.processed!.blob,
              controller.signal,
            );
            await applyStatus(card, saved);
          } finally {
            clearTimeout(timer);
            requests.current.delete(controller);
          }
        } catch (error) {
          if (!mounted.current) break;
          if (error instanceof ImportError && error.kind === "duplicate") {
            mutate((all) =>
              all.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      phase: "Failed",
                      duplicate: true,
                      locked: false,
                      message: `This image is already in the bank or upload queue${error.questionId ? ` (question #${error.questionId})` : ""}. Add it again only if you intend to create another question.`,
                    }
                  : c,
              ),
            );
            continue;
          }
          try {
            const status = await readStatus(card);
            if (await applyStatus(card, status)) continue;
            mutate((all) =>
              all.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      phase:
                        error instanceof ImportError && error.kind === "invalid"
                          ? "Failed"
                          : "Checking status",
                      locked: !(
                        error instanceof ImportError &&
                        error.kind === "invalid" &&
                        !status
                      ),
                      message:
                        error instanceof ImportError
                          ? error.message
                          : "Saving could not be confirmed. Check status or retry.",
                    }
                  : c,
              ),
            );
          } catch {
            mutate((all) =>
              all.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      phase: "Checking status",
                      message:
                        "Saving could not be confirmed. Check status or retry when the connection returns.",
                    }
                  : c,
              ),
            );
          }
        }
      }
    };
    try {
      await Promise.all([next(), next()]);
    } finally {
      uploading.current = false;
      if (mounted.current) setRunning(false);
    }
  }
  const ready = cards.filter(
    (c) => !c.locked && !c.duplicate && c.phase === "Ready" && draftIsReady(c),
  );
  const failed = cards.filter(
    (c) => c.locked && !c.questionId && c.phase !== "Added" && draftIsReady(c),
  );
  function discard(id: string) {
    removed.current.add(id);
    files.current.delete(id);
    mutate((all) => all.filter((c) => c.id !== id));
    if (key && canPersist)
      void saveDrafts(owner, key, cardsRef.current, [...removed.current]).catch(
        () => {},
      );
  }
  return (
    <section
      className="hq-admin hq-bank hq-question-upload"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(Array.from(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        const images = Array.from(e.clipboardData.files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (images.length) {
          e.preventDefault();
          addFiles(images);
        }
      }}
    >
      <div className="hq-bank-heading">
        <div>
          <h1>Add questions</h1>
          <p>
            Attach images, review four answers, then add the ready questions.
          </p>
        </div>
        <Link className="hq-secondary" to="/admin/questions">
          Back to bank
        </Link>
      </div>
      {catalog.error ? (
        <p role="alert">
          Settings could not load.{" "}
          <button className="hq-secondary" onClick={catalog.retry}>
            Retry settings
          </button>
        </p>
      ) : (
        <div className="hq-upload-defaults">
          <label>
            Default category
            <select
              aria-label="Default category"
              value={category}
              onChange={(e) => commonCategory(Number(e.target.value))}
            >
              {categories
                .filter((c) => [1, 2, 3, 4].includes(c.id))
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {categoryLabel(c)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Default difficulty
            <select
              aria-label="Default difficulty"
              value={difficulty}
              onChange={(e) => commonDifficulty(Number(e.target.value))}
            >
              {levels.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <p>Defaults apply to cards without an individual override.</p>
        </div>
      )}
      <label className={`hq-upload-drop${dragging ? " is-dragging" : ""}`}>
        <strong>Choose images or drop them here</strong>
        <span>
          You can also paste an image. JPEG, PNG or static WebP · up to 20 MiB
          and 24 MP per source.
        </span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose images"
          disabled={catalog.loading || catalog.error || cards.length >= 50}
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      <div className="hq-upload-drafts">
        <p role="status">{draftMessage}</p>
        <p>
          Recovery: same browser and account, up to 7 days and 50 MiB. Drafts
          store processed images. Clearing browser data removes recovery. Avoid
          editing the same card in two tabs.
        </p>
        {saved.length > 0 && (
          <button
            className="hq-secondary"
            onClick={() => {
              const existing = new Set(cardsRef.current.map((c) => c.id));
              const restored = saved
                .filter((c) => !existing.has(c.id))
                .slice(0, 50 - cardsRef.current.length);
              mutate((all) => [...all, ...restored].slice(0, 50));
              setSaved([]);
              for (const card of restored) if (card.locked) void check(card);
            }}
          >
            Restore {saved.length} saved drafts
          </button>
        )}
      </div>
      {notice && <p role="alert">{notice}</p>}
      <div className="hq-upload-toolbar">
        <span>
          {cards.length} cards ·{" "}
          {cards.filter((c) => c.phase === "Added").length} added
        </span>
        <button
          className="hq-primary"
          disabled={running || !ready.length}
          onClick={() => void run(ready.map((c) => c.id))}
        >
          {running
            ? "Saving questions…"
            : `Add ${ready.length} ready question${ready.length === 1 ? "" : "s"}`}
        </button>
        {failed.length > 0 && (
          <button
            className="hq-secondary"
            disabled={running}
            onClick={() => void run(failed.map((c) => c.id))}
          >
            Retry unconfirmed questions
          </button>
        )}
        {cards.some((c) => c.phase === "Added" || c.questionId) && (
          <button
            className="hq-inline-action"
            disabled={running}
            onClick={() => {
              for (const c of cardsRef.current)
                if (c.phase === "Added" || c.questionId) discard(c.id);
            }}
          >
            Clear added cards
          </button>
        )}
      </div>
      {cards.length === 0 ? (
        <div className="hq-bank-state">
          <h2>Your upload queue is empty</h2>
          <p>
            Choose one image to create a question, or attach several to prepare
            a batch.
          </p>
        </div>
      ) : (
        <div className="hq-upload-grid">
          {cards.map((card, index) => (
            <DraftCard
              key={card.id}
              card={card}
              index={index}
              categories={categories}
              levels={levels}
              running={running}
              change={(update) =>
                mutate((all) =>
                  all.map((c) =>
                    c.id === card.id && !c.locked
                      ? {
                          ...c,
                          ...update,
                          ...(c.processed && c.phase !== "Processing"
                            ? { phase: "Ready" as const, message: undefined }
                            : {}),
                        }
                      : c,
                  ),
                )
              }
              categoryChange={(value) => setCardCategory(card.id, value)}
              attach={(file) => {
                files.current.set(card.id, file);
                mutate((all) =>
                  all.map((c) =>
                    c.id === card.id
                      ? {
                          ...c,
                          processed: undefined,
                          phase: "Processing",
                          name: file.name,
                          message: undefined,
                        }
                      : c,
                  ),
                );
                void drain();
              }}
              remove={() => discard(card.id)}
              retry={() => void run([card.id])}
              check={() => void check(card)}
              allowDuplicate={() => {
                mutate((all) =>
                  all.map((c) =>
                    c.id === card.id
                      ? { ...c, allowDuplicate: true, duplicate: false }
                      : c,
                  ),
                );
                void run([card.id]);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
function DraftCard({
  card,
  index,
  categories,
  levels,
  running,
  change,
  categoryChange,
  attach,
  remove,
  retry,
  check,
  allowDuplicate,
}: {
  card: QuestionDraft;
  index: number;
  categories: { id: number; name: string }[];
  levels: { id: number; name: string }[];
  running: boolean;
  change: (update: Partial<QuestionDraft>) => void;
  categoryChange: (value: number) => void;
  attach: (file: File) => void;
  remove: () => void;
  retry: () => void;
  check: () => void;
  allowDuplicate: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!card.processed) {
      setUrl("");
      return;
    }
    const url = URL.createObjectURL(card.processed.blob);
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [card.processed]);
  return (
    <article className="hq-upload-card" aria-label={`Upload card ${index + 1}`}>
      <header>
        <h2>Question {index + 1}</h2>
        <span
          className={`hq-upload-status phase-${card.phase.toLowerCase().replace(/ /g, "-")}`}
        >
          {card.phase === "Ready" && !draftIsReady(card) ? "Draft" : card.phase}
        </span>
      </header>
      <p className="hq-upload-file">{card.name}</p>
      {url ? (
        <img
          className="hq-upload-preview"
          src={url}
          alt={`Processed preview for question ${index + 1}`}
          loading="lazy"
        />
      ) : (
        <div className="hq-upload-preview hq-upload-image-state" role="status">
          {card.phase === "Processing"
            ? "Processing image…"
            : "Image not ready"}
        </div>
      )}
      {!card.imagePath && (
        <p className="hq-upload-file">
          A unique image path is assigned when you add this question.
        </p>
      )}
      {card.imagePath && (
        <p className="hq-upload-file">
          <code>{card.imagePath}</code>
        </p>
      )}
      {card.processed && (
        <p className="hq-upload-size">
          {bytes(card.processed.sourceBytes)} →{" "}
          <strong>{bytes(card.processed.blob.size)}</strong>
          <br />
          {card.processed.sourceWidth} × {card.processed.sourceHeight} →{" "}
          {card.processed.width} × {card.processed.height} · WebP
        </p>
      )}
      <fieldset
        disabled={card.locked || running || card.phase === "Processing"}
      >
        <legend className="sr-only">
          Question {index + 1} settings and answers
        </legend>
        <div className="hq-upload-card-settings">
          <label>
            Category
            <select
              aria-label="Category"
              value={card.category}
              onChange={(e) => categoryChange(Number(e.target.value))}
            >
              {categories
                .filter((c) => [1, 2, 3, 4].includes(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryLabel(c)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Difficulty
            <select
              aria-label="Difficulty"
              value={card.difficulty}
              onChange={(e) =>
                change({
                  difficulty: Number(e.target.value),
                  difficultyOverride: true,
                })
              }
            >
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hq-upload-answer-help">
          Enter four different answers and select the correct one.
        </p>
        <div className="hq-upload-answer-fields">
          {card.options.map((answer, i) => (
            <div key={i}>
              <input
                type="radio"
                name={`correct-${card.id}`}
                checked={card.correct === i}
                onChange={() => change({ correct: i })}
                aria-label={`Mark answer ${String.fromCharCode(65 + i)} correct for question ${index + 1}`}
              />
              <label>
                <span>Answer {String.fromCharCode(65 + i)}</span>
                <input
                  maxLength={200}
                  value={answer}
                  onChange={(e) =>
                    change({
                      options: card.options.map((s, n) =>
                        n === i ? e.target.value : s,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
        </div>
      </fieldset>
      {card.message && (
        <p
          className={card.phase === "Failed" ? "hq-bank-warning" : ""}
          role={card.phase === "Failed" ? "alert" : "status"}
        >
          {card.message}
        </p>
      )}
      <div className="hq-upload-card-actions">
        {card.questionId && (
          <Link
            className="hq-inline-action"
            to={`/admin/questions?question=${card.questionId}`}
          >
            View saved question #{card.questionId}
          </Link>
        )}
        {!card.locked && (
          <button
            className="hq-inline-action"
            disabled={running}
            onClick={remove}
          >
            Remove draft
          </button>
        )}
        {!card.locked && !card.processed && card.phase !== "Processing" && (
          <label className="hq-inline-action">
            Attach image again
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={`Attach image for question ${index + 1}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) attach(file);
              }}
            />
          </label>
        )}
        {card.locked && card.phase !== "Added" && !card.questionId && (
          <>
            <button className="hq-secondary" disabled={running} onClick={check}>
              Check status
            </button>
            <button className="hq-secondary" disabled={running} onClick={retry}>
              Retry this question
            </button>
          </>
        )}
        {card.duplicate && (
          <button
            className="hq-secondary"
            disabled={running || !draftIsReady(card)}
            onClick={allowDuplicate}
          >
            Add this image again
          </button>
        )}
      </div>
    </article>
  );
}
