import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useReadRequest } from "../hooks/useReadRequest";
import { getPublicUrl } from "../supabase";
import { personalTop } from "./api";
export default function PersonalTop({ id, owner, refresh = 0 }: { id?: string; owner: string | null; refresh?: number }) {
  const load = useCallback((signal: AbortSignal) => personalTop(id, signal), [id]);
  const read = useReadRequest(`this-that-top:${owner}:${id}:${refresh}`, load, !!id || !!owner);
  return <section className="hq-pick-top" aria-label="Your personal actor top" aria-busy={read.loading}><h2>Your actor favourites</h2><p className="hq-mode-note">Private · Your choices only</p><details className="hq-copy-details"><summary>About your favourites</summary><p>This list takes shape as you compare more actors. Equal places are possible.</p></details>
    {read.loading && <p role="status">Loading your favourites…</p>}
    {read.error && <p role="alert">Your favourites could not load. <button className="hq-inline-action" onClick={read.retry}>Retry favourites</button></p>}
    {read.value && (read.value.length ? <ol>{read.value.map(p => <li key={p.id}><span className="hq-pick-rank">{p.rank}</span><img src={getPublicUrl(p.image_url)} alt="" loading="lazy" /><span>{p.name}</span></li>)}</ol> : <p>Choose a few favourites and your personal top will begin to appear.</p>)}
    {!owner && <p>Guest favourites stay on this device for a limited time. <Link className="hq-inline-action" to="/login?redirect=%2Fthis-or-that">Log in</Link> to save your preferences to your account.</p>}
  </section>;
}
