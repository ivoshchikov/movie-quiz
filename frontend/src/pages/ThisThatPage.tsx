import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useReadRequest } from "../hooks/useReadRequest";
import Seo from "../components/Seo";
import pageMetadata from "../pageMetadata.json";
import { activeComparison, comparisonCatalog } from "../thisThat/api";
import { fromComparison, readRun, writeRun } from "../thisThat/storage";
import ThisThatIntro from "../thisThat/ThisThatIntro";
import ActorRanking from "../thisThat/ActorRanking";
import PersonalTop from "../thisThat/PersonalTop";
import ImportPreferences from "../thisThat/ImportPreferences";
import "../this-that.css";
export default function ThisThatPage() {
  const { user, loading, error, retrySession } = useAuth(), owner = user?.id ?? null;
  const navigate = useNavigate(), load = useCallback((signal: AbortSignal) => comparisonCatalog(signal), []);
  const catalog = useReadRequest("this-that-catalog", load);
  const [saved, setSaved] = useState(() => readRun(owner)), [resumeError, setResumeError] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => { if (loading || error) return; let active = true; const c = new AbortController(); setSaved(readRun(owner)); setResumeError(false); if (owner) activeComparison(c.signal).then(g => { if (active && g && g.owner === owner) { const existing = readRun(owner); const run = { ...fromComparison(g), ...(existing?.id === g.id && existing.pending ? { pending: existing.pending } : {}) }; writeRun(run); setSaved(run); } }).catch(() => { if (active) setResumeError(true); }); return () => { active = false; c.abort(); }; }, [owner, loading, error, refresh]);
  const available = catalog.value?.boards.find(b => b.key === "actors");
  function start() { if (!available || loading || error) return; const run = { id: crypto.randomUUID(), owner, board: "actors" as const, confirmed: false }; writeRun(run); navigate("/this-or-that/play", { state: { run } }); }
  return <div className="hq-pick-page"><Seo {...pageMetadata["this-or-that"]} /><section className="hq-panel hq-pick-panel"><ThisThatIntro />
    {catalog.loading && <p role="status">Loading actors…</p>}{catalog.error && <p role="alert">Actors could not load. <button className="hq-inline-action" onClick={catalog.retry}>Retry actors</button></p>}
    {available && <div className="hq-pick-start"><p>{available.people} actors · {available.pairs.toLocaleString("en-US")} possible pairs</p><button className="hq-primary" onClick={start} disabled={loading || !!error}>Choose my first pair</button><p>{user ? "Your choices are saved as you go. Verified account choices can contribute to the community ranking." : <>Play as a guest, or <Link className="hq-inline-action" to="/login?redirect=%2Fthis-or-that">log in before choosing</Link> to help shape the community ranking. Guest choices stay personal.</>}</p></div>}
    {catalog.value && !available && <p>Actors are being prepared. Please check back soon.</p>}
    {loading && <p role="status">Checking account…</p>}{error && <p role="alert">Your account could not be checked. <button className="hq-inline-action" onClick={retrySession}>Retry sign-in check</button></p>}
    {saved?.owner === owner && !loading && !error && <button className="hq-secondary" onClick={() => navigate("/this-or-that/play", { state: { run: saved } })}>Continue my choices</button>}
    {resumeError && <p role="alert">Saved choices could not be checked. <button className="hq-inline-action" onClick={() => setRefresh(n => n + 1)}>Retry saved choices</button></p>}
    {owner && <ImportPreferences key={`import:${owner}`} owner={owner} onSaved={() => setRefresh(n => n + 1)} />}
    {(owner || saved?.owner === null && saved.confirmed) && <PersonalTop key={`top:${owner ?? "guest"}`} owner={owner} id={saved?.owner === owner ? saved.id : undefined} refresh={refresh} />}
    <ActorRanking /><Link className="hq-text-action" to="/">Back to regular quiz</Link>
  </section></div>;
}
