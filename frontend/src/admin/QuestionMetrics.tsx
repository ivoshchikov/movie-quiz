import { useCallback } from "react";
import { gameplayRpc } from "../game/server";
import { useReadRequest } from "../hooks/useReadRequest";

interface Metric {
  revision: number; mode: "normal" | "daily" | "time_attack"; cohort: "guest" | "account" | "first_account";
  skipped?: number; correct: number; wrong: number; timeouts: number; abandoned: number; response_ms: number; timed_answers: number;
}
interface Metrics {
  since: string; legacy: { total_attempts: number; correct_attempts: number } | null; cohorts: Metric[];
}
const count = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const percentage = (n: number, total: number) => total ? `${Math.round(n / total * 100)}%` : "—";
const labels = { guest: "Guest outcomes", account: "Account outcomes", first_account: "First account outcomes" };
export default function QuestionMetrics({ owner, id }: { owner: string; id: number }) {
  const load = useCallback(async (signal: AbortSignal) => {
    const data = await gameplayRpc<Metrics>("admin_question_metrics", { p_question_id: id }, signal);
    if (!data || !Number.isFinite(Date.parse(data.since)) ||
      !(data.legacy === null || count(data.legacy?.total_attempts) && count(data.legacy?.correct_attempts)) ||
      !Array.isArray(data.cohorts) || !data.cohorts.every(r => r && count(r.revision) &&
        ["normal", "daily", "time_attack"].includes(r.mode) && ["guest", "account", "first_account"].includes(r.cohort) &&
        [r.correct, r.wrong, r.timeouts, r.abandoned, r.response_ms, r.timed_answers, r.skipped ?? 0].every(count))) throw new Error("invalid-question-metrics");
    return data;
  }, [id]);
  const read = useReadRequest(`${owner}:${id}`, load);
  return <section className="hq-bank-metrics" aria-label="Question statistics">
    <h3>Question statistics</h3>
    {read.loading && <p role="status">Loading question statistics…</p>}
    {read.error && <p role="alert">Statistics could not be loaded. <button className="hq-inline-action" onClick={read.retry}>Retry question statistics</button></p>}
    {read.value && <>
      <p>Historical raw counters: {read.value.legacy?.correct_attempts ?? 0} correct / {read.value.legacy?.total_attempts ?? 0} submitted answers ({percentage(read.value.legacy?.correct_attempts ?? 0, read.value.legacy?.total_attempts ?? 0)}). These combine earlier guest and account answers and keep cancelled Daily submissions.</p>
      <p>Separate outcome counts since {new Date(read.value.since).toLocaleDateString("en-US")}. First account outcomes are a subset of account outcomes: one per account, question revision and mode. Known earlier outcomes do not count again. Guest repeats can affect guest counts. Cancelled Daily dates are excluded from these new counts.</p>
      {read.value.cohorts.length ? <div className="hq-bank-metrics-scroll" role="region" aria-label="Question outcome counts" tabIndex={0}><table>
        <caption>Accuracy includes correct, wrong and timed-out questions. Skipped and abandoned questions are separate; average time uses submitted answers only.</caption>
        <thead><tr><th>Revision / mode</th><th>Group</th><th>Correct</th><th>Wrong</th><th>Timeouts</th><th>Abandoned</th><th>Skipped</th><th>Accuracy</th><th>Average time</th></tr></thead>
        <tbody>{read.value.cohorts.map(r => <tr key={`${r.revision}:${r.mode}:${r.cohort}`}><th scope="row">{r.revision} / {r.mode}</th><td>{labels[r.cohort]}</td><td>{r.correct}</td><td>{r.wrong}</td><td>{r.timeouts}</td><td>{r.abandoned}</td><td>{r.skipped ?? 0}</td><td>{percentage(r.correct, r.correct + r.wrong + r.timeouts)}</td><td>{r.timed_answers ? `${(r.response_ms / r.timed_answers / 1000).toFixed(1)} s` : "—"}</td></tr>)}</tbody>
      </table></div> : <p>No separate outcome counts yet.</p>}
    </>}
  </section>;
}
