import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getCategories, getDifficultyLevels } from "../api";
import Seo from "../components/Seo";
import { useReadRequest, READ_TIMEOUT } from "../hooks/useReadRequest";
import { categoryLabel } from "../hooks/useQuizCatalog";
import { dailyDate, dailyDateLabel } from "../daily/time";
import AdminImage from "../admin/AdminImage";
import {
  checkAdminRights,
  getAdminAssignment,
  getAdminHistory,
  getAdminQuestion,
  searchAdminQuestions,
  saveAdminAssignment,
  validDailyDate,
  HISTORY_PAGE_SIZE,
  SEARCH_LIMIT,
} from "../admin/dailyApi";
import type { AdminQuestionPreview, DailyAssignment } from "../admin/dailyApi";
import type { DailyHistoryRow } from "../api";
import metadata from "../adminDailyMetadata.json";
import "../admin-daily.css";

type SaveStatus = {
  kind: "idle" | "saving" | "success" | "error" | "unknown";
  message: string;
};
type SaveSnapshot = {
  date: string;
  expected: DailyAssignment;
  question: AdminQuestionPreview;
};
const idle: SaveStatus = { kind: "idle", message: "" };
const sameQuestion = (a: AdminQuestionPreview, b: AdminQuestionPreview) =>
  a.id === b.id &&
  a.image_url === b.image_url &&
  a.correct_answer === b.correct_answer &&
  a.category_id === b.category_id &&
  a.difficulty_level_id === b.difficulty_level_id &&
  JSON.stringify(a.options) === JSON.stringify(b.options);

export default function AdminDailyPage() {
  const { user, loading, error, retrySession } = useAuth();
  const owner = user?.id ?? "";
  const loadRights = useCallback(
    (signal: AbortSignal) => checkAdminRights(signal),
    [],
  );
  const rights = useReadRequest(
    owner,
    loadRights,
    !!owner && !loading && !error,
  );
  return (
    <>
      <Seo
        title={metadata.title}
        description={metadata.description}
        url={metadata.url}
        noindex
      />
      {error ? (
        <div className="hq-admin hq-admin-access">
          <h1>Check your account</h1>
          <p role="alert">Your sign-in status could not be checked.</p>
          <button className="hq-secondary" onClick={retrySession}>
            Retry account check
          </button>
        </div>
      ) : loading || (owner && rights.loading) ? (
        <div className="hq-admin hq-admin-access">
          <h1>Daily administration</h1>
          <p role="status">Checking administrator access…</p>
        </div>
      ) : !owner ? (
        <div className="hq-admin hq-admin-access">
          <h1>Daily administration</h1>
          <p>
            Log in with an administrator account to manage the Daily Challenge.
          </p>
          <Link className="hq-primary" to="/login?redirect=%2Fadmin%2Fdaily">
            Log in to manage Daily
          </Link>
        </div>
      ) : rights.error ? (
        <div className="hq-admin hq-admin-access">
          <h1>Daily administration</h1>
          <p role="alert">Administrator access could not be checked.</p>
          <button className="hq-secondary" onClick={rights.retry}>
            Retry access check
          </button>
        </div>
      ) : !rights.value ? (
        <div className="hq-admin hq-admin-access">
          <h1>Administrator access required</h1>
          <p>This account cannot manage Daily questions.</p>
          <Link className="hq-inline-action" to="/">
            Back to quizzes
          </Link>
        </div>
      ) : (
        <AdminDailyWorkspace
          key={owner}
          owner={owner}
          onRightsLost={rights.retry}
        />
      )}
    </>
  );
}

