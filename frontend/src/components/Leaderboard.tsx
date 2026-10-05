import { useEffect, useState } from "react";
import { getLeaderboard } from "../api";
import type { LeaderboardRow } from "../api";

interface Props { categoryId?: number; difficultyId?: number; categoryLabel?: string; difficultyLabel?: string; }
function formatTime(time: number) {
  return `${Math.floor(time / 60).toString().padStart(2, "0")}:${Math.floor(time % 60).toString().padStart(2, "0")}`;
}
export default function Leaderboard({ categoryId, difficultyId, categoryLabel, difficultyLabel }: Props) {
  const [result, setResult] = useState<{ key: string; rows?: LeaderboardRow[]; error?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ready = categoryId != null && difficultyId != null;
  const key = `${categoryId}:${difficultyId}`;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    let active = true;
    setResult(null);
    if (categoryId == null || difficultyId == null) return;
    getLeaderboard(categoryId, difficultyId, 5)
      .then(rows => { if (active) setResult({ key, rows }); })
      .catch(() => { if (active) setResult({ key, error: true }); });
    return () => { active = false; };
  }, [categoryId, difficultyId, key, attempt]);
  return <section>
    <h2 className="hq-section-heading" style={{ marginBottom: 6 }}>Global leaderboard</h2>
    <p className="hq-status">{categoryLabel && difficultyLabel ? `${categoryLabel} — ${difficultyLabel}` : "Pick a category and level to see top scores"}</p>
    {!ready ? <p className="hq-status">Select both category and level.</p>
      : !current ? <p role="status" className="hq-status">Loading scores…</p>
      : current.error ? <p role="alert" className="hq-status">Scores could not be loaded. <button className="hq-inline-action" onClick={() => setAttempt(value => value + 1)}>Try again</button></p>
      : !current.rows?.length ? <p className="hq-status">Be the first to set a score!</p>
      : <div className="hq-table-wrapper"><table className="hq-table"><thead><tr><th>#</th><th>Nickname</th><th className="hq-numeric">Score</th><th className="hq-numeric">Time</th></tr></thead><tbody>
        {current.rows.map((row, index) => <tr key={`${row.nickname}:${index}`}><td>{index + 1}</td><td>{row.nickname || "Anonymous"}</td><td className="hq-numeric">{row.best_score}</td><td className="hq-numeric">{formatTime(row.best_time)}</td></tr>)}
      </tbody></table></div>}
  </section>;
}
