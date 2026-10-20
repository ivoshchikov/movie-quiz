import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useReadRequest } from "../hooks/useReadRequest";
import { attackRanking, attackTime, levelName } from "./api";
import type { AttackLevel, AttackRank } from "./api";

export default function AttackLeaderboard({ category, level, refresh = 0, anchorId = "ranking" }: { category: number; level: AttackLevel; refresh?: number; anchorId?: string }) {
  const { user } = useAuth();
  const load = useCallback((signal: AbortSignal) => attackRanking(category, level, signal), [category, level]);
  const read = useReadRequest(`${user?.id}:${category}:${level}:${refresh}`, load);
  const ranking = read.value;
  const own = ranking?.me;
  const rows = ranking ? [...ranking.top, ...(own && !ranking.top.some(r => r.user_id === own.user_id) ? [own] : [])] : [];
  function row(r: AttackRank) {
    const me = r.user_id === user?.id;
    return <tr key={r.user_id} className={me ? "hq-attack-own" : undefined}><th scope="row">{r.rank}</th><td>{r.nickname}{me && <span> (you)</span>}</td><td>{r.score}</td><td>{attackTime(r.score_time_ms)}</td></tr>;
  }
  return <section id={anchorId} className="hq-attack-ranking" aria-labelledby="attack-ranking-heading" aria-busy={read.loading}>
    <h2 id="attack-ranking-heading">Time Attack leaderboard</h2><p>{category === 1 ? "Movie Stills" : "Actors"} · {levelName(level)}</p>
    <details className="hq-copy-details"><summary>How ranking works</summary><p>Higher score wins. Score time is the time to the last accepted answer that forms your final score, not total run duration. Equal scores use lower Score time; exact ties keep a stable order.</p></details>
    {read.loading && <p role="status">Loading Time Attack leaderboard…</p>}
    {read.error && <p role="alert">The leaderboard could not load. <button className="hq-inline-action" onClick={read.retry}>Retry leaderboard</button></p>}
    {ranking && (rows.length ? <><p>{ranking.total} {ranking.total === 1 ? "player" : "players"} · Top 10{user && " and your position"}</p>
      <div className="hq-attack-table-scroll"><table><caption className="sr-only">Time Attack ranked records</caption><thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Score time</th></tr></thead><tbody>{rows.map(row)}</tbody></table></div>
      {user && !own && <p>Complete a signed-in run to earn your place.</p>}</> : <p>No records yet. Set the first score.</p>)}
    {!user && <p><Link className="hq-inline-action" to="/login?redirect=%2Ftime-attack">Log in before starting</Link> to save records and see your position.</p>}
  </section>;
}
