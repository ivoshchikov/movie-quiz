import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { dailyRanking } from "../leaderboard/api";
import type { Ranking } from "../leaderboard/api";
import type { DailyStreakRow } from "../api";

export default function StreakLeaderboard({ refreshKey }: { refreshKey: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"active" | "all">("active"), [expanded, setExpanded] = useState(false), [retry, setRetry] = useState(0);
  const [view, setView] = useState<{ loading: boolean; error: boolean; ranking: Ranking<DailyStreakRow> | null }>({ loading: true, error: false, ranking: null });
  useEffect(() => {
    let active = true;
    const controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 20000);
    setView({ loading: true, error: false, ranking: null });
    dailyRanking(tab === "active", expanded ? 20 : 5, controller.signal).then(ranking => {
      if (active) setView({ loading: false, error: false, ranking });
    }).catch(() => { if (active) setView({ loading: false, error: true, ranking: null }); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [tab, expanded, retry, refreshKey, user?.id]);
  return <section className="hq-daily-streak-list" aria-label="Daily streak leaderboard">
    <div className="hq-daily-streak-tabs" aria-label="Streak list"><button aria-pressed={tab === "active"} onClick={() => setTab("active")}>Active today</button><button aria-pressed={tab === "all"} onClick={() => setTab("all")}>All-time best</button></div>
    <p>{tab === "active" ? "Correct-day streaks ending today, US Central." : "Each player’s longest streak of correct days."}</p>
    {view.loading ? <p role="status">Loading streaks…</p> : view.error ? <div className="hq-daily-stats-error" role="alert"><span>Streaks couldn’t load.</span><button className="hq-inline-action" onClick={() => setRetry(value => value + 1)}>Retry leaderboard</button></div> : (view.ranking?.top.length ?? 0) ? <ol>{view.ranking!.top.map((row) => <li key={`${row.user_id}:${row.end_d}`} className={row.user_id === user?.id ? "hq-daily-own-row" : ""}><span className="hq-daily-rank" aria-label={`Rank ${row.rank}`}>{row.rank}</span><span className="hq-daily-nickname">{row.nickname || "Anonymous"}{row.user_id === user?.id && <small> (you)</small>}</span><strong>{row.streak}<small> days</small></strong></li>)}</ol> : <p>{tab === "active" ? "No correct-day streaks yet today." : "No streak records yet."}</p>}
    {!view.loading && !view.error && user && view.ranking?.me?.user_id === user.id && <p className="hq-daily-own-row">Your rank: <strong>#{view.ranking.me.rank}</strong> of {view.ranking.total} players · {view.ranking.me.streak} days</p>}
    {!view.loading && !view.error && ((view.ranking?.top.length ?? 0) >= 5 || expanded) && <button className="hq-inline-action" onClick={() => setExpanded(value => !value)}>{expanded ? "Show top 5" : "Show top 20"}</button>}
  </section>;
}
