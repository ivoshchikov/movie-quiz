import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { getDailyStreakLeaderboard } from "../api";
import type { DailyStreakRow } from "../api";

export default function StreakLeaderboard({ refreshKey }: { refreshKey: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"active" | "all">("active"), [expanded, setExpanded] = useState(false), [retry, setRetry] = useState(0);
  const [view, setView] = useState<{ loading: boolean; error: boolean; rows: DailyStreakRow[] }>({ loading: true, error: false, rows: [] });
  useEffect(() => {
    let active = true;
    const controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 20000);
    setView({ loading: true, error: false, rows: [] });
    getDailyStreakLeaderboard(tab === "active", expanded ? 20 : 5, undefined, controller.signal).then(rows => {
      if (active) setView({ loading: false, error: false, rows });
    }).catch(() => { if (active) setView({ loading: false, error: true, rows: [] }); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [tab, expanded, retry, refreshKey]);
  return <section className="hq-daily-streak-list" aria-label="Daily streak leaderboard">
    <div className="hq-daily-streak-tabs" aria-label="Streak list"><button aria-pressed={tab === "active"} onClick={() => setTab("active")}>Active today</button><button aria-pressed={tab === "all"} onClick={() => setTab("all")}>All-time best</button></div>
    <p>{tab === "active" ? "Correct-day streaks ending today, US Central." : "Each player’s longest streak of correct days."}</p>
    {view.loading ? <p role="status">Loading streaks…</p> : view.error ? <div className="hq-daily-stats-error" role="alert"><span>Streaks couldn’t load.</span><button className="hq-inline-action" onClick={() => setRetry(value => value + 1)}>Retry leaderboard</button></div> : view.rows.length ? <ol>{view.rows.map((row, index) => <li key={`${row.user_id}:${row.end_d}`} className={row.user_id === user?.id ? "hq-daily-own-row" : ""}><span className="hq-daily-rank" aria-label={`Rank ${index + 1}`}>{index + 1}</span><span className="hq-daily-nickname">{row.nickname || "Anonymous"}{row.user_id === user?.id && <small> (you)</small>}</span><strong>{row.streak}<small> days</small></strong></li>)}</ol> : <p>{tab === "active" ? "No correct-day streaks yet today." : "No streak records yet."}</p>}
    {!view.loading && !view.error && (view.rows.length >= 5 || expanded) && <button className="hq-inline-action" onClick={() => setExpanded(value => !value)}>{expanded ? "Show top 5" : "Show top 20"}</button>}
  </section>;
}
