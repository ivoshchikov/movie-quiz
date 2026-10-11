import { useEffect, useRef, useState } from "react";
import type { BankQuestion, ImportPayload } from "./questionsApi";
import { changeQuestion, ImportError, sendImport } from "./questionsApi";
import { prepareImage } from "./prepareImage";
import type { ProcessedImage } from "./imageProcessing";
export default function QuestionEditor({
  row,
  done,
  cancel,
  reload,
  guard,
}: {
  row: BankQuestion;
  done: (deleted: boolean) => void;
  cancel: () => void;
  reload: () => void;
  guard: (check: (() => boolean) | null) => void;
}) {
  const [options, setOptions] = useState(() =>
    Array.from({ length: 4 }, (_, i) =>
      typeof row.options_json[i] === "string"
        ? (row.options_json[i] as string)
        : "",
    ),
  );
  const [correct, setCorrect] = useState(() =>
    row.options_json.findIndex(
      (s) => typeof s === "string" && s.trim() === row.correct_answer.trim(),
    ),
  );
  const [image, setImage] = useState<ProcessedImage | null>(null);
  const [preview, setPreview] = useState("");
  const [processing, setProcessing] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false),
    [duplicate, setDuplicate] = useState(false),
    [deleting, setDeleting] = useState(false),
    [locked, setLocked] = useState(false);
  const operation = useRef<{
    id: string;
    remove: boolean;
    options: string[];
    correct: number;
    image: ProcessedImage | null;
  } | null>(null);
  const controller = useRef<AbortController | null>(null),
    alive = useRef(true),
    inFlight = useRef(false);
  const dirty =
    !!image ||
    options.some((s, i) => s !== row.options_json[i]) ||
    row.options_json[correct] !== row.correct_answer;
  useEffect(() => {
    guard(
      () =>
        !busy &&
        !processing &&
        ((!dirty && !locked) ||
          window.confirm("Discard unsaved question changes?")),
    );
    return () => guard(null);
  }, [guard, busy, processing, dirty, locked]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || locked || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, locked, busy]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image.blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const chooseImage = async (file: File) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setProcessing(true);
    setMessage("");
    try {
      const result = await prepareImage(file, row.category_id ?? 1, c.signal);
      if (alive.current && !c.signal.aborted) setImage(result);
    } catch {
      if (alive.current && !c.signal.aborted)
        setMessage(
          "Image processing failed. Use JPEG, PNG or static WebP up to 20 MiB and 24 MP.",
        );
    } finally {
      if (alive.current && !c.signal.aborted) setProcessing(false);
    }
  };
  const valid =
    correct >= 0 &&
    correct < 4 &&
    options.every(
      (s) =>
        s.trim().length > 0 &&
        s.trim().length <= 200 &&
        !Array.from(s).some(
          (c) =>
            c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || c === "\ufffd",
        ),
    ) &&
    new Set(options.map((s) => s.trim().normalize("NFC").toLowerCase()))
      .size === 4;
  const save = async (remove: boolean, allowDuplicate = false) => {
    if (inFlight.current || processing || conflict || !row.admin_revision)
      return;
    if (!remove && !valid) {
      setMessage("Enter four different answers and choose the correct one.");
      return;
    }
    operation.current ??= {
      id: crypto.randomUUID(),
      remove,
      options: options.map((s) => s.trim().normalize("NFC")),
      correct,
      image,
    };
    const op = operation.current;
    inFlight.current = true;
    setBusy(true);
    setLocked(true);
    setMessage("");
    setDuplicate(false);
    const c = new AbortController();
    controller.current = c;
    const timer = window.setTimeout(() => c.abort(), 45000);
    try {
      if (!op.remove && op.image) {
        const payload: ImportPayload = {
          id: op.id,
          category_id: row.category_id ?? 1,
          difficulty_level_id: row.difficulty_level_id,
          options: op.options,
          correct_index: op.correct,
          source_hash: op.image.sourceHash,
          allow_duplicate: allowDuplicate,
          edit_question_id: row.id,
          edit_revision: row.admin_revision,
        };
        const saved = await sendImport(payload, op.image.blob, c.signal);
        if (saved.question_id !== row.id) throw new ImportError("unknown", "The update could not be confirmed. Retry the same operation.");
      } else
        await changeQuestion(
          op.id,
          row,
          op.remove ? null : op.options,
          op.remove ? null : op.correct,
          op.remove,
          c.signal,
        );
      if (alive.current) {
        setLocked(false);
        done(op.remove);
      }
    } catch (e) {
      if (alive.current) {
        const kind = e instanceof ImportError ? e.kind : "unknown";
        if (kind === "invalid") {
          operation.current = null;
          setLocked(false);
        }
        setConflict(kind === "conflict");
        setDuplicate(kind === "duplicate");
        setMessage(
          e instanceof ImportError
            ? e.message
            : "Saving could not be confirmed. Retry the same operation.",
        );
      }
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <section className="hq-question-editor" aria-label="Edit question">
      <h3>Edit question #{row.id}</h3>
      <p>
        Changes apply to new quizzes. Assigned Daily questions and started games
        keep their original answers. Unsaved edits are kept only while this
        window is open.
      </p>
      {!row.admin_revision && (
        <p role="alert">Editing is unavailable. Reload this question.</p>
      )}
      <fieldset disabled={busy || processing || locked || deleting}>
        <legend>Four answer options</legend>
        {options.map((value, i) => (
          <div className="hq-edit-answer" key={i}>
            <label>
              <input
                type="radio"
                name={`correct-${row.id}`}
                checked={correct === i}
                onChange={() => setCorrect(i)}
                aria-label={`Correct answer ${String.fromCharCode(65 + i)}`}
              />
              {String.fromCharCode(65 + i)}
            </label>
            <label>
              Answer {String.fromCharCode(65 + i)}
              <input
                value={value}
                maxLength={200}
                onChange={(e) =>
                  setOptions((old) =>
                    old.map((s, n) => (n === i ? e.target.value : s)),
                  )
                }
              />
            </label>
          </div>
        ))}
        <label>
          Replace image (optional)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void chooseImage(file);
              e.target.value = "";
            }}
          />
        </label>
        {preview && (
          <>
            <img
              className="hq-edit-preview"
              src={preview}
              alt="Replacement image preview"
            />
            <p>
              {image!.sourceBytes.toLocaleString()} →{" "}
              {image!.blob.size.toLocaleString()} bytes · {image!.width} ×{" "}
              {image!.height}
            </p>
            <button
              type="button"
              className="hq-secondary"
              onClick={() => setImage(null)}
            >
              Keep current image
            </button>
          </>
        )}
      </fieldset>
      {processing && <p role="status">Processing replacement image…</p>}
      {deleting && (
        <div className="hq-bank-warning">
          <h4>Delete question #{row.id}?</h4>
          <p>
            This removes it from the bank and new quizzes. Its record and images
            are retained for statistics, assigned Daily questions and started
            games.
          </p>
        </div>
      )}
      {message && <p role="alert">{message}</p>}
      {busy && (
        <p role="status">
          {deleting ? "Deleting question…" : "Saving changes…"}
        </p>
      )}
      <div className="hq-bank-detail-actions">
        {conflict ? (
          <button className="hq-primary" onClick={reload}>
            Reload question
          </button>
        ) : duplicate ? (
          <button
            className="hq-primary"
            disabled={busy}
            onClick={() => void save(false, true)}
          >
            Use duplicate image
          </button>
        ) : (
          <button
            className={deleting ? "hq-secondary hq-danger" : "hq-primary"}
            disabled={
              busy || processing || !row.admin_revision || (!deleting && !valid)
            }
            onClick={() => void save(deleting)}
          >
            {locked
              ? "Retry same operation"
              : deleting
                ? "Confirm deletion"
                : "Save changes"}
          </button>
        )}
        {!locked && (
          <button
            className="hq-secondary"
            disabled={busy || processing}
            onClick={() => {
              if (deleting) setDeleting(false);
              else if (
                !dirty ||
                window.confirm("Discard unsaved question changes?")
              )
                cancel();
            }}
          >
            {deleting ? "Keep question" : "Cancel editing"}
          </button>
        )}
        {!deleting && !locked && (
          <button
            className="hq-secondary hq-danger"
            disabled={busy || processing}
            onClick={() => setDeleting(true)}
          >
            Delete question
          </button>
        )}
      </div>
    </section>
  );
}
