import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getCategories, getDifficulties } from "../api";
import { getPublicUrl } from "../supabase";
import { categoryLabel } from "../hooks/useQuizCatalog";
import { useReadRequest } from "../hooks/useReadRequest";
import Seo from "../components/Seo";
import AdminAccess from "../admin/AdminAccess";
import AdminSelect from "../admin/AdminSelect";
import AdminImage from "../admin/AdminImage";
import { loadQuestionStatistics, statisticsFilters } from "../admin/questionStatistics";
import "../admin-daily.css";
import "../admin-questions.css";
import "../admin-question-statistics.css";
const format = new Intl.NumberFormat("en-US");
const rate = (correct: number, shown: number) => shown ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(correct / shown * 100)}%` : "—";
export default function AdminQuestionStatisticsPage() {
  const { user } = useAuth();
  return <><Seo title="Question statistics | Hard Quiz" description="Private question statistics administration." url="https://hard-quiz.com/admin/question-statistics" noindex />
    <AdminAccess><Statistics key={user?.id} owner={user?.id ?? ""} /></AdminAccess></>;
}
function Statistics({ owner }: { owner: string }) {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => statisticsFilters(params), [params]);
  const query = filters.search;
  const [search, setSearch] = useState(query);
  useEffect(() => { setSearch(query); }, [query]);
  useEffect(() => {
    if (search === query) return;
    const timer = window.setTimeout(() => setParams(old => {
      const p = new URLSearchParams(old); if (search.trim()) p.set("q", search.trim()); else p.delete("q"); p.delete("page"); return p;
    }, { replace: true }), 300);
    return () => window.clearTimeout(timer);
  }, [search, query, setParams]);
  const load = useCallback((signal: AbortSignal) => loadQuestionStatistics(owner, filters, signal), [owner, filters]);
  const read = useReadRequest(`${owner}:question-statistics:${JSON.stringify(filters)}`, load);
  const loadCatalog = useCallback((signal: AbortSignal) => Promise.all([getCategories(signal), getDifficulties(signal)]), []);
  const catalog = useReadRequest(`${owner}:statistics-catalog`, loadCatalog);
  const [categories, levels] = catalog.value ?? [[], []];
  const category = (id: number | null) => { const c = categories.find(c => c.id === id); return c ? categoryLabel(c) : id === null ? "Uncategorised" : `Category ${id}`; };
  const difficulty = (id: number) => levels.find(l => l.id === id)?.name ?? `Difficulty ${id}`;
  const change = (key: string, value: string) => setParams(old => { const p = new URLSearchParams(old); if (value) p.set(key, value); else p.delete(key); if (key !== "page") p.delete("page"); return p; });
  const reset = () => { setSearch(""); setParams({}); };
  const data = read.value;
  return <section className="hq-admin hq-bank hq-question-stats" aria-label="Question statistics overview">
    <div className="hq-bank-heading"><div><h1>Question statistics</h1><p>Classic, Daily and Time Attack</p></div>
      <button className="hq-secondary" type="button" onClick={read.retry} disabled={read.loading}>Refresh statistics</button></div>
    <div className="hq-bank-filters">
      <label className="hq-bank-search">Search<input type="search" value={search} maxLength={200} placeholder="Answer, ID or path" onChange={e => setSearch(e.target.value)} /></label>
      <label>Category<AdminSelect aria-label="Category" value={filters.category ?? ""} onChange={e => change("category", e.target.value)} disabled={catalog.loading}>
        <option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{categoryLabel(c)}</option>)}<option value="0">Uncategorised</option></AdminSelect></label>
      <label>Difficulty tag<AdminSelect aria-label="Difficulty tag" value={filters.difficulty ?? ""} onChange={e => change("difficulty", e.target.value)} disabled={catalog.loading}>
        <option value="">All difficulty tags</option>{levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</AdminSelect></label>
      <label>Mode<AdminSelect aria-label="Mode" value={filters.mode} onChange={e => change("mode", e.target.value)}><option value="all">All guessing modes</option><option value="normal">Classic</option><option value="daily">Daily</option><option value="time_attack">Time Attack</option></AdminSelect></label>
      <label>Versions<AdminSelect aria-label="Versions" value={filters.versions} onChange={e => change("versions", e.target.value)}><option value="all">All versions</option><option value="current">Current version</option></AdminSelect></label>
      <label>Sort<AdminSelect aria-label="Sort" value={filters.sort} onChange={e => change("sort", e.target.value)}>
        <option value="shown_desc">Most shown</option><option value="shown_asc">Least shown</option><option value="correct_desc">Most correct</option>
        <option value="accuracy_asc">Lowest correct %</option><option value="accuracy_desc">Highest correct %</option><option value="id_desc">ID: high to low</option><option value="id_asc">ID: low to high</option></AdminSelect></label>
      <button className="hq-secondary" type="button" onClick={reset}>Reset filters</button>
    </div>
    {catalog.error && <p role="alert">Filters could not be loaded. <button className="hq-inline-action" type="button" onClick={catalog.retry}>Retry filters</button></p>}
    {read.error && <p role="alert">{data ? "Update failed. Showing the last confirmed statistics." : "Question statistics are unavailable."} <button className="hq-inline-action" type="button" onClick={read.retry}>Retry statistics</button></p>}
    {!data && read.loading && <p role="status">Loading question statistics…</p>}
    {data && <>
      <p className="hq-bank-count" role="status">{data.total ? `Showing ${(data.page - 1) * 25 + 1}–${Math.min(data.page * 25, data.total)} of ${format.format(data.total)} questions` : "No matching questions"}</p>
      <p className="hq-stat-totals">{format.format(data.shown)} shown · {format.format(data.correct)} correct · {rate(data.correct, data.shown)} correct</p>
      {data.rows.length ? <table className="hq-question-stat-table" aria-busy={read.loading} role="table">
        <caption className="sr-only">Question statistics. Correct percentage is correct answers divided by shown questions.</caption>
        <thead role="rowgroup"><tr role="row"><th scope="col">Question</th><th scope="col">Shown</th><th scope="col">Correct</th><th scope="col">Correct %</th></tr></thead>
        <tbody role="rowgroup">{data.rows.map(r => <tr key={r.id} role="row">
          <th scope="row" role="rowheader"><div className="hq-stat-question"><AdminImage key={r.image_url} src={getPublicUrl(r.image_url)} alt={`Question ${r.id} image`} />
            <div><span className="hq-bank-id">#{r.id}</span><Link className="hq-stat-answer" aria-label={`View question ${r.id}: ${r.correct_answer}`} to={`/admin/questions?question=${r.id}`}>{r.correct_answer || "Missing answer"}</Link>
              <span className="hq-stat-meta">{category(r.category_id)} · {difficulty(r.difficulty_level_id)} tag</span></div></div></th>
          <td role="cell"><span className="hq-stat-mobile-label">Shown</span>{format.format(r.shown)}</td><td role="cell"><span className="hq-stat-mobile-label">Correct</span>{format.format(r.correct)}</td><td role="cell"><span className="hq-stat-mobile-label">Correct %</span>{r.accuracy === null ? "—" : `${r.accuracy}%`}</td>
        </tr>)}</tbody>
      </table> : <div className="hq-bank-empty"><h2>No questions match these filters</h2><button className="hq-secondary" onClick={reset}>Show all questions</button></div>}
      {data.total > 25 && <nav className="hq-bank-pagination" aria-label="Statistics pages"><button className="hq-secondary" disabled={data.page === 1 || read.loading} onClick={() => change("page", String(data.page - 1))}>Previous</button><span>Page {data.page} of {Math.ceil(data.total / 25)}</span><button className="hq-secondary" disabled={data.page * 25 >= data.total || read.loading} onClick={() => change("page", String(data.page + 1))}>Next</button></nav>}
      <details className="hq-stat-methods"><summary>How statistics work</summary><p>Recorded since {new Date(data.since).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}. Shown counts a question issued by the server in a started round, including unanswered, skipped, timed-out and abandoned rounds. Prepared future questions and repeat loading of the same round do not add shows. An issued question can fail to load its image.</p><p>Correct % = correct answers ÷ shown × 100. Guests, accounts and repeat plays are included. All versions includes older question content; choose Current version to separate it. Cancelled Daily activity remains part of these raw counts. Earlier legacy answer totals are excluded because they cannot establish reliable shown counts. This or That records preferences and is excluded.</p></details>
    </>}
  </section>;
}
