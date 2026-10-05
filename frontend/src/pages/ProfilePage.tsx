import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getMyBest } from "../api";
import type { UserBestRow } from "../api";
import { useAuth } from "../AuthContext";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import type { SiteOutletContext } from "../components/Layout";
import Seo from "../components/Seo";

function formatTime(time: number) {
  return `${Math.floor(time / 60).toString().padStart(2, "0")}:${Math.floor(time % 60).toString().padStart(2, "0")}`;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { editNickname } = useOutletContext<SiteOutletContext>();
  const catalog = useQuizCatalog();
  const [rows, setRows] = useState<UserBestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!user) return;
    setLoading(true);
    setError(false);
    getMyBest(user.id).then(value => { if (active) setRows(value); })
      .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, attempt]);

  return <div className="hq-page">
    <Seo title="My Results | Hard Quiz" noindex />
    <h1 className="hq-page-heading">My results</h1>
    <p className="hq-page-copy">Your personal best for each category and difficulty.</p>
    <section className="hq-panel hq-page-panel">
      <div className="hq-page-actions"><h2 className="hq-section-heading" style={{ marginBottom: 0 }}>Personal bests</h2><button className="hq-secondary" onClick={editNickname}>Change nickname</button></div>
      {loading || catalog.loading ? <p role="status" className="hq-status">Loading your results…</p>
        : error || catalog.error ? <p role="alert" className="hq-status">Your results could not be loaded. <button className="hq-inline-action" onClick={() => { setAttempt(value => value + 1); catalog.reload(); }}>Try again</button></p>
        : !rows.length ? <p className="hq-status">Your first score is waiting. <Link to="/" className="hq-inline-action">Start a quiz</Link></p>
        : <div className="hq-table-wrapper"><table className="hq-table"><thead><tr><th>Category</th><th>Difficulty</th><th className="hq-numeric">Score</th><th className="hq-numeric">Time</th></tr></thead><tbody>
          {rows.map(row => {
            const category = catalog.categories.find(cat => cat.id === row.category_id);
            const difficulty = catalog.difficulties.find(level => level.id === row.difficulty_level_id);
            return <tr key={`${row.category_id}:${row.difficulty_level_id}`}><td>{category ? categoryLabel(category) : `Category ${row.category_id}`}</td><td>{difficulty?.name ?? `Level ${row.difficulty_level_id}`}</td><td className="hq-numeric">{row.best_score}</td><td className="hq-numeric">{formatTime(row.best_time)}</td></tr>;
          })}
        </tbody></table></div>}
    </section>
  </div>;
}
