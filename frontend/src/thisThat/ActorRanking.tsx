import { useCallback, useState } from "react";
import { useReadRequest } from "../hooks/useReadRequest";
import { ranking } from "./api";
import { getPublicUrl } from "../supabase";
export default function ActorRanking() {
  const [input, setInput] = useState(""), [search, setSearch] = useState("");
  const load = useCallback((signal: AbortSignal) => ranking(search, signal), [search]);
  const read = useReadRequest(`actor-ranking:${search}`, load);
  return <section className="hq-pick-ranking" aria-labelledby="pick-ranking-title" aria-busy={read.loading}><h2 id="pick-ranking-title">Community favourites</h2><p>Top 20 actors. Places appear once enough different people have made their choices. The ranking updates periodically; early places may change.</p><form className="hq-pick-search" onSubmit={e => { e.preventDefault(); setSearch(input.trim()); }}><label htmlFor="pick-search">Find an actor’s place</label><div><input id="pick-search" type="search" value={input} maxLength={80} onChange={e => setInput(e.target.value)} placeholder="Actor’s name" /><button className="hq-secondary" type="submit">Search</button>{search && <button className="hq-text-action" type="button" onClick={() => { setInput(""); setSearch(""); }}>Show top 20</button>}</div></form>
    {read.loading && <p role="status">Loading community favourites…</p>}{read.error && <p role="alert">The ranking could not load. <button className="hq-inline-action" onClick={read.retry}>Retry ranking</button></p>}
    {read.value && (read.value.rows.length ? <><p>{read.value.total} ranked of {read.value.candidates} actors</p><ol className="hq-pick-rank-list">{read.value.rows.map(p => <li key={p.id}><span className="hq-pick-rank" aria-label={p.rank ? `Place ${p.rank}` : "Collecting choices"}>{p.rank ?? "—"}</span><img alt="" src={getPublicUrl(p.image_url)} loading="lazy" /><div><strong>{p.name}</strong>{p.rank === null ? <span>Collecting choices</span> : p.provisional && <span>Early ranking</span>}</div></li>)}</ol></> : <p>{search ? "No actors match that name." : "The first ranking is taking shape. Make your choices and come back as more people join in."}</p>)}
  </section>;
}
