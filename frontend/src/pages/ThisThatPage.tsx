import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useReadRequest } from "../hooks/useReadRequest";
import Seo from "../components/Seo";
import pageMetadata from "../pageMetadata.json";
import { activeComparison, comparisonCatalog } from "../thisThat/api";
import { fromComparison, readRun, writeRun } from "../thisThat/storage";
import ModeSwitcher from "../components/ModeSwitcher";
import GameModeLinks from "../components/GameModeLinks";
import ModePreview from "../components/ModePreview";
import SiteIcon from "../components/SiteIcon";
import "../modes.css";
import ThisThatIntro from "../thisThat/ThisThatIntro";
import ActorRanking from "../thisThat/ActorRanking";
import PersonalTop from "../thisThat/PersonalTop";
import ImportPreferences from "../thisThat/ImportPreferences";
import BoardSelect from "../thisThat/BoardSelect";
import { useBoard } from "../thisThat/useBoard";
import { boardName, boardUrl, personName } from "../thisThat/boards";
import "../this-that.css";
export function ThisThatSetup({ embedded = false }: { embedded?: boolean }) {
  const [board, setBoard] = useBoard();
  const location = useLocation();
  const { user, loading, error, retrySession } = useAuth(), owner = user?.id ?? null;
  const navigate = useNavigate(), load = useCallback((signal: AbortSignal) => comparisonCatalog(signal), []);
  const catalog = useReadRequest("this-that-catalog", load);
  const [saved, setSaved] = useState(() => readRun(owner, board)), [resumeError, setResumeError] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => { if (loading || error) return; let active = true; const c = new AbortController(); setSaved(readRun(owner, board)); setResumeError(false); if (owner) activeComparison(board, c.signal).then(g => { if (active && g && g.owner === owner && g.round) { const existing = readRun(owner, board); const run = { ...fromComparison(g), ...(existing?.id === g.id && existing.pending ? { pending: existing.pending } : {}) }; writeRun(run); setSaved(run); } }).catch(() => { if (active) setResumeError(true); }); return () => { active = false; c.abort(); }; }, [owner, board, loading, error, refresh]);
  const available = catalog.value?.boards.find(b => b.key === board);
  const currentSaved = saved?.owner === owner && saved.board === board ? saved : null;
  function start() { if (!available || catalog.loading || catalog.error || loading || error) return; const run = { id: crypto.randomUUID(), owner, board, confirmed: false }; writeRun(run); navigate(boardUrl(board, true), { state: { run } }); }
  return <>
    <p className="hq-mode-note">10 pairs · No timer · No wrong answers</p>
    <BoardSelect value={board} onChange={setBoard} />
    {catalog.loading && <p role="status">Loading categories…</p>}{catalog.error && <p role="alert">Categories could not load. <button className="hq-inline-action" onClick={catalog.retry}>Retry categories</button></p>}
    {available && <div className="hq-pick-start"><button className="hq-primary" onClick={start} disabled={loading || !!error || catalog.loading || catalog.error}>Choose my first pair</button><p>{user ? "Your choices save as you go." : <>Guest choices stay personal. <Link className="hq-inline-action" to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}>log in before choosing</Link> to help shape the community ranking.</>}</p></div>}
    {catalog.value && !available && <p>{boardName(board)} are being prepared. Please check back soon.</p>}
    {loading && <p role="status">Checking account…</p>}{error && <p role="alert">Your account could not be checked. <button className="hq-inline-action" onClick={retrySession}>Retry sign-in check</button></p>}
    {currentSaved && !loading && !error && <button className="hq-secondary" onClick={() => navigate(boardUrl(board, true), { state: { run: currentSaved } })}>Continue my choices</button>}
    {resumeError && <p role="alert">Saved choices could not be checked. <button className="hq-inline-action" onClick={() => setRefresh(n => n + 1)}>Retry saved choices</button></p>}
    {owner && <ImportPreferences key={`import:${owner}:${board}`} owner={owner} board={board} onSaved={() => setRefresh(n => n + 1)} />}
    {!embedded && (owner || currentSaved?.owner === null && currentSaved.confirmed) && <details className="hq-copy-details"><summary>Your {personName(board)} favourites</summary><PersonalTop key={`top:${owner ?? "guest"}:${board}`} owner={owner} board={board} id={currentSaved?.id} refresh={refresh} /></details>}
    <Link className="hq-text-action" to="/how-to-play#this-or-that">How it works <SiteIcon name="arrow" /></Link>
  </>;
}

export default function ThisThatPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  return <div className="hq-pick-page"><Seo {...pageMetadata["this-or-that"]} />
    <ModeSwitcher value="this-or-that" onChange={mode => navigate(`/?mode=${mode}`)} />
    <section className="hq-panel hq-mode-panel"><div className="hq-mode-content"><ThisThatIntro /><ThisThatSetup /></div><ModePreview mode="this-or-that" /></section>
    <details className="hq-panel hq-mode-details" open={hash === "#pick-ranking-title"}><summary>Community favourites</summary><ActorRanking /></details>
    <GameModeLinks current="this-or-that" />
  </div>;
}
