import GameImageCredits from "../components/GameImageCredits";
import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useReadRequest } from "../hooks/useReadRequest";
import { getPublicUrl } from "../supabase";
import { personalTop } from "./api";
import { boardName, boardUrl, personName } from "./boards";
import type { Board } from "./boards";
import { useBoard } from "./useBoard";
import BoardSelect from "./BoardSelect";
export default function PersonalTop({ id, owner, board: requestedBoard, selectable = false, refresh = 0 }: { id?: string; owner: string | null; board?: Board; selectable?: boolean; refresh?: number }) {
  const [selected, setSelected] = useBoard();
  const board = requestedBoard ?? selected;
  const load = useCallback((signal: AbortSignal) => personalTop(board, id, signal), [id, board]);
  const read = useReadRequest(`this-that-top:${owner}:${board}:${id}:${refresh}`, load, !!id || !!owner);
  return <section className="hq-pick-top" aria-label={`Your personal ${personName(board)} top`} aria-busy={read.loading}><h2>Your {personName(board)} favourites</h2>{selectable && <BoardSelect value={board} onChange={setSelected} />}<p className="hq-mode-note">Private · Your choices only</p><details className="hq-copy-details"><summary>About your favourites</summary><p>This list takes shape as you compare more {boardName(board).toLowerCase()}. Equal places are possible.</p></details>
    {read.loading && <p role="status">Loading your favourites…</p>}
    {read.error && <p role="alert">Your favourites could not load. <button className="hq-inline-action" onClick={read.retry}>Retry favourites</button></p>}
    {read.value && (read.value.length ? <ol>{read.value.map(p => <li key={p.id}><span className="hq-pick-rank">{p.rank}</span><img src={getPublicUrl(p.image_url)} alt="" loading="lazy" /><div><span>{p.name}</span><GameImageCredits mode="comparison" person={p.id} imagePath={p.image_url} label={`Image credits for ${p.name}`} /></div></li>)}</ol> : <p>Choose a few favourites and your personal top will begin to appear.</p>)}
    {!owner && <p>Guest favourites stay on this device for a limited time. <Link className="hq-inline-action" to={`/login?redirect=${encodeURIComponent(boardUrl(board))}`}>Log in</Link> to save your preferences to your account.</p>}
  </section>;
}
