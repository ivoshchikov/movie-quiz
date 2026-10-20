import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useReadRequest } from "../hooks/useReadRequest";
import { attackTime, levelName, myAttackBests } from "./api";
import "../time-attack.css";

export default function AttackProfileRecords({ owner, refresh }: { owner: string; refresh: number }) {
  const load = useCallback((signal: AbortSignal) => myAttackBests(signal), []);
  const read = useReadRequest(`${owner}:${refresh}:time-attack`, load, !!owner);
  return <section className="hq-attack-profile" aria-labelledby="attack-profile-heading" aria-busy={read.loading}>
    <h2 id="attack-profile-heading">Time Attack records</h2><details className="hq-copy-details"><summary>About these records</summary><p>Separate records for each category and time pressure. Equal scores use the time to your last accepted answer.</p></details>
    {read.loading && <p role="status">Loading Time Attack records…</p>}
    {read.error && <p role="alert">Your Time Attack records could not load. <button className="hq-inline-action" onClick={read.retry}>Retry Time Attack records</button></p>}
    {read.value && (read.value.length ? <div className="hq-attack-table-scroll"><table><caption className="sr-only">Your Time Attack personal bests</caption><thead><tr><th>Quiz</th><th>Score</th><th>Score time</th><th>Leaderboard</th></tr></thead><tbody>{read.value.map(r => <tr key={`${r.category_id}:${r.level}`}><th scope="row">{r.category_id === 1 ? "Movie Stills" : "Actors"} · {levelName(r.level)}</th><td>{r.score}</td><td>{attackTime(r.score_time_ms)}</td><td><Link className="hq-inline-action" to={`/leaderboard?mode=time-attack&attack-category=${r.category_id}&level=${r.level}`}>View ranking</Link></td></tr>)}</tbody></table></div> : <p>No Time Attack records yet. Complete a run while logged in to save your first one.</p>)}
    <Link className="hq-text-action" to="/time-attack">Play Time Attack</Link>
  </section>;
}
