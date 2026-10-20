import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams, useLocation } from "react-router-dom";
import { RadioGroup } from "@headlessui/react";
import { useAuth } from "../AuthContext";
import { useReadRequest } from "../hooks/useReadRequest";
import type { SiteOutletContext } from "../components/Layout";
import Seo from "../components/Seo";
import SiteIcon from "../components/SiteIcon";
import pageMetadata from "../pageMetadata.json";
import { activeAttack, attackCatalog, isLevel } from "../timeAttack/api";
import type { AttackLevel } from "../timeAttack/api";
import { readAttackRun, runFromGame, writeAttackRun } from "../timeAttack/storage";
import ModeSwitcher from "../components/ModeSwitcher";
import ModePreview from "../components/ModePreview";
import "../modes.css";
import TimeAttackIntro from "../timeAttack/TimeAttackIntro";
import AttackLeaderboard from "../timeAttack/AttackLeaderboard";
import "../time-attack.css";

export function TimeAttackSetup({ embedded = false }: { embedded?: boolean }) {
  const location = useLocation();
  const categoryKey = embedded ? "attack-category" : "category";
  const { user, loading: authLoading, error: authError, retrySession } = useAuth();
  const owner = user?.id ?? null;
  const { profileReady, hasNickname, profileError, retryProfile, chooseNickname } = useOutletContext<SiteOutletContext>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const load = useCallback((signal: AbortSignal) => attackCatalog(signal), []);
  const catalog = useReadRequest("time-attack-catalog", load);
  const [saved, setSaved] = useState<ReturnType<typeof readAttackRun>>(null);
  const [resumeError, setResumeError] = useState(false);
  const [resumeAttempt, setResumeAttempt] = useState(0);
  useEffect(() => {
    if (authLoading || authError) return;
    let active = true;
    const controller = new AbortController();
    setSaved(readAttackRun(owner)); setResumeError(false);
    if (owner) activeAttack(controller.signal).then(g => {
      if (active && g) { const run = runFromGame(g); writeAttackRun(run); setSaved(run); }
    }).catch(() => { if (active) setResumeError(true); });
    return () => { active = false; controller.abort(); };
  }, [owner, authLoading, authError, resumeAttempt]);
  const category = catalog.value?.categories.find(c => c.id === Number(params.get(categoryKey))) ?? catalog.value?.categories[0];
  const requested = params.get("level");
  const level: AttackLevel = isLevel(requested) ? requested : "easy";
  const selection = catalog.value?.levels.find(l => l.key === level);
  function select(categoryId: number, level: AttackLevel) {
    const next = new URLSearchParams(params); next.set(categoryKey, String(categoryId)); next.set("level", level); setParams(next, { preventScrollReset: true });
  }
  const canStart = !!category && !!selection && !catalog.loading && !catalog.error && !authLoading && !authError && (!user || profileReady && hasNickname && !profileError);
  function start() {
    if (!canStart || !category) return;
    const run = { id: crypto.randomUUID(), owner, category: category.id, level, confirmed: false };
    writeAttackRun(run); navigate("/time-attack/play", { state: { run } });
  }
  return <>
    <div className="hq-rule-summary"><span>+2 correct</span><span>−1 wrong</span><span>Skip −3 s</span></div>
      {catalog.loading && <p role="status">Loading Time Attack options…</p>}
      {catalog.error && <p role="alert">Quiz options could not load. <button className="hq-inline-action" onClick={catalog.retry}>Retry options</button></p>}
      {catalog.value && !catalog.value.categories.length && <p>New questions are on the way. <Link to="/">All games</Link></p>}
      {category && selection && <div className="hq-attack-setup">
        <RadioGroup value={category.id} onChange={id => select(id, level)} aria-label="Time Attack category"><RadioGroup.Label className="hq-legend">Category</RadioGroup.Label><div className="hq-attack-choices">
          {catalog.value!.categories.map(c => <RadioGroup.Option as="button" key={c.id} value={c.id} className="hq-category-option">{({ checked }) => <><span>{c.id === 1 ? "Movie Stills" : c.name}</span>{checked && <SiteIcon name="check" />}</>}</RadioGroup.Option>)}</div></RadioGroup>
        <RadioGroup value={level} onChange={key => select(category.id, key)} aria-label="Time Attack difficulty"><RadioGroup.Label className="hq-legend">Time pressure</RadioGroup.Label><div className="hq-attack-choices">
          {catalog.value!.levels.map(l => <RadioGroup.Option as="button" key={l.key} value={l.key} className="hq-difficulty-option">{({ checked }) => <><span>{l.name} · {l.duration_secs} s</span>{checked && <SiteIcon name="check" />}</>}</RadioGroup.Option>)}</div></RadioGroup>
        <p className="hq-mode-warning">One continuous timer, including loading and time away.</p>
        {authLoading && <p role="status">Checking account…</p>}
        {authError && <p role="alert">Your sign-in status could not be checked. <button className="hq-inline-action" onClick={retrySession}>Retry sign-in check</button></p>}
        {user && (!profileReady || profileError || !hasNickname) && <p>{profileError ? <button className="hq-inline-action" onClick={retryProfile}>Retry player details</button> : !profileReady ? "Loading player details…" : <button className="hq-inline-action" onClick={chooseNickname}>Choose your nickname to play</button>}</p>}
        <button className="hq-primary" disabled={!canStart} onClick={start}>Start Time Attack <SiteIcon name="arrow" /></button>
        <p>{user ? "Starting a new run ends your previous active quiz." : <>Guest play is free. <Link className="hq-inline-action" to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}>Log in before starting</Link> to join the leaderboard.</>}</p>
      </div>}
      {saved?.owner === owner && !authLoading && !authError && <button className="hq-secondary" onClick={() => navigate("/time-attack/play", { state: { run: saved } })}>Continue or view your last Time Attack</button>}
      {resumeError && <p role="alert">An active run could not be checked. <button className="hq-inline-action" onClick={() => setResumeAttempt(n => n + 1)}>Retry active run</button></p>}
    <Link className="hq-text-action" to="/how-to-play#time-attack">How it works <SiteIcon name="arrow" /></Link>
  </>;
}

export default function TimeAttackPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [params] = useSearchParams();
  const load = useCallback((signal: AbortSignal) => attackCatalog(signal), []);
  const catalog = useReadRequest("time-attack-ranking-catalog", load);
  const category = catalog.value?.categories.find(c => c.id === Number(params.get("category"))) ?? catalog.value?.categories[0];
  const requested = params.get("level"), level = isLevel(requested) ? requested : "easy";
  return <div className="hq-attack-page"><Seo {...pageMetadata["time-attack"]} />
    <ModeSwitcher value="time-attack" onChange={mode => navigate(`/?mode=${mode}`)} />
    <section className="hq-panel hq-mode-panel"><div className="hq-mode-content"><TimeAttackIntro /><TimeAttackSetup /></div><ModePreview mode="time-attack" /></section>
    <details id="ranking" className="hq-panel hq-mode-details" open={hash === "#ranking"}><summary>Time Attack leaderboard</summary>{category ? <AttackLeaderboard category={category.id} level={level} anchorId="attack-ranking-list" /> : catalog.error ? <p role="alert">Ranking options could not load. <button className="hq-inline-action" onClick={catalog.retry}>Retry ranking options</button></p> : catalog.loading ? <p role="status">Loading ranking options…</p> : <p>No quizzes available yet.</p>}</details>
    <Link className="hq-text-action" to="/">All games <SiteIcon name="arrow" /></Link>
  </div>;
}
