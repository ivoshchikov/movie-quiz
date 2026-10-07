import { useLayoutEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { formatQuizDuration, useLeaderboard } from "../leaderboard/useLeaderboard";
import type { SiteOutletContext } from "./Layout";
import SiteIcon from "./SiteIcon";

interface Props { categoryId: number; difficultyId: number; categoryLabel: string; difficultyLabel: string; }

export default function Leaderboard({ categoryId, difficultyId, categoryLabel, difficultyLabel }: Props) {
  const key = `${categoryId}:${difficultyId}`;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const limit = expandedKey === key ? 20 : 10;
  const { openLogin } = useOutletContext<SiteOutletContext>();
  const { user, authLoading, scores, availability, personal } = useLeaderboard(categoryId, difficultyId, limit);
  const rows = scores.query?.phase === "ready" ? scores.query.value.slice(0, limit) : [];
  const hasMore = scores.query?.phase === "ready" && scores.query.value.length > limit;
  const playable = availability.query?.phase === "ready" && availability.query.value > 0;
  const unavailable = availability.query?.phase === "ready" && availability.query.value === 0;
  const ready = scores.query?.phase === "ready";
  const mode = `${categoryLabel} — ${difficultyLabel}`;
  const resultsArea = useRef<HTMLDivElement>(null);
  const [loadingHeight, setLoadingHeight] = useState<number>();
  const [loadingRows, setLoadingRows] = useState(5);
  const visibleCount = rows.length;
  useLayoutEffect(() => {
    if (scores.query && resultsArea.current) {
      setLoadingHeight(resultsArea.current.getBoundingClientRect().height);
      if (scores.query.phase === "ready") setLoadingRows(Math.max(1, visibleCount));
    }
  }, [scores.query, visibleCount]);

  return <>
    <section className="hq-leaderboard-list" aria-labelledby="leaderboard-mode">
      <div className="hq-leaderboard-list-heading"><h2 id="leaderboard-mode">{mode}</h2>{ready && rows.length === limit && <span>Top {limit}</span>}</div>
      <div ref={resultsArea} className="hq-leaderboard-results" aria-busy={!scores.query} style={!scores.query ? { minHeight: loadingHeight } : undefined}>
        {!scores.query ? <><p className="hq-leaderboard-loading" role="status">Loading scores…</p><div className="hq-leaderboard-skeleton" aria-hidden="true">{Array.from({ length: loadingRows }, (_, i) => <div key={i}><span /><span /><span /></div>)}</div></>
          : scores.query.phase === "error" ? <div className="hq-leaderboard-empty" role="alert"><p>Scores could not be loaded.</p><button className="hq-secondary" onClick={scores.retry}>Retry scores</button></div>
          : !rows.length ? <div className="hq-leaderboard-empty"><SiteIcon name="trophy" /><h3>{unavailable ? "This quiz isn’t available yet" : playable ? "No scores yet" : "No scores to show"}</h3><p>{unavailable ? "Choose another category or difficulty to play." : playable ? "Set the first personal best in this quiz." : "Quiz availability is shown below."}</p></div>
          : <table className="hq-leaderboard-table"><caption className="sr-only">{mode}. All-time personal bests.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col" className="hq-leaderboard-numeric">Score</th><th scope="col" className="hq-leaderboard-numeric hq-leaderboard-duration">Quiz duration</th></tr></thead><tbody>
            {rows.map((row, index) => {
              const own = !!user && row.user_id === user.id;
              const duration = formatQuizDuration(row.best_time);
              return <tr key={`${row.user_id ?? row.nickname ?? "anonymous"}:${index}`} className={own ? "hq-leaderboard-own" : undefined}>
                <td><span className={`hq-leaderboard-rank${index < 3 ? ` hq-leaderboard-rank-${index + 1}` : ""}`}><span className="sr-only">Rank </span>{index + 1}</span></td>
                <td className="hq-leaderboard-player"><span className="hq-leaderboard-name">{row.nickname?.trim() || "Anonymous"}</span>{own && <span className="hq-leaderboard-you">You</span>}<span className="hq-leaderboard-mobile-duration">Quiz duration <span>{duration}</span></span></td>
                <td className="hq-leaderboard-numeric hq-leaderboard-score"><strong>{row.best_score}</strong><span className="sr-only"> {row.best_score === 1 ? "point" : "points"}</span></td>
                <td className="hq-leaderboard-numeric hq-leaderboard-duration"><span>{duration}</span></td>
              </tr>;
            })}
          </tbody></table>}
      </div>
      <div className="hq-leaderboard-list-footer">
        <p role="status" aria-live="polite" aria-atomic="true">{ready ? rows.length ? `${rows.length} ${rows.length === 1 ? "player" : "players"} shown${hasMore ? ` · Top ${limit}` : ""}` : "No scores in this quiz." : ""}</p>
        {ready && ((limit === 10 && hasMore) || limit === 20) && <button className="hq-inline-action" onClick={() => setExpandedKey(limit === 10 ? key : null)}>{limit === 10 ? "Show top 20" : "Show top 10"}</button>}
      </div>
    </section>

    {!authLoading && user && <section className="hq-leaderboard-personal" aria-label="Your personal best">
      <div><h3>Your personal best</h3><p>{mode}</p></div>
      {!personal.query ? <p role="status">Loading your record…</p>
        : personal.query.phase === "error" ? <p role="alert">Your record could not be loaded. <button className="hq-inline-action" onClick={personal.retry}>Retry your record</button></p>
        : !personal.query.value ? <p>No score in this quiz yet.</p>
        : <dl><div><dt>Score</dt><dd>{personal.query.value.score}<span> {personal.query.value.score === 1 ? "point" : "points"}</span></dd></div><div><dt>Quiz duration</dt><dd>{formatQuizDuration(personal.query.value.time)}</dd></div></dl>}
    </section>}

    <div className="hq-leaderboard-actions">
      {!availability.query ? <p role="status">Checking quiz availability…</p>
        : availability.query.phase === "error" ? <p role="alert">Quiz availability could not be checked. <button className="hq-inline-action" onClick={availability.retry}>Retry quiz availability</button></p>
        : unavailable && rows.length > 0 ? <p>This quiz is currently unavailable. Saved records are still shown.</p>
        : unavailable && <p>Choose another category or difficulty to play.</p>}
      {playable ? <Link className="hq-primary" to="/play" state={{ categoryId, difficultyId }}>Play this quiz<SiteIcon name="arrow" /></Link> : <button className="hq-primary" disabled>{unavailable ? "Quiz unavailable" : "Play this quiz"}</button>}
      {!authLoading && !user && <aside className="hq-leaderboard-guest" aria-label="Leaderboard account"><p>Log in to save your scores and appear on the leaderboard.</p><button className="hq-inline-action" onClick={openLogin}>Log in</button></aside>}
    </div>
    <details className="hq-leaderboard-rules"><summary>How ranking works</summary><p>Higher scores rank first in the selected category and difficulty. Each player’s saved personal best is shown.</p><p>Quiz duration is the total elapsed time of the saved quiz, including loading and feedback. It keeps running when you switch tabs.</p><p>Guest results stay on the device and don’t appear here. Logging in doesn’t transfer earlier guest results.</p></details>
  </>;
}
