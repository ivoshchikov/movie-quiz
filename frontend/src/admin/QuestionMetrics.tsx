import { useCallback } from "react";
import { gameplayRpc } from "../game/server";
import { useReadRequest } from "../hooks/useReadRequest";

interface Activity { shown: number; correct: number; accuracy: number | null }
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
export default function QuestionMetrics({ owner, id }: { owner: string; id: number }) {
  const load = useCallback(async (signal: AbortSignal) => {
    const data = await gameplayRpc<{ activity: Activity }>("admin_question_metrics", { p_question_id: id }, signal);
    const activity = data?.activity;
    if (!activity || !count(activity.shown) || !count(activity.correct) || activity.correct > activity.shown ||
      (activity.shown === 0 ? activity.accuracy !== null : typeof activity.accuracy !== "number" ||
        !Number.isFinite(activity.accuracy) || Math.abs(activity.accuracy - Math.round(activity.correct / activity.shown * 1000) / 10) > .001))
      throw new Error("invalid-question-metrics");
    return activity;
  }, [id]);
  const read = useReadRequest(`${owner}:${id}`, load);
  return <section className="hq-bank-metrics" aria-label="Question statistics">
    <h3>Question statistics</h3>
    {read.loading && <p role="status">Loading question statistics…</p>}
    {read.error && <p role="alert">Statistics could not be loaded. <button className="hq-inline-action" onClick={read.retry}>Retry question statistics</button></p>}
    {read.value && <dl>
      <div><dt>Shown</dt><dd>{read.value.shown.toLocaleString("en-US")}</dd></div>
      <div><dt>Correct answers</dt><dd>{read.value.correct.toLocaleString("en-US")}</dd></div>
      <div><dt>Correct %</dt><dd>{read.value.accuracy === null ? "—" : `${read.value.accuracy.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`}</dd></div>
    </dl>}
  </section>;
}
