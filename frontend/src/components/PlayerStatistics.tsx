import { useCallback } from "react";
import { gameplayRpc } from "../game/server";
import { useReadRequest } from "../hooks/useReadRequest";
import type { Category, DifficultyLevel } from "../api";
import { categoryLabel } from "../hooks/useQuizCatalog";

interface Counts {
  correct: number;
  wrong: number;
  timeouts: number;
  abandoned: number;
  average_ms: number | null;
}
interface Stats {
  tracking_since: string;
  normal: Counts & {
    games: number;
    unique_questions: number;
    best_streak: number;
  };
  breakdown: (Counts & { category_id: number; difficulty_id: number })[];
  trend: { d: string; correct: number; wrong: number; timeouts: number }[];
  daily_calendar: {
    d: string;
    outcome: "correct" | "wrong" | "missed" | "started" | "not-played" | "cancelled";
    time_spent: number | null;
  }[];
}
const percent = (correct: number, total: number) =>
  total ? `${Math.round((correct / total) * 100)}%` : "—";
export default function PlayerStatistics({
  owner,
  refresh,
  categories,
  difficulties,
  view = "classic",
}: {
  owner: string;
  refresh: number;
  categories: Category[];
  difficulties: DifficultyLevel[];
  view?: "classic" | "daily";
}) {
  const load = useCallback(async (signal: AbortSignal) => {
    const s = await gameplayRpc<Stats>("my_game_stats", {}, signal);
    if (
      !s ||
      !s.normal ||
      ![
        s.normal.games,
        s.normal.correct,
        s.normal.wrong,
        s.normal.timeouts,
        s.normal.abandoned,
        s.normal.best_streak,
        s.normal.unique_questions,
      ].every((n) => Number.isInteger(n) && n >= 0) ||
      !Array.isArray(s.breakdown) ||
      !Array.isArray(s.trend) ||
      !Array.isArray(s.daily_calendar) ||
      !Number.isFinite(Date.parse(s.tracking_since))
    )
      throw new Error("invalid-statistics");
    return s;
  }, []);
  const stats = useReadRequest(`${owner}:${refresh}`, load, !!owner);
  const s = stats.value,
    n = s?.normal;
  const calendarEnd = s?.daily_calendar[s.daily_calendar.length - 1]?.d;
  const recent = (days: number) => {
    const end = calendarEnd ? Date.parse(`${calendarEnd}T12:00:00Z`) : Date.now();
    const cutoff = new Date(end - (days - 1) * 86400000).toISOString().slice(0, 10);
    return s?.trend.filter(t => t.d >= cutoff && (!calendarEnd || t.d <= calendarEnd)).reduce(
      (a,t) => ({correct:a.correct+t.correct,total:a.total+t.correct+t.wrong+t.timeouts}), {correct:0,total:0});
  };
  return (
    <section
      className="hq-profile-results hq-player-statistics"
      aria-labelledby="player-statistics-title"
      aria-busy={stats.loading}
    >
      <div className="hq-profile-section-heading">
        <h2 id="player-statistics-title">{view === "daily" ? "Daily history" : "Playing statistics"}</h2>
        <button
          className="hq-inline-action"
          onClick={stats.retry}
          disabled={stats.loading}
        >
          Refresh statistics
        </button>
      </div>
      {stats.error && (
        <p role="alert">
          Statistics could not be loaded.{" "}
          <button className="hq-inline-action" onClick={stats.retry}>
            Retry statistics
          </button>
        </p>
      )}
      {!s && !stats.error && <p role="status">Loading playing statistics…</p>}
      {s && n && (
        <>
          {view === "classic" && <>
          <details className="hq-copy-details"><summary>What these statistics include</summary><p className="hq-profile-note">
            Classic statistics since{" "}
            {new Date(s.tracking_since).toLocaleDateString("en-US")}. Earlier
            records and Daily results are preserved. Accuracy includes timeouts;
            unfinished questions are listed separately. Average time uses submitted answers only. The best correct streak continues across quizzes and ends at a wrong, timed-out or abandoned question. Unique questions include every question with a recorded outcome.
          </p></details>
          <dl className="hq-stat-grid">
            <div>
              <dt>Finished quizzes</dt>
              <dd>{n.games}</dd>
            </div>
            <div>
              <dt>Correct / wrong</dt>
              <dd>
                {n.correct} / {n.wrong}
              </dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{percent(n.correct, n.correct + n.wrong + n.timeouts)}</dd>
            </div>
            <div>
              <dt>Timeouts / unfinished</dt>
              <dd>
                {n.timeouts} / {n.abandoned}
              </dd>
            </div>
            <div>
              <dt>Average answer time</dt>
              <dd>
                {n.average_ms == null
                  ? "—"
                  : `${(n.average_ms / 1000).toFixed(1)} s`}
              </dd>
            </div>
            <div>
              <dt>Best correct streak across quizzes</dt>
              <dd>{n.best_streak}</dd>
            </div>
            <div>
              <dt>Unique questions with an outcome</dt>
              <dd>{n.unique_questions}</dd>
            </div>
            {[7, 30].map((days) => {
              const t = recent(days)!;
              return (
                <div key={days}>
                  <dt>Last {days} days</dt>
                  <dd>
                    {t.correct} / {t.total}
                    <small> correct / played</small>
                  </dd>
                </div>
              );
            })}
          </dl>
          {!!s.breakdown.length && (
            <div className="hq-stats-table-wrap" role="region" aria-label="Statistics by quiz" tabIndex={0}>
              <p className="hq-stats-scroll-hint">Scroll the table to see all columns.</p>
              <table className="hq-stats-table">
                <caption>Classic quizzes by category and difficulty</caption>
                <thead>
                  <tr>
                    <th>Quiz</th>
                    <th>Correct</th>
                    <th>Wrong</th>
                    <th>Timeouts</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {s.breakdown.map((b) => (
                    <tr key={`${b.category_id}:${b.difficulty_id}`}>
                      <th scope="row">
                        {categories.find((c) => c.id === b.category_id)
                          ? categoryLabel(
                              categories.find((c) => c.id === b.category_id)!,
                            )
                          : `Category ${b.category_id}`}{" "}
                        ·{" "}
                        {difficulties.find((d) => d.id === b.difficulty_id)
                          ?.name ?? `Level ${b.difficulty_id}`}
                      </th>
                      <td>{b.correct}</td>
                      <td>{b.wrong}</td>
                      <td>{b.timeouts}</td>
                      <td>
                        {percent(b.correct, b.correct + b.wrong + b.timeouts)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>}
          {view === "daily" && <>
          <h3>Daily · last 30 days</h3>
          <p className="hq-profile-note">
            Results only. Correct, wrong and started-but-missed days are shown
            without past questions or answers. Cancelled days are neutral and preserve streaks without adding a correct day.
          </p>
          <ol className="hq-daily-calendar" aria-label="Daily result calendar">
            {s.daily_calendar.map((d) => (
              <li
                key={d.d}
                className={`hq-calendar-${d.outcome}`}
                title={`${d.d}: ${d.outcome}${d.time_spent != null ? ` · ${d.time_spent} s` : ""}`}
              >
                <time dateTime={d.d}>{d.d.slice(5)}</time>
                <span>{d.outcome === "not-played" ? "—" : d.outcome}</span>
                {d.time_spent != null && <small>{d.time_spent} s</small>}
              </li>
            ))}
          </ol>
          </>}
        </>
      )}
    </section>
  );
}
