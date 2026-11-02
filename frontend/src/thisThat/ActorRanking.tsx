import GameImageCredits from "../components/GameImageCredits";
import { useCallback, useState } from "react";
import { useReadRequest } from "../hooks/useReadRequest";
import { ranking } from "./api";
import { getPublicUrl } from "../supabase";
import BoardSelect from "./BoardSelect";
import { useBoard } from "./useBoard";
import { boardName, personName } from "./boards";
import type { Board } from "./boards";
export default function ActorRanking() {
  const [board, setBoard] = useBoard();
  return <><BoardSelect value={board} onChange={setBoard} /><Ranking key={board} board={board} /></>;
}
function Ranking({ board }: { board: Board }) {
  const [input, setInput] = useState(""), [search, setSearch] = useState("");
  const load = useCallback((signal: AbortSignal) => ranking(board, search, signal), [board, search]);
  const read = useReadRequest(`people-ranking:${board}:${search}`, load);
  return <section className="hq-pick-ranking" aria-labelledby="pick-ranking-title" aria-busy={read.loading}><h2 id="pick-ranking-title">Community favourites</h2><details className="hq-copy-details"><summary>How ranking works</summary><p>Top 20 {boardName(board).toLowerCase()}. Places appear once enough different people have made their choices. The ranking updates periodically; early places may change. These are {personName(board)} favourites.</p></details><form className="hq-pick-search" onSubmit={e => { e.preventDefault(); setSearch(input.trim()); }}><label htmlFor="pick-search">Find an {personName(board)}’s place</label><div><input id="pick-search" type="search" value={input} maxLength={80} onChange={e => setInput(e.target.value)} placeholder={board === "actors" ? "Actor’s name" : "Actress’s name"} /><button className="hq-secondary" type="submit">Search</button>{search && <button className="hq-text-action" type="button" onClick={() => { setInput(""); setSearch(""); }}>Show top 20</button>}</div></form>
    {read.loading && <p role="status">Loading community favourites…</p>}{read.error && <p role="alert">The ranking could not load. <button className="hq-inline-action" onClick={read.retry}>Retry ranking</button></p>}
    {read.value && (read.value.rows.length ? <><p>{read.value.total} ranked {boardName(board).toLowerCase()}</p><ol className="hq-pick-rank-list">{read.value.rows.map(p => <li key={p.id}><span className="hq-pick-rank" aria-label={p.rank ? `Place ${p.rank}` : "Collecting choices"}>{p.rank ?? "—"}</span><img alt="" src={getPublicUrl(p.image_url)} loading="lazy" /><div><strong>{p.name}</strong>{p.rank === null ? <span>Collecting choices</span> : p.provisional && <span>Early ranking</span>}<GameImageCredits mode="comparison" person={p.id} imagePath={p.image_url} label={`Image credits for ${p.name}`} /></div></li>)}</ol></> : <p>{search ? `No ${boardName(board).toLowerCase()} match that name.` : "The first ranking is taking shape. Make your choices and come back as more people join in."}</p>)}
  </section>;
}