function AdminDailyWorkspace({
  owner,
  onRightsLost,
}: {
  owner: string;
  onRightsLost: () => void;
}) {
  const [today, setToday] = useState(dailyDate);
  const [date, setDate] = useState(dailyDate);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [manualId, setManualId] = useState("");
  const [idError, setIdError] = useState("");
  const [imageReady, setImageReady] = useState({ key: "", ready: false });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(idle);
  const [confirmation, setConfirmation] = useState<SaveSnapshot | null>(null);
  const [checkingSave, setCheckingSave] = useState(false);
  const [historyStep, setHistoryStep] = useState({ page: 0, revision: 0 });
  const [historyRows, setHistoryRows] = useState<DailyHistoryRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const operation = useRef(0),
    busy = useRef(false),
    lastWrite = useRef<SaveSnapshot | null>(null);
  const cancelReplacement = useRef<HTMLButtonElement>(null);
  const controllers = useRef(new Set<AbortController>());
  const context = useRef({ date, selectedId });
  context.current = { date, selectedId };

  useEffect(() => {
    const update = () => setToday(dailyDate());
    const timer = window.setInterval(update, 60000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    const pending = controllers.current,
      revision = operation;
    return () => {
      revision.current++;
      pending.forEach((controller) => controller.abort());
    };
  }, []);
  useEffect(() => {
    setConfirmation(null);
    setSaveStatus(idle);
  }, [date, selectedId]);
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadCatalog = useCallback(async (signal: AbortSignal) => {
    const [categories, difficulties] = await Promise.all([
      getCategories(signal),
      getDifficultyLevels(signal),
    ]);
    if (
      ![...categories, ...difficulties].every(
        (row) =>
          Number.isSafeInteger(row.id) &&
          row.id > 0 &&
          typeof row.name === "string" &&
          row.name.trim(),
      )
    )
      throw new Error("invalid-admin-catalog");
    return { categories, difficulties };
  }, []);
  const catalog = useReadRequest(owner, loadCatalog);
  const loadSearch = useCallback(
    (signal: AbortSignal) => searchAdminQuestions(term, signal),
    [term],
  );
  const results = useReadRequest(`${owner}:${term}`, loadSearch, !!term);
  const loadPreview = useCallback(
    (signal: AbortSignal) => getAdminQuestion(selectedId!, signal),
    [selectedId],
  );
  const preview = useReadRequest(
    `${owner}:${selectedId}`,
    loadPreview,
    selectedId !== null,
  );
  const loadAssignment = useCallback(
    (signal: AbortSignal) => getAdminAssignment(date, signal),
    [date],
  );
  const assignment = useReadRequest(
    `${owner}:${date}`,
    loadAssignment,
    validDailyDate(date),
  );
  const currentId = assignment.value?.question_id ?? null;
  const loadCurrent = useCallback(
    (signal: AbortSignal) => getAdminQuestion(currentId!, signal),
    [currentId],
  );
  const current = useReadRequest(
    `${owner}:${date}:${currentId}`,
    loadCurrent,
    currentId !== null,
  );
  const loadHistory = useCallback(
    (signal: AbortSignal) =>
      getAdminHistory(historyStep.page * HISTORY_PAGE_SIZE, signal),
    [historyStep.page],
  );
  const history = useReadRequest(
    `${owner}:${historyStep.page}:${historyStep.revision}`,
    loadHistory,
  );
  useEffect(() => {
    if (!history.value || history.loading || history.error) return;
    const rows = history.value;
    setHistoryRows((previous) =>
      [
        ...new Map(
          [...(historyStep.page === 0 ? [] : previous), ...rows].map((row) => [
            row.d,
            row,
          ]),
        ).values(),
      ].sort((a, b) => b.d.localeCompare(a.d)),
    );
  }, [history.value, history.loading, history.error, historyStep.page]);

  const category = (id: number) => {
    const row = catalog.value?.categories.find((value) => value.id === id);
    return row ? categoryLabel(row) : `Category ${id}`;
  };
  const difficulty = (id: number) =>
    catalog.value?.difficulties.find((row) => row.id === id)?.name ??
    `Difficulty ${id}`;
  const imageKey = `${selectedId}:${preview.value?.image_url ?? ""}`;
  const locked = saveStatus.kind === "saving" || saveStatus.kind === "unknown";
  const canSave =
    validDailyDate(date) &&
    date >= today &&
    !!assignment.value &&
    !assignment.loading &&
    !assignment.error &&
    assignment.value.attempt_count === 0 &&
    !!preview.value &&
    !preview.loading &&
    !preview.error &&
    imageReady.key === imageKey &&
    imageReady.ready &&
    currentId !== selectedId &&
    !locked;
  const refreshHistory = () =>
    setHistoryStep((previous) => ({
      page: 0,
      revision: previous.revision + 1,
    }));
  const matches = (snapshot: SaveSnapshot, version: number) =>
    operation.current === version &&
    context.current.date === snapshot.date &&
    context.current.selectedId === snapshot.question.id;
  async function timed<T>(
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    controllers.current.add(controller);
    const timer = window.setTimeout(() => controller.abort(), READ_TIMEOUT);
    try {
      return await work(controller.signal);
    } finally {
      window.clearTimeout(timer);
      controllers.current.delete(controller);
    }
  }
  function acknowledge(snapshot: SaveSnapshot, saved: DailyAssignment) {
    assignment.confirm(saved);
    lastWrite.current = null;
    setSaveStatus({
      kind: "success",
      message: `Saved: ${snapshot.question.correct_answer} for ${dailyDateLabel(snapshot.date)}.`,
    });
    refreshHistory();
  }
  async function save(snapshot: SaveSnapshot) {
    if (busy.current || !canSave || !matches(snapshot, operation.current))
      return;
    busy.current = true;
    const version = ++operation.current;
    setConfirmation(null);
    setSaveStatus({
      kind: "saving",
      message: "Checking and saving the Daily question…",
    });
    let sent = false;
    try {
      await timed(async (signal) => {
        if (!(await checkAdminRights(signal))) {
          onRightsLost();
          throw new Error("admin-rights-lost");
        }
        const latest = await getAdminAssignment(snapshot.date, signal);
        if (
          latest.question_id !== snapshot.expected.question_id ||
          latest.version !== snapshot.expected.version ||
          latest.attempt_count > 0 ||
          snapshot.date < dailyDate()
        ) {
          if (matches(snapshot, version)) assignment.confirm(latest);
          throw new Error("assignment-changed");
        }
        const question = await getAdminQuestion(snapshot.question.id, signal);
        if (!question || !sameQuestion(question, snapshot.question)) {
          if (matches(snapshot, version)) preview.retry();
          throw new Error("question-changed");
        }
      });
      if (!matches(snapshot, version)) return;
      lastWrite.current = snapshot;
      sent = true;
      const saved = await timed((signal) =>
        saveAdminAssignment(
          snapshot.date,
          snapshot.question,
          snapshot.expected,
          owner,
          signal,
        ),
      );
      if (matches(snapshot, version)) acknowledge(snapshot, saved);
    } catch (error) {
      if (!matches(snapshot, version)) return;
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      const rejected = /^(?:PGRST\d+|[0-9A-Z]{5})$/.test(code);
      if (sent) {
        try {
          const observed = await timed((signal) =>
            getAdminAssignment(snapshot.date, signal),
          );
          if (!matches(snapshot, version)) return;
          if (observed.question_id === snapshot.question.id) {
            acknowledge(snapshot, observed);
            return;
          }
          assignment.confirm(observed);
        } catch {
          /* A lost response is not proof that the write failed. */
        }
      }
      if (!matches(snapshot, version)) return;
      if (sent && !rejected)
        setSaveStatus({
          kind: "unknown",
          message:
            "The save could not be confirmed. Check its status before making another change.",
        });
      else {
        lastWrite.current = null;
        setSaveStatus({
          kind: "error",
          message:
            (error instanceof Error &&
              /assignment-changed|question-changed/.test(error.message)) ||
            code === "P0001"
              ? "The question or assignment changed. Review the latest details before saving again."
              : "The Daily question could not be saved. Check access and the current assignment, then try again.",
        });
        assignment.retry();
      }
    } finally {
      if (operation.current === version) busy.current = false;
    }
  }
  async function checkSave() {
    const snapshot = lastWrite.current;
    if (!snapshot || busy.current) return;
    busy.current = true;
    setCheckingSave(true);
    const version = operation.current;
    try {
      const observed = await timed((signal) =>
        getAdminAssignment(snapshot.date, signal),
      );
      if (!matches(snapshot, version)) return;
      assignment.confirm(observed);
      if (observed.question_id === snapshot.question.id)
        acknowledge(snapshot, observed);
      else
        setSaveStatus({
          kind: "unknown",
          message:
            "The save is still unconfirmed. The latest assignment is shown above. No further save has been sent.",
        });
    } catch {
      if (matches(snapshot, version))
        setSaveStatus({
          kind: "unknown",
          message:
            "The save status could not be checked. Try checking again when the connection is available.",
        });
    } finally {
      if (operation.current === version) {
        busy.current = false;
        setCheckingSave(false);
      }
    }
  }
  const requestSave = () => {
    if (!canSave || !preview.value || !assignment.value) return;
    const snapshot = {
      date,
      expected: assignment.value,
      question: preview.value,
    };
    if (assignment.value.question_id !== null) setConfirmation(snapshot);
    else void save(snapshot);
  };
  const invalidRange =
    (!!from && !validDailyDate(from)) ||
    (!!to && !validDailyDate(to)) ||
    (!!from && !!to && from > to);
  const filtered = invalidRange
    ? []
    : historyRows.filter(
        (row) => (!from || row.d >= from) && (!to || row.d <= to),
      );
  const searchPending = search.trim() !== term || results.loading;
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return (
    <div className="hq-admin">
      <header className="hq-admin-heading">
        <p className="hq-eyebrow">Administration</p>
        <h1>Daily Challenge</h1>
        <p>Choose a question, review it, and manage the schedule.</p>
        <p className="hq-admin-help">
          Today: {dailyDateLabel(today)} · US Central time (America/Chicago)
        </p>
      </header>
      <section className="hq-admin-section" aria-labelledby="daily-date-title">
        <h2 id="daily-date-title">1. Choose a date</h2>
        <div className="hq-admin-date-controls">
          <div className="hq-admin-field">
            <label htmlFor="daily-date">Daily date</label>
            <input
              id="daily-date"
              type="date"
              value={date}
              disabled={locked}
              onChange={(event) => setDate(event.target.value)}
              aria-describedby="daily-timezone"
            />
          </div>
          <button
            className="hq-secondary"
            disabled={locked}
            onClick={() => setDate(today)}
          >
            Today
          </button>
          <button
            className="hq-secondary"
            disabled={locked}
            onClick={() => setDate(tomorrow.toISOString().slice(0, 10))}
          >
            Tomorrow
          </button>
        </div>
        <p id="daily-timezone" className="hq-admin-help">
          Dates follow US Central time. Your selected date stays unchanged when
          a new day begins.
        </p>
        {!validDailyDate(date) ? (
          <p role="alert">Choose a valid date.</p>
        ) : assignment.loading ? (
          <p role="status">Checking the assignment for this date…</p>
        ) : assignment.error ? (
          <div className="hq-admin-notice">
            <p role="alert">
              The assignment could not be checked. Saving is unavailable until
              this check succeeds.
            </p>
            <button className="hq-inline-action" onClick={assignment.retry}>
              Retry assignment check
            </button>
          </div>
        ) : (
          assignment.value && (
            <div className="hq-admin-assignment">
              {current.value && (
                <AdminImage
                  key={`${date}:${current.value.image_url}`}
                  src={current.value.image_url}
                  alt="Current Daily question"
                />
              )}
              <div>
                <p className="hq-admin-help">Current assignment</p>
                <p className="hq-admin-answer">
                  {currentId === null
                    ? "No question assigned"
                    : (current.value?.correct_answer ??
                      `Question #${currentId}`)}
                </p>
                {currentId !== null && (
                  <>
                    <p className="hq-admin-help">
                      Question #{currentId} · {assignment.value.attempt_count}{" "}
                      started{" "}
                      {assignment.value.attempt_count === 1
                        ? "attempt"
                        : "attempts"}
                    </p>
                    {current.loading ? (
                      <p role="status">Loading question details…</p>
                    ) : current.error ? (
                      <>
                        <p>
                          Question details could not be loaded. The assignment
                          is still recorded.
                        </p>
                        <button
                          className="hq-inline-action"
                          onClick={current.retry}
                        >
                          Retry current question
                        </button>
                      </>
                    ) : (
                      current.value === null && (
                        <p>
                          The source question is unavailable. Its assignment is
                          still recorded.
                        </p>
                      )
                    )}
                  </>
                )}
                <p className="hq-admin-help">
                  {date < today
                    ? "Past dates are read only."
                    : assignment.value.attempt_count > 0
                      ? "This date is locked because an attempt has started."
                      : currentId === null
                        ? "Choose a question below to assign this date."
                        : "Replacing this question requires confirmation and a fresh server check."}
                </p>
              </div>
            </div>
          )
        )}
      </section>
      <section
        className="hq-admin-section"
        aria-labelledby="daily-search-title"
      >
        <h2 id="daily-search-title">2. Find a question</h2>
        <div className="hq-admin-field">
          <label htmlFor="daily-search">Search by answer</label>
          <input
            id="daily-search"
            type="search"
            value={search}
            disabled={locked}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Type part of an answer…"
            aria-describedby="daily-search-help"
          />
        </div>
        <p id="daily-search-help" className="hq-admin-help">
          Shows up to {SEARCH_LIMIT} matches, newest questions first.
        </p>
        {catalog.error && (
          <div className="hq-admin-notice">
            <p role="alert">
              Category and difficulty names could not be loaded. Their IDs are
              shown instead.
            </p>
            <button className="hq-inline-action" onClick={catalog.retry}>
              Retry names
            </button>
          </div>
        )}
        {!search.trim() ? (
          <p className="hq-admin-help">
            Start typing an answer to find a question.
          </p>
        ) : searchPending ? (
          <p role="status">Searching questions…</p>
        ) : results.error ? (
          <div className="hq-admin-notice">
            <p role="alert">Questions could not be loaded.</p>
            <button className="hq-inline-action" onClick={results.retry}>
              Retry search
            </button>
          </div>
        ) : (
          <>
            <p className="hq-admin-help" role="status">
              {results.value?.length
                ? `${results.value.length} ${results.value.length === 1 ? "match" : "matches"} shown${results.value.length === SEARCH_LIMIT ? ". Refine your search to see other questions." : "."}`
                : "No matching questions. Try another answer."}
            </p>
            <ul className="hq-admin-results">
              {results.value?.map((row) => (
                <li key={row.id} className="hq-admin-result">
                  <AdminImage
                    key={row.image_url}
                    src={row.image_url}
                    alt={`Question ${row.id}`}
                  />
                  <div>
                    <p className="hq-admin-answer">{row.correct_answer}</p>
                    <p className="hq-admin-help">
                      {category(row.category_id)} ·{" "}
                      {difficulty(row.difficulty_level_id)} · #{row.id}
                    </p>
                  </div>
                  <button
                    className="hq-secondary"
                    aria-label={`Select question ${row.id}`}
                    aria-pressed={selectedId === row.id}
                    disabled={locked}
                    onClick={() => setSelectedId(row.id)}
                  >
                    {selectedId === row.id ? "Selected" : "Select"}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <details className="hq-admin-id">
          <summary>Find a question by ID</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const id = Number(manualId);
              if (
                !/^\d+$/.test(manualId.trim()) ||
                !Number.isSafeInteger(id) ||
                id <= 0
              ) {
                setIdError("Enter a positive whole question ID.");
                return;
              }
              setIdError("");
              if (selectedId === id) preview.retry();
              else setSelectedId(id);
            }}
          >
            <div className="hq-admin-field">
              <label htmlFor="daily-question-id">Question ID</label>
              <input
                id="daily-question-id"
                value={manualId}
                disabled={locked}
                inputMode="numeric"
                onChange={(event) => {
                  setManualId(event.target.value);
                  setIdError("");
                }}
                aria-invalid={!!idError}
                aria-describedby={idError ? "daily-id-error" : undefined}
              />
            </div>
            <button className="hq-secondary" disabled={locked}>
              Load question
            </button>
          </form>
          {idError && (
            <p id="daily-id-error" role="alert">
              {idError}
            </p>
          )}
        </details>
      </section>
      <section
        className="hq-admin-section"
        aria-labelledby="daily-preview-title"
      >
        <h2 id="daily-preview-title">3. Review and assign</h2>
        {selectedId === null ? (
          <p className="hq-admin-help">
            Select a question to see its image and all four answers.
          </p>
        ) : preview.loading ? (
          <p role="status">Loading question preview…</p>
        ) : preview.error ? (
          <div className="hq-admin-notice">
            <p role="alert">
              This question could not be loaded or has incomplete game data. It
              cannot be assigned.
            </p>
            <button
              className="hq-inline-action"
              disabled={locked}
              onClick={preview.retry}
            >
              Retry preview
            </button>
          </div>
        ) : !preview.value ? (
          <p role="alert">
            Question #{selectedId} is unavailable. Choose another question.
          </p>
        ) : (
          <>
            <div className="hq-admin-preview">
              <AdminImage
                key={imageKey}
                src={preview.value.image_url}
                alt={`Preview of ${preview.value.correct_answer}`}
                preview
                onReady={(ready) => setImageReady({ key: imageKey, ready })}
              />
              <div>
                <h3>{preview.value.correct_answer}</h3>
                <p className="hq-admin-help">
                  {category(preview.value.category_id)} ·{" "}
                  {difficulty(preview.value.difficulty_level_id)} · #
                  {preview.value.id}
                </p>
                <ol className="hq-admin-options">
                  {preview.value.options.map((option) => (
                    <li
                      key={option}
                      className={
                        option === preview.value!.correct_answer
                          ? "hq-admin-correct"
                          : ""
                      }
                    >
                      <span>{option}</span>
                      {option === preview.value!.correct_answer && (
                        <strong>Correct answer</strong>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            {currentId === selectedId ? (
              <p className="hq-admin-help">
                This question is already assigned to the selected date.
              </p>
            ) : (
              !(imageReady.key === imageKey && imageReady.ready) && (
                <p className="hq-admin-help">
                  The preview image must load before this question can be
                  assigned.
                </p>
              )
            )}
            <button
              className="hq-primary hq-admin-save"
              disabled={!canSave}
              onClick={requestSave}
            >
              {saveStatus.kind === "saving"
                ? "Saving…"
                : currentId === null
                  ? "Assign Daily question"
                  : "Review replacement"}
            </button>
          </>
        )}
        {saveStatus.kind !== "idle" && (
          <div className={`hq-admin-notice hq-admin-${saveStatus.kind}`}>
            <p
              role={
                saveStatus.kind === "error" || saveStatus.kind === "unknown"
                  ? "alert"
                  : "status"
              }
            >
              {saveStatus.message}
            </p>
            {saveStatus.kind === "unknown" && (
              <button
                className="hq-inline-action"
                disabled={checkingSave}
                onClick={() => void checkSave()}
              >
                {checkingSave ? "Checking save status…" : "Check save status"}
              </button>
            )}
          </div>
        )}
      </section>
      <section
        className="hq-admin-section"
        aria-labelledby="daily-history-title"
      >
        <div className="hq-admin-history-heading">
          <h2 id="daily-history-title">History</h2>
          <button
            className="hq-inline-action"
            disabled={history.loading}
            onClick={refreshHistory}
          >
            Refresh history
          </button>
        </div>
        <p className="hq-admin-help">
          {historyRows.length} {historyRows.length === 1 ? "date" : "dates"}{" "}
          loaded · newest first. Date filters apply to loaded dates.
        </p>
        <div className="hq-admin-history-filters">
          <div className="hq-admin-field">
            <label htmlFor="daily-history-from">From</label>
            <input
              id="daily-history-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="hq-admin-field">
            <label htmlFor="daily-history-to">To</label>
            <input
              id="daily-history-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          {(from || to) && (
            <button
              className="hq-inline-action"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Clear dates
            </button>
          )}
        </div>
        {invalidRange && (
          <p role="alert">
            Choose a valid date range with From on or before To.
          </p>
        )}
        {history.loading && <p role="status">Loading history…</p>}
        {history.error && (
          <div className="hq-admin-notice">
            <p role="alert">
              History could not be refreshed.
              {historyRows.length > 0
                ? " Previously loaded dates are still shown."
                : ""}
            </p>
            <button className="hq-inline-action" onClick={history.retry}>
              Retry history
            </button>
          </div>
        )}
        {!history.loading && !history.error && !historyRows.length && (
          <p>No Daily questions have been assigned yet.</p>
        )}
        {!invalidRange && historyRows.length > 0 && !filtered.length && (
          <p>
            No loaded dates match this range. Load more dates or clear the
            filters.
          </p>
        )}
        <ul className="hq-admin-history">
          {filtered.map((row) => (
            <li key={row.d}>
              <AdminImage
                key={row.image_url}
                src={row.image_url}
                alt={`Daily for ${row.d}`}
              />
              <div>
                <button
                  className="hq-inline-action"
                  disabled={locked}
                  onClick={() => {
                    setDate(row.d);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                >
                  {dailyDateLabel(row.d)}
                </button>
                <p className="hq-admin-answer">{row.correct_answer}</p>
                <p className="hq-admin-help">
                  {category(row.category_id)} ·{" "}
                  {difficulty(row.difficulty_level_id)} · #{row.question_id}
                </p>
              </div>
              <div className="hq-admin-stats">
                <p>
                  {row.correct_answers}/{row.total_answers} correct
                </p>
                <p className="hq-admin-help">
                  {row.total_answers
                    ? `${Math.round((row.correct_answers / row.total_answers) * 100)}% correct`
                    : "No answers yet"}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {!history.loading &&
          !history.error &&
          history.value?.length === HISTORY_PAGE_SIZE && (
            <button
              className="hq-secondary"
              onClick={() =>
                setHistoryStep((previous) => ({
                  ...previous,
                  page: previous.page + 1,
                }))
              }
            >
              Load more dates
            </button>
          )}
      </section>
      <Dialog
        open={confirmation !== null}
        initialFocus={cancelReplacement}
        onClose={() => setConfirmation(null)}
        className="hq-admin-dialog"
      >
        <div className="hq-admin-dialog-backdrop" aria-hidden="true" />
        <div className="hq-admin-dialog-wrap">
          <DialogPanel className="hq-admin-dialog-panel">
            <DialogTitle>Replace the Daily question?</DialogTitle>
            <p>
              {confirmation && dailyDateLabel(confirmation.date)} · US Central
              time
            </p>
            <p>
              Current:{" "}
              {current.value?.correct_answer ??
                `Question #${confirmation?.expected.question_id}`}
            </p>
            <p>New: {confirmation?.question.correct_answer}</p>
            <p className="hq-admin-help">
              The server checks that the assignment is unchanged and no attempt
              has started before replacing it.
            </p>
            <div className="hq-admin-dialog-actions">
              <button
                ref={cancelReplacement}
                className="hq-secondary"
                onClick={() => setConfirmation(null)}
              >
                Keep current question
              </button>
              <button
                className="hq-primary"
                disabled={!canSave}
                onClick={() => {
                  if (confirmation) void save(confirmation);
                }}
              >
                Confirm replacement
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
