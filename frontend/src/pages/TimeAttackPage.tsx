import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
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
import TimeAttackIntro from "../timeAttack/TimeAttackIntro";
import AttackLeaderboard from "../timeAttack/AttackLeaderboard";
import "../time-attack.css";

export default function TimeAttackPage() {
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
  const category = catalog.value?.categories.find(c => c.id === Number(params.get("category"))) ?? catalog.value?.categories[0];
  const requested = params.get("level");
  const level: AttackLevel = isLevel(requested) ? requested : "easy";
  const selection = catalog.value?.levels.find(l => l.key === level);
  function select(categoryId: number, level: AttackLevel) {
    const next = new URLSearchParams(params); next.set("category", String(categoryId)); next.set("level", level); setParams(next);
  }
  const canStart = !!category && !!selection && !catalog.loading && !catalog.error && !authLoading && !authError && (!user || profileReady && hasNickname && !profileError);
  function start() {
    if (!canStart || !category) return;
    const run = { id: crypto.randomUUID(), owner, category: category.id, level, confirmed: false };
    writeAttackRun(run); navigate("/time-attack/play", { state: { run } });
  }
  return <div className="hq-attack-page"><Seo {...pageMetadata["time-attack"]} />
    <section className="hq-panel hq-attack-panel"><TimeAttackIntro />
      {catalog.loading && <p role="status">Loading Time Attack options…</p>}
      {catalog.error && <p role="alert">Quiz options could not load. <button className="hq-inline-action" onClick={catalog.retry}>Retry options</button></p>}
      {catalog.value && !catalog.value.categories.length && <p>New questions are on the way. <Link to="/">Play a regular quiz</Link></p>}
      {category && selection && <div className="hq-attack-setup">
        <RadioGroup value={category.id} onChange={id => select(id, level)} aria-label="Time Attack category"><RadioGroup.Label className="hq-legend">Category</RadioGroup.Label><div className="hq-attack-choices">
          {catalog.value!.categories.map(c => <RadioGroup.Option as="button" key={c.id} value={c.id} className="hq-category-option">{({ checked }) => <><span>{c.id === 1 ? "Movie Stills" : c.name}</span>{checked && <SiteIcon name="check" />}</>}</RadioGroup.Option>)}</div></RadioGroup>
        <RadioGroup value={level} onChange={key => select(category.id, key)} aria-label="Time Attack difficulty"><RadioGroup.Label className="hq-legend">Time pressure</RadioGroup.Label><div className="hq-attack-choices">
          {catalog.value!.levels.map(l => <RadioGroup.Option as="button" key={l.key} value={l.key} className="hq-difficulty-option">{({ checked }) => <><span>{l.name} · {l.duration_secs} s</span>{checked && <SiteIcon name="check" />}</>}</RadioGroup.Option>)}</div></RadioGroup>
        <p>{category.bank_size} questions available. Every run mixes Easy, Medium and Hard questions. The level changes your total time.</p>
        {authLoading && <p role="status">Checking account…</p>}
        {authError && <p role="alert">Your sign-in status could not be checked. <button className="hq-inline-action" onClick={retrySession}>Retry sign-in check</button></p>}
        {user && (!profileReady || profileError || !hasNickname) && <p>{profileError ? <button className="hq-inline-action" onClick={retryProfile}>Retry player details</button> : !profileReady ? "Loading player details…" : <button className="hq-inline-action" onClick={chooseNickname}>Choose your nickname to play</button>}</p>}
        <button className="hq-primary" disabled={!canStart} onClick={start}>Start Time Attack <SiteIcon name="arrow" /></button>
        <p>{user ? "Your signed-in records are saved automatically. Starting a new run ends your previous active quiz." : <>Play free as a guest. <Link className="hq-inline-action" to="/login?redirect=%2Ftime-attack">Log in before starting</Link> to join the leaderboard.</>}</p>
      </div>}
      {saved?.owner === owner && !authLoading && !authError && <button className="hq-secondary" onClick={() => navigate("/time-attack/play", { state: { run: saved } })}>Continue or view your last Time Attack</button>}
      {resumeError && <p role="alert">An active run could not be checked. <button className="hq-inline-action" onClick={() => setResumeAttempt(n => n + 1)}>Retry active run</button></p>}
      {category && <AttackLeaderboard category={category.id} level={level} />}
      <Link className="hq-text-action" to="/">Back to regular quiz</Link>
    </section>
  </div>;
}
