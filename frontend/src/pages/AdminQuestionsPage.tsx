import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getCategories, getDifficulties } from "../api";
import { getPublicUrl } from "../supabase";
import { categoryLabel } from "../hooks/useQuizCatalog";
import { useReadRequest } from "../hooks/useReadRequest";
import Seo from "../components/Seo";
import AdminAccess from "../admin/AdminAccess";
import AdminImage from "../admin/AdminImage";
import QuestionEditor from "../admin/QuestionEditor";
import QuestionMetrics from "../admin/QuestionMetrics";
import { loadBank, loadQuestion } from "../admin/questionsApi";
import type { BankFilters } from "../admin/questionsApi";
import "../admin-daily.css";
import "../admin-questions.css";

const number = (v: string | null, fallback: number | null = null) =>
  v !== null && /^\d{1,6}$/.test(v) ? Number(v) : fallback;
export default function AdminQuestionsPage() {
  const { user } = useAuth();
  return (
    <>
      <Seo
        title="Question bank | Hard Quiz"
        description="Private question bank administration."
        url="https://hard-quiz.com/admin/questions"
        noindex
      />
      <AdminAccess>
        <QuestionBank key={user?.id} owner={user?.id ?? ""} />
      </AdminAccess>
    </>
  );
}
function QuestionBank({ owner }: { owner: string }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  const sort = params.get("sort"),
    categoryId = number(params.get("category")),
    difficultyId = number(params.get("difficulty")),
    page = Math.max(1, number(params.get("page"), 1)!);
  const filters = useMemo<BankFilters>(
    () => ({
      search: q.slice(0, 200),
      category: categoryId,
      difficulty: difficultyId,
      sort: sort === "id_asc" || sort === "answer_asc" ? sort : "id_desc",
      page,
    }),
    [q, sort, categoryId, difficultyId, page],
  );
  const questionId = number(params.get("question"));
  const opened = useRef(false);
  const closeGuard = useRef<(() => boolean) | null>(null);
  const registerGuard = useCallback((check: (() => boolean) | null) => {
    closeGuard.current = check;
  }, []);
  const [notice, setNotice] = useState("");
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(
      () =>
        setParams(
          (old) => {
            const p = new URLSearchParams(old);
            if (search.trim()) p.set("q", search.trim());
            else p.delete("q");
            p.delete("page");
            return p;
          },
          { replace: true },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [search, q, setParams]);
  const catalogLoad = useCallback(
    (signal: AbortSignal) =>
      Promise.all([getCategories(signal), getDifficulties(signal)]),
    [],
  );
  const catalog = useReadRequest(`${owner}:catalog`, catalogLoad);
  const bankLoad = useCallback(
    (signal: AbortSignal) => loadBank(filters, signal),
    [filters],
  );
  const bank = useReadRequest(`${owner}:${JSON.stringify(filters)}`, bankLoad);
  const [categories, levels] = catalog.value ?? [[], []];
  const data = bank.value;
  const category = (id: number | null) =>
    categories.find((c) => c.id === id)
      ? categoryLabel(categories.find((c) => c.id === id)!)
      : id === null
        ? "Uncategorised"
        : `Category ${id}`;
  const difficulty = (id: number) =>
    levels.find((l) => l.id === id)?.name ?? `Difficulty ${id}`;
  const change = (key: string, value: string) =>
    setParams((old) => {
      const p = new URLSearchParams(old);
      if (value) p.set(key, value);
      else p.delete(key);
      if (key !== "page") p.delete("page");
      return p;
    });
  const open = (id: number) => {
    opened.current = true;
    setParams((old) => {
      const p = new URLSearchParams(old);
      p.set("question", String(id));
      return p;
    });
  };
  const close = () => {
    if (closeGuard.current && !closeGuard.current()) return;
    if (opened.current) {
      opened.current = false;
      navigate(-1);
    } else
      setParams(
        (old) => {
          const p = new URLSearchParams(old);
          p.delete("question");
          return p;
        },
        { replace: true },
      );
  };
  useEffect(() => {
    if (data && data.page !== filters.page)
      setParams(
        (old) => {
          const p = new URLSearchParams(old);
          p.set("page", String(data.page));
          return p;
        },
        { replace: true },
      );
  }, [data, filters.page, setParams]);
  const filtered = !!(
    filters.search ||
    filters.category !== null ||
    filters.difficulty !== null
  );
  return (
    <section className="hq-admin hq-bank">
      <div className="hq-bank-heading">
        <div>
          <h1>Question bank</h1>
          <p>
            {data
              ? `${data.bank_total} questions in the bank`
              : "Browse images, answers and settings."}
          </p>
        </div>
        <Link className="hq-primary" to="/admin/questions/new">
          Add questions
        </Link>
      </div>
      {notice && <p role="status">{notice}</p>}
      <div className="hq-bank-filters">
        <label className="hq-bank-search">
          Search
          <input
            type="search"
            maxLength={200}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Answer, ID or image path"
          />
        </label>
        <label>
          Category
          <select
            aria-label="Category"
            value={filters.category ?? ""}
            onChange={(e) => change("category", e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryLabel(c)}
              </option>
            ))}
            <option value="0">Uncategorised</option>
          </select>
        </label>
        <label>
          Difficulty
          <select
            aria-label="Difficulty"
            value={filters.difficulty ?? ""}
            onChange={(e) => change("difficulty", e.target.value)}
          >
            <option value="">All difficulties</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            aria-label="Sort"
            value={filters.sort}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="id_desc">ID: high to low</option>
            <option value="id_asc">ID: low to high</option>
            <option value="answer_asc">Answer: A–Z</option>
          </select>
        </label>
        <button
          className="hq-secondary"
          onClick={() => {
            setSearch("");
            setParams({});
          }}
        >
          Reset filters
        </button>
      </div>
      {catalog.error && (
        <p role="alert">
          Categories or difficulties could not load.{" "}
          <button className="hq-inline-action" onClick={catalog.retry}>
            Retry settings
          </button>
        </p>
      )}
      {bank.error ? (
        <div className="hq-bank-state" role="alert">
          <p>The question bank could not load.</p>
          <button className="hq-secondary" onClick={bank.retry}>
            Try again
          </button>
        </div>
      ) : bank.loading ? (
        <div className="hq-bank-state" role="status">
          Loading questions…
        </div>
      ) : data && data.total === 0 ? (
        <div className="hq-bank-state">
          <h2>
            {data.bank_total === 0
              ? "Your question bank is empty"
              : "No matching questions"}
          </h2>
          <p>
            {data.bank_total === 0
              ? "Add your first image and four answers to get started."
              : "Try another search or reset the filters."}
          </p>
          {data.bank_total === 0 ? (
            <Link className="hq-primary" to="/admin/questions/new">
              Add questions
            </Link>
          ) : (
            <button
              className="hq-secondary"
              onClick={() => {
                setSearch("");
                setParams({});
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      ) : data ? (
        <>
          <p className="hq-bank-count" role="status">
            Showing {(data.page - 1) * 25 + 1}–
            {Math.min(data.page * 25, data.total)} of {data.total}
            {filtered ? " matching questions" : " questions"}
          </p>
          <div className="hq-bank-table">
            <div className="hq-bank-table-head" aria-hidden="true">
              <span>Image</span>
              <span>ID</span>
              <span>Correct answer</span>
              <span>Category</span>
              <span>Difficulty</span>
            </div>
            <ul className="hq-bank-rows" aria-label="Questions">
              {data.rows.map((row) => (
                <li key={row.id}>
                  <AdminImage
                    key={row.image_url}
                    src={getPublicUrl(row.image_url)}
                    alt={`Question ${row.id} image`}
                  />
                  <span className="hq-bank-id">#{row.id}</span>
                  <div>
                    <button
                      className="hq-bank-open"
                      onClick={() => open(row.id)}
                      aria-label={`View question ${row.id}`}
                    >
                      {row.correct_answer || "Missing answer"}
                    </button>
                    {row.needs_review && (
                      <span className="hq-bank-warning">Needs review</span>
                    )}
                  </div>
                  <span className="hq-bank-category">
                    {category(row.category_id)}
                  </span>
                  <span className="hq-bank-difficulty">
                    {difficulty(row.difficulty_level_id)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <nav className="hq-bank-pagination" aria-label="Question pages">
            <button
              className="hq-secondary"
              disabled={data.page === 1}
              onClick={() => change("page", String(data.page - 1))}
            >
              Previous
            </button>
            <span>
              Page {data.page} of {Math.ceil(data.total / 25)}
            </span>
            <button
              className="hq-secondary"
              disabled={data.page * 25 >= data.total}
              onClick={() => change("page", String(data.page + 1))}
            >
              Next
            </button>
          </nav>
        </>
      ) : null}
      {data && catalog.value && (
        <details className="hq-bank-summary">
          <summary>Bank overview · {data.bank_total} questions</summary>
          <div className="hq-bank-summary-scroll">
            <table>
              <caption>All questions by category and difficulty</caption>
              <thead>
                <tr>
                  <th>Category</th>
                  {levels.map((l) => (
                    <th key={l.id}>{l.name}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...categories,
                  ...(data.summary.some(
                    (s) => s.category_id === 0 && s.count > 0,
                  )
                    ? [{ id: 0, name: "Uncategorised" }]
                    : []),
                ].map((c) => (
                  <tr key={c.id}>
                    <th>{c.id === 0 ? "Uncategorised" : categoryLabel(c)}</th>
                    {levels.map((l) => (
                      <td key={l.id}>
                        {data.summary.find(
                          (s) =>
                            s.category_id === c.id &&
                            s.difficulty_level_id === l.id,
                        )?.count ?? 0}
                      </td>
                    ))}
                    <td>
                      {data.summary
                        .filter((s) => s.category_id === c.id)
                        .reduce((n, s) => n + s.count, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <Dialog open={!!questionId} onClose={close} className="hq-bank-dialog">
        <div className="hq-admin-backdrop" />
        <div className="hq-bank-dialog-position">
          <DialogPanel className="hq-bank-dialog-panel">
            <div className="hq-bank-heading">
              <DialogTitle>Question #{questionId}</DialogTitle>
              <button className="hq-secondary" onClick={close}>
                Close
              </button>
            </div>
            {questionId && (
              <QuestionDetail
                key={`${owner}:${questionId}`}
                owner={owner}
                id={questionId}
                category={category}
                difficulty={difficulty}
                guard={registerGuard}
                changed={(deleted) => {
                  bank.retry();
                  setNotice(
                    deleted
                      ? `Question #${questionId} deleted from the bank.`
                      : `Question #${questionId} changes saved.`,
                  );
                  if (deleted) {
                    closeGuard.current = null;
                    close();
                  }
                }}
              />
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </section>
  );
}
function QuestionDetail({
  owner,
  id,
  category,
  difficulty,
  changed,
  guard,
}: {
  owner: string;
  id: number;
  category: (id: number | null) => string;
  difficulty: (id: number) => string;
  changed: (deleted: boolean) => void;
  guard: (check: (() => boolean) | null) => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => loadQuestion(id, signal),
    [id],
  );
  const read = useReadRequest(`${owner}:${id}`, load);
  const [zoom, setZoom] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copy, setCopy] = useState("");
  const row = read.value;
  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopy(`${label} copied.`);
    } catch {
      setCopy(
        `Copy unavailable. Select and copy the ${label.toLowerCase()} below.`,
      );
    }
  };
  if (read.error)
    return (
      <div className="hq-bank-state" role="alert">
        This question could not load.{" "}
        <button className="hq-secondary" onClick={read.retry}>
          Try again
        </button>
      </div>
    );
  if (read.loading) return <p role="status">Loading question…</p>;
  if (!row) return <p>This question is unavailable.</p>;
  const original = getPublicUrl(row.image_url);
  const safeOriginal = /^https?:\/\//i.test(original);
  return (
    <>
      <div className={`hq-bank-full-image${zoom ? " is-zoomed" : ""}`}>
        <AdminImage
          key={original}
          src={original}
          alt={`Full image for question ${id}`}
          preview
        />
      </div>
      <div className="hq-bank-detail-actions">
        <button className="hq-secondary" onClick={() => setZoom((v) => !v)}>
          {zoom ? "Fit image" : "Zoom image"}
        </button>
        {safeOriginal && (
          <a
            className="hq-secondary"
            href={original}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original
          </a>
        )}
      </div>
      {row.needs_review && (
        <p className="hq-bank-warning" role="status">
          Needs review: the stored answers are inconsistent. This question is
          shown for inspection.
        </p>
      )}
      {row.invalid_options && (
        <p className="hq-bank-warning">
          Stored options: <code>{row.invalid_options}</code>
        </p>
      )}
      <ol className="hq-bank-answers" aria-label="Answer options">
        {row.options_json.map((option, index) => {
          const answer =
            typeof option === "string" ? option : JSON.stringify(option);
          const correct =
            typeof option === "string" &&
            option.trim() === row.correct_answer.trim();
          return (
            <li key={index} className={correct ? "is-correct" : ""}>
              <span>{String.fromCharCode(65 + index)}</span>
              <p>{answer}</p>
              {correct && <strong>Correct answer</strong>}
            </li>
          );
        })}
      </ol>
      <dl className="hq-bank-details">
        <div>
          <dt>Correct answer</dt>
          <dd>{row.correct_answer}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{category(row.category_id)}</dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{difficulty(row.difficulty_level_id)}</dd>
        </div>
        <div>
          <dt>ID</dt>
          <dd>
            <code>{row.id}</code>
            <button
              className="hq-inline-action"
              onClick={() => void copyValue(String(row.id), "ID")}
            >
              Copy ID
            </button>
          </dd>
        </div>
        <div>
          <dt>Image path</dt>
          <dd>
            <code>{row.image_url}</code>
            <button
              className="hq-inline-action"
              onClick={() => void copyValue(row.image_url, "Image path")}
            >
              Copy image path
            </button>
          </dd>
        </div>
      </dl>
      <p role="status">{copy}</p>
      <QuestionMetrics key={`${id}:${row.admin_revision}`} owner={owner} id={id} />
      {editing ? (
        <QuestionEditor
          key={`${row.id}:${row.admin_revision}`}
          row={row}
          guard={guard}
          cancel={() => setEditing(false)}
          reload={() => {
            setEditing(false);
            read.retry();
          }}
          done={(deleted) => {
            setEditing(false);
            read.retry();
            changed(deleted);
          }}
        />
      ) : (
        <div className="hq-bank-detail-actions">
          <button className="hq-primary" onClick={() => setEditing(true)}>
            Edit or delete question
          </button>
        </div>
      )}
    </>
  );
}
