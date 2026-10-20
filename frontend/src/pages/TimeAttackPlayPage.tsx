import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getPublicUrl } from "../supabase";
import Seo from "../components/Seo";
import SiteIcon from "../components/SiteIcon";
import ThemeSlider from "../components/ThemeSlider";
import { attackTime, isLevel, levelName } from "../timeAttack/api";
import { readAttackRun } from "../timeAttack/storage";
import type { AttackRun } from "../timeAttack/storage";
import { useTimeAttack } from "../timeAttack/useTimeAttack";
import "../game.css";
import "../time-attack.css";

export default function TimeAttackPlayPage() {
  const { user, loading, error: authError, retrySession } = useAuth();
  const owner = user?.id ?? null;
  const location = useLocation();
  const run = useMemo(() => {
    const requested = (location.state as { run?: AttackRun } | null)?.run;
    const saved = readAttackRun(owner);
    if (requested?.owner === owner && typeof requested.id === "string" && /^[0-9a-f-]{36}$/i.test(requested.id) && [1, 2].includes(requested.category) && isLevel(requested.level) && typeof requested.confirmed === "boolean") {
      return saved?.id === requested.id ? saved : requested;
    }
    return saved;
  }, [location.state, owner]);
  const view = useTimeAttack(run, !loading && !authError);
  const { game, phase, seconds } = view;
  const r = game?.round;
  const [exit, setExit] = useState(false);
  const ready = phase === "playing" && seconds > 0 && !view.working;
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (!ready || exit || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !/^[1-4]$/.test(e.key)) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.isContentEditable || target?.matches("input,textarea,select")) return;
      e.preventDefault(); view.actions.current?.answer(r!.options[Number(e.key) - 1]);
    }
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [ready, exit, r, view.actions]);
  const title = game?.category_id === 2 ? "Actors" : "Movie Stills";
  const query = `category=${game?.category_id ?? run?.category ?? 1}&level=${game?.level ?? run?.level ?? "easy"}`;
  const image = r ? getPublicUrl(r.image_url) : "";
  const imageSrc = view.imageAttempt ? `${image}${image.includes("?") ? "&" : "?"}hq_retry=${view.imageAttempt}` : image;
  const busy = view.working || phase === "checking" || phase === "loading";
  const feedback = r?.outcome === "correct" ? "Correct! +2 points" : r?.outcome === "wrong" ? "Incorrect. −1 point" : "Skipped. −3 seconds";

  return <><Seo title="Play Time Attack | Hard Quiz" description="Race the clock in the movie and actor quiz." noindex />
    <header className="hq-play-header"><Link to="/time-attack" className="hq-brand"><span className="hq-brand-mark"><SiteIcon name="cinema" /></span><span className="hq-brand-label">Hard Quiz</span></Link><div className="hq-play-actions"><ThemeSlider />{game?.status === "active" && <button className="hq-play-exit" disabled={busy} onClick={() => setExit(true)}>End run</button>}</div></header>
    {loading || authError || !run || !game ? <section className="hq-game-placeholder"><h1>{!loading && !run ? "Choose your Time Attack" : "Getting Time Attack ready"}</h1>
      <p role={view.error || authError ? "alert" : "status"}>{authError ? "Your sign-in status could not be checked." : !run && !loading ? "Start a new run or continue your last one from the Time Attack page." : view.error ?? "Loading your server session…"}</p>
      {authError ? <button className="hq-secondary" onClick={retrySession}>Retry sign-in check</button> : view.error && <button className="hq-secondary" disabled={view.working} onClick={() => view.actions.current?.retry()}>Retry Time Attack</button>}
      <Link className="hq-secondary" to="/time-attack">Back to Time Attack</Link></section>
      : game.status === "finished" ? <section className="hq-panel hq-attack-result" aria-labelledby="attack-result-heading">
        <p className="hq-eyebrow">{title} · {levelName(game.level)}</p><h1 id="attack-result-heading">Time Attack result</h1>
        <p>{game.bank_size === 0 ? "No questions were available. This run did not create a record." : game.finish_reason === "time-up" ? "Time’s up!" : game.finish_reason === "completed" ? "You reached the end of the question bank." : "Run ended."}</p>
        <p className="hq-attack-score" aria-label={`Score ${game.score}`}>{game.score}<span> points</span></p>
        <dl className="hq-attack-totals"><div><dt>Correct</dt><dd>{game.correct}</dd></div><div><dt>Wrong</dt><dd>{game.wrong}</dd></div><div><dt>Skipped</dt><dd>{game.skipped}</dd></div></dl>
        <p>Run duration: {attackTime(game.elapsed_ms)}</p><p>Score time: {attackTime(game.score_time_ms!)}. Equal scores use the time to your last accepted answer.</p>
        {game.owner && game.bank_size > 0 ? <><p role="status">Saved with your account.{game.record_outcome === "first" ? " Your first record!" : game.record_outcome === "new" ? " New personal best!" : ""}</p>{game.personal_best && <p>Personal best: {game.personal_best.score} points · {attackTime(game.personal_best.score_time_ms)}</p>}</>
          : !game.owner && <p>Guest result. <Link className="hq-inline-action" to="/login?redirect=%2Ftime-attack">Log in before your next run</Link> to save records. This run stays a guest run.</p>}
        <div className="hq-attack-result-actions"><Link className="hq-primary" to={`/time-attack?${query}`}>Play again <SiteIcon name="arrow" /></Link><Link className="hq-secondary" to="/">Choose another game</Link><Link className="hq-text-action" to={`/leaderboard?mode=time-attack&attack-category=${game.category_id}&level=${game.level}`}>View leaderboard</Link></div>
      </section> : <section className="hq-game hq-attack-game" aria-label="Time Attack game">
        <div className="hq-game-heading"><div><h1>Time Attack</h1><span>{title} · {levelName(game.level)}</span></div><span className="hq-question-number">Question {r?.number ?? "…"}</span></div>
        <div className="hq-game-image" aria-busy={phase === "image-loading" || phase === "loading"}>
          {r && <img key={`${r.id}:${view.imageAttempt}`} src={imageSrc} className={phase === "image-loading" || phase === "loading" ? "hq-image-loading" : ""} draggable={false}
            alt={game.category_id === 2 ? "Actor photograph to identify" : "Movie still to identify"}
            onLoad={e => view.actions.current?.image(r.id, view.imageAttempt, e.currentTarget.naturalWidth > 0)} onError={() => view.actions.current?.image(r.id, view.imageAttempt, false)} />}
          {(phase === "loading" || phase === "image-loading") && <div className="hq-game-image-message" role="status"><span className="hq-game-spinner" />Loading image… The clock keeps running.</div>}
          {phase === "image-error" && <div className="hq-game-image-message"><p role="alert">The image could not load. Your clock keeps running.</p><button className="hq-secondary" onClick={() => view.actions.current?.retry()}>Retry image</button></div>}
        </div>
        <div className="hq-game-timer" aria-label={`${seconds} seconds left`}><div className="hq-game-timer-label"><span><SiteIcon name="timer" />Total time left</span><strong className={seconds <= 10 ? "hq-time-low" : ""}>{seconds}<small> s</small></strong></div><div className="hq-game-time-track"><div className="hq-game-time-fill" style={{ width: `${Math.max(0, Math.min(1, seconds / game.duration_secs)) * 100}%` }} /></div></div>
        <div className="hq-game-answers" aria-label="Answer choices" aria-busy={phase === "checking"}>{r?.options.map((o, i) => <button key={`${r.id}:${i}`} disabled={!ready || exit} className={`hq-game-answer${phase === "feedback" && r.selected === o ? ` hq-answer-${r.outcome}` : ""}`} onClick={() => view.actions.current?.answer(o)} aria-keyshortcuts={String(i + 1)}><span className="hq-answer-key" aria-hidden="true">{i + 1}</span><span className="hq-answer-text">{o}</span></button>)}</div>
        <div className={`hq-game-feedback${phase === "feedback" ? ` hq-feedback-${r?.outcome}` : ""}`} role={phase === "error" ? "alert" : "status"} aria-live="polite">
          {phase === "error" ? <><span>{view.error}</span><button className="hq-inline-action" disabled={view.working} onClick={() => view.actions.current?.retry()}>Retry Time Attack</button></> : phase === "feedback" ? <strong>{feedback}</strong> : phase === "checking" ? <span>Checking your answer…</span> : null}
        </div>
        <div className="hq-game-stats"><span className="hq-game-stat">Score <strong>{game.score}</strong></span><button className="hq-attack-skip hq-secondary" disabled={view.working || !r || !["playing", "image-error", "image-loading"].includes(phase) || seconds === 0 || exit} onClick={() => view.actions.current?.skip()}>Skip · −3 s</button></div>
        <div className="hq-game-footer"><span>Correct {game.correct} · Wrong {game.wrong} · Skipped {game.skipped}</span><span className="hq-game-shortcuts">Keys 1–4 to answer</span></div>
      </section>}
    <Dialog open={exit && game?.status === "active"} onClose={() => setExit(false)} className="hq-game-dialog-root"><div className="hq-game-dialog-backdrop" aria-hidden="true" /><div className="hq-game-dialog-wrap"><Dialog.Panel className="hq-game-dialog"><Dialog.Title>End this Time Attack?</Dialog.Title><Dialog.Description>Your accepted score will be saved. An unanswered question costs no points. The clock keeps running until the server ends the run.</Dialog.Description><div><button className="hq-secondary" autoFocus onClick={() => setExit(false)}>Keep playing</button><button className="hq-primary" onClick={() => { setExit(false); view.actions.current?.finish(); }}>End run & save</button></div></Dialog.Panel></div></Dialog>
  </>;
}
