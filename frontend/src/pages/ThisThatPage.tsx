import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useReadRequest } from "../hooks/useReadRequest";
import Seo from "../components/Seo";
import pageMetadata from "../pageMetadata.json";
import { activeComparison, comparisonCatalog } from "../thisThat/api";
import { fromComparison, readRun, writeRun } from "../thisThat/storage";
import ModeSwitcher from "../components/ModeSwitcher";
import ModePreview from "../components/ModePreview";
import SiteIcon from "../components/SiteIcon";
import "../modes.css";
import ThisThatIntro from "../thisThat/ThisThatIntro";
import ActorRanking from "../thisThat/ActorRanking";
import PersonalTop from "../thisThat/PersonalTop";
import ImportPreferences from "../thisThat/ImportPreferences";
import "../this-that.css";
export function ThisThatSetup({ embedded = false }: { embedded?: boolean }) {
  const location = useLocation();
  const { user, loading, error, retrySession } = useAuth(), owner = user?.id ?? null;
  const navigate = useNavigate(), load = useCallback((signal: AbortSignal) => comparisonCatalog(signal), []);
  const catalog = useReadRequest("this-that-catalog", load);
  const [saved, setSaved] = useState(() => readRun(owner)), [resumeError, setResumeError] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => { if (loading || error) return; let active = true; const c = new AbortController(); setSaved(readRun(owner)); setResumeError(false); if (owner) activeComparison(c.signal).then(g => { if (active && g && g.owner === owner) { const existing = readRun(owner); const run = { ...fromComparison(g), ...(existing?.id === g.id && existing.pending ? { pending: existing.pending } : {}) }; writeRun(run); setSaved(run); } }).catch(() => { if (active) setResumeError(true); }); return () => { active = false; c.abort(); }; }, [owner, loading, error, refresh]);
  const available = catalog.value?.boards.find(b => b.key === "actors");
  function start() { if (!available || loading || error) return; const run = { id: crypto.randomUUID(), owner, board: "actors" as const, confirmed: false }; writeRun(run); navigate("/this-or-that/play", { state: { run } }); }
  return <>
    <p className="hq-mode-note">10 pairs · No timer · No wrong answers</p>
    {catalog.loading && <p role="status">Loading actors…</p>}{catalog.error && <p role="alert">Actors could not load. <button className="hq-inline-action" onClick={catalog.retry}>Retry actors</button></p>}
    {available && <div className="hq-pick-start"><button className="hq-primary" onClick={start} disabled={loading || !!error}>Choose my first pair</button><p>{user ? "Your choices save as you go." : <>Guest choices stay personal. <Link className="hq-inline-action" to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}>log in before choosing</Link> to help shape the community ranking.</>}</p></div>}
    {catalog.value && !available && <p>Actors are being prepared. Please check back soon.</p>}
    {loading && <p role="status">Checking account…</p>}{error && <p role="alert">Your account could not be checked. <button className="hq-inline-action" onClick={retrySession}>Retry sign-in check</button></p>}
    {saved?.owner === owner && !loading && !error && <button className="hq-secondary" onClick={() => navigate("/this-or-that/play", { state: { run: saved } })}>Continue my choices</button>}
    {resumeError && <p role="alert">Saved choices could not be checked. <button className="hq-inline-action" onClick={() => setRefresh(n => n + 1)}>Retry saved choices</button></p>}
    {owner && <ImportPreferences key={`import:${owner}`} owner={owner} onSaved={() => setRefresh(n => n + 1)} />}
    {!embedded && (owner || saved?.owner === null && saved.confirmed) && <details className="hq-copy-details"><summary>Your actor favourites</summary><PersonalTop key={`top:${owner ?? "guest"}`} owner={owner} id={saved?.owner === owner ? saved.id : undefined} refresh={refresh} /></details>}
    <Link className="hq-text-action" to="/how-to-play#this-or-that">How it works <SiteIcon name="arrow" /></Link>
  </>;
}

export default function ThisThatPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  return <div className="hq-pick-page"><Seo {...pageMetadata["this-or-that"]} />
    <ModeSwitcher value="this-or-that" onChange={mode => navigate(`/?mode=${mode}`)} />
    <section className="hq-panel hq-mode-panel"><div className="hq-mode-content"><ThisThatIntro /><ThisThatSetup /></div><ModePreview mode="this-or-that" /></section>
    <details className="hq-panel hq-mode-details" open={hash === "#pick-ranking-title"}><summary>Actor favourites</summary><ActorRanking /></details>
    <Link className="hq-text-action" to="/">All games <SiteIcon name="arrow" /></Link>
  </div>;
}
