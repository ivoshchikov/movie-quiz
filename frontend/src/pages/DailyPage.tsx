import { useEffect, useRef, useState } from "react";
import { Dialog } from "@headlessui/react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getCategories } from "../api";
import type { Category } from "../api";
import type { SiteOutletContext } from "../components/Layout";
import { categoryLabel } from "../hooks/useQuizCatalog";
import { useDailyGame } from "../daily/useDailyGame";
import { dailyDateLabel, dailyTime } from "../daily/time";
import { guardGameNavigation } from "../game/navigationGuard";
import Seo from "../components/Seo";
import SiteIcon from "../components/SiteIcon";
import YourDailyCard from "../components/YourDailyCard";
import StreakLeaderboard from "../components/StreakLeaderboard";
import "../game.css";
import "../daily.css";

const ORIGIN = (import.meta.env.VITE_SITE_URL as string) || "https://hard-quiz.com";
export default function DailyPage() {
  const { user, loading: authLoading } = useAuth();
  const { openLogin, chooseNickname, setDailyPlaying, profileReady, hasNickname, profileError, retryProfile } = useOutletContext<SiteOutletContext>();
  const game = useDailyGame(user?.id ?? null, authLoading);
  const navigate = useNavigate(), location = useLocation();
  const [exitOpen, setExitOpen] = useState(false), [rankingOpen, setRankingOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const playingView = ["image-loading", "image-error", "starting", "start-error", "playing"].includes(game.phase);
  const pending = game.phase === "saving" || game.phase === "save-error";
  const compact = playingView || pending;
  const active = !!game.run;
  const ready = game.phase === "playing";
  const category = categories.find(cat => cat.id === game.question?.category_id);
  const label = category ? categoryLabel(category) : "Daily Challenge";
  const portrait = label === "Actors" || label === "Actresses";
  const exitText = !game.storageAvailable ? "Browser storage is unavailable. Leaving may lose this attempt. Keep this page open to finish and save your answer." :
    game.run?.pending ? "Your selected answer still needs confirmation. Return on this device to retry saving the same answer and time." :
      "You can return on this device before the next Daily reset to finish this attempt. Your answer timer keeps running while you’re away.";

  useEffect(() => { let active = true; getCategories().then(value => { if (active) setCategories(value); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => { setDailyPlaying(compact); return () => setDailyPlaying(false); }, [compact, setDailyPlaying]);
  useEffect(() => { setExitOpen(false); setRankingOpen(false); }, [user?.id, game.date]);
  useEffect(() => { if (game.phase === "result") resultHeading.current?.focus({ preventScroll: true }); }, [game.phase]);
  useEffect(() => {
    if (!active) return;
    const originalIndex = window.history.state?.idx as number | undefined;
    let restoring = false;
    function popState(event: PopStateEvent) {
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (event.state?.key === location.key) return;
      if (window.confirm(`Leave Daily? ${exitText}`)) return;
      const target = event.state?.idx as number | undefined;
      if (originalIndex != null && target != null) {
        event.stopImmediatePropagation(); restoring = true; window.history.go(originalIndex - target);
      }
    }
    function beforeUnload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    const release = guardGameNavigation(popState);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { release(); window.removeEventListener("beforeunload", beforeUnload); };
  }, [active, location.key, exitText]);
  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (!ready || exitOpen || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.isContentEditable || target?.matches("input, textarea, select")) return;
      if (/^[1-4]$/.test(event.key)) { event.preventDefault(); game.actions.current?.answer(game.options[Number(event.key) - 1]); }
    }
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [ready, exitOpen, game.actions, game.options]);

  const start = () => { if (!profileReady) return; if (!hasNickname) { chooseNickname(); return; } game.actions.current?.start(); };
  const question = game.question;
  const result = game.result;
  const correct = result?.is_correct;
  const shareText = correct ? `I solved the Hard Quiz Daily for ${dailyDateLabel(game.date)}! Can you?` : `I played the Hard Quiz Daily for ${dailyDateLabel(game.date)}. Try it yourself!`;
  const previousDay = game.date !== game.today;
  const next = <div className="hq-daily-next"><span>Next challenge in <strong>{dailyTime(game.resetIn)}</strong></span><small>Resets at midnight US Central (America/Chicago).</small></div>;

  return <>
    <Seo title="Daily Challenge | Hard Quiz" description="One image. One answer each day. Log in, solve the Daily and build your streak." ogImage={`${ORIGIN}/api/og/daily?d=${encodeURIComponent(game.date)}`} url={`${ORIGIN}/daily`} />
    {compact && <header className="hq-play-header"><button className="hq-brand" onClick={() => setExitOpen(true)} aria-label="Hard Quiz — leave Daily"><span className="hq-brand-mark"><SiteIcon name="cinema" /></span>Hard Quiz</button><button className="hq-play-exit" onClick={() => setExitOpen(true)}><SiteIcon name="logout" />Leave Daily</button></header>}
    {playingView && question ? <section className="hq-game hq-daily-game" aria-label="Daily question">
      <div className="hq-game-heading"><div><h1>{label}</h1><span>Daily</span></div><time className="hq-question-number" dateTime={game.date}>{dailyDateLabel(game.date)}</time></div>
      <div className="hq-game-image" aria-busy={game.phase === "image-loading" || game.phase === "starting"}>
        {!["image-error", "start-error"].includes(game.phase) && <img key={`${question.id}:${game.imageAttempt}`} src={game.imageAttempt ? `${question.image_url}${question.image_url.includes("?") ? "&" : "?"}hq_retry=${game.imageAttempt}` : question.image_url}
          alt={portrait ? "Actor photograph to identify" : "Daily image to identify"} draggable={false} className={!ready ? "hq-image-loading" : ""}
          onLoad={event => event.currentTarget.naturalWidth > 0 ? game.actions.current?.imageReady(question.id, game.imageAttempt) : game.actions.current?.imageFailed(question.id, game.imageAttempt)} onError={() => game.actions.current?.imageFailed(question.id, game.imageAttempt)} />}
        {!["playing", "image-error", "start-error"].includes(game.phase) && <div className="hq-game-image-message" role="status"><span className="hq-game-spinner" /><span>{game.phase === "starting" ? "Starting your attempt…" : "Loading image…"}</span></div>}
        {["image-error", "start-error"].includes(game.phase) && <div className="hq-game-image-message"><p role="alert">{game.phase === "image-error" ? "The image couldn’t load." : "Your attempt couldn’t start. Please try again."}</p><span>{game.run ? "Your existing answer timer keeps running." : "Your answer timer hasn’t started."}</span><button className="hq-secondary" onClick={() => game.actions.current?.retry()}>Try again</button></div>}
      </div>
      <div className="hq-game-answers" aria-label="Answer choices">{game.options.map((option, index) => <button key={option} className="hq-game-answer" disabled={!ready || exitOpen} aria-label={option} aria-keyshortcuts={String(index + 1)} onClick={() => game.actions.current?.answer(option)}><span className="hq-answer-key" aria-hidden="true">{index + 1}</span><span className="hq-answer-text">{option}</span></button>)}</div>
      <div className="hq-daily-timer"><span><SiteIcon name="timer" />Answer time</span><strong aria-label={`${game.elapsed} seconds elapsed`}>{ready || game.run ? dailyTime(game.elapsed) : "Not started"}</strong></div>
      <div className="hq-game-feedback" role="status">{ready ? <span>{portrait ? "Who is in the picture?" : "Which title matches the image?"} Choose one answer.</span> : <span>Answers unlock when your attempt is ready.</span>}</div>
      <div className="hq-game-footer"><span>One answer today · No time limit</span><span className="hq-game-shortcuts">Use keys <kbd>1</kbd>–<kbd>4</kbd></span></div>
      {!game.storageAvailable && <p className="hq-daily-storage" role="status">Browser storage is unavailable. Keep this page open until your answer is saved.</p>}
    </section> : <div className={`hq-daily-page${pending ? " hq-daily-pending" : ""}`}>
      <section className="hq-daily-card" aria-label="Daily Challenge">
        <div className="hq-daily-meta"><span><SiteIcon name="calendar" />Daily Challenge</span><time dateTime={game.date}>{dailyDateLabel(game.date)}</time></div>
        {game.phase === "loading" ? <div className="hq-daily-content" role="status"><span className="hq-game-spinner" /><h1>Getting Daily ready</h1><p>Checking today’s challenge…</p></div> :
          pending ? <div className="hq-daily-content" aria-live="polite"><span className="hq-daily-symbol"><SiteIcon name="timer" /></span><h1>{game.phase === "saving" ? "Saving your answer" : "Let’s confirm your answer"}</h1>
            <p role={game.phase === "save-error" ? "alert" : undefined}>{game.phase === "saving" ? "Please wait while we confirm your result." : "We haven’t confirmed a saved result. Retry checks your account first, then sends the same answer and time if needed."}</p>
            <div className="hq-daily-answer-summary"><span>Selected answer</span><strong>{game.run?.pending?.selected}</strong><span>Answer time <b>{dailyTime(game.elapsed)}</b></span></div>
            {game.phase === "save-error" && <button className="hq-primary" onClick={() => game.actions.current?.retry()}>Retry saving</button>}
            {!game.storageAvailable && <p className="hq-daily-storage">Browser storage is unavailable. Keep this page open until your answer is saved.</p>}
            {previousDay && <button className="hq-inline-action" onClick={() => game.actions.current?.openToday()}>Open today’s Daily</button>}
          </div> : game.phase === "result" && result ? <>
            <div className={`hq-daily-content hq-daily-outcome ${correct === true ? "hq-daily-correct" : correct === false ? "hq-daily-wrong" : ""}`}>
              <span className="hq-daily-symbol"><SiteIcon name={correct ? "trophy" : "calendar"} /></span><h1 ref={resultHeading} tabIndex={-1}>{correct === true ? "Correct!" : correct === false ? "Not this time" : "Daily completed"}</h1>
              <p>{correct === true ? "Well played! A correct Daily adds to your streak." : correct === false ? "Your answer is saved. Come back tomorrow for a fresh challenge." : "You’ve already answered this Daily."}</p>
              <div className="hq-daily-result-time"><span>Answer time</span><strong>{result.time_spent == null ? "Unavailable" : dailyTime(result.time_spent)}</strong></div><span className="hq-daily-saved">Synced with your account</span>
            </div>
            <YourDailyCard date={game.today} refreshKey={game.refreshKey} />
            <div className="hq-daily-actions">{previousDay ? <button className="hq-primary" onClick={() => game.actions.current?.openToday()}>Play today’s Daily</button> : <Link className="hq-primary" to="/">Play a regular quiz <SiteIcon name="arrow" /></Link>}<Link className="hq-secondary" to="/">Back to home</Link></div>
            <a className="hq-inline-action hq-daily-share" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent("https://hard-quiz.com/daily")}`} target="_blank" rel="noreferrer">Share on X</a>{next}
          </> : game.phase === "load-error" || game.phase === "empty" ? <div className="hq-daily-content"><span className="hq-daily-symbol"><SiteIcon name="calendar" /></span><h1>{game.phase === "empty" ? "Today’s challenge is on its way" : "Daily couldn’t load"}</h1><p role="alert">{game.phase === "empty" ? "No question is available for this Daily yet. You can still play a regular quiz." : "We couldn’t check your Daily or load the question. Please try again."}</p><button className="hq-primary" onClick={() => game.actions.current?.retry()}>Try again</button><Link className="hq-inline-action" to="/">Back to home</Link>{next}</div> : <>
            <div className="hq-daily-content"><span className="hq-daily-symbol"><SiteIcon name="calendar" /></span><h1>{game.run ? "Your Daily is waiting" : "One image. One daily challenge."}</h1><p>{game.run ? "Continue your attempt on this device. Your answer timer has kept running." : "Identify the movie or actor. Get it right and build your streak, one day at a time."}</p>
              <div className="hq-daily-rules"><span>One answer per day</span><span>No time limit</span></div>
              {game.phase === "guest" ? <><button className="hq-primary" onClick={openLogin}>Log in to play <SiteIcon name="arrow" /></button><p className="hq-daily-login-note">Daily requires an account to save your answer and track your streak.</p><Link className="hq-inline-action" to="/">Play a regular quiz as a guest</Link></> : profileError ? <p role="alert" className="hq-status">Your account could not be checked. <button className="hq-inline-action" onClick={retryProfile}>Retry profile</button></p> : <button className="hq-primary" disabled={!profileReady} onClick={start}>{!profileReady ? "Checking your profile…" : !hasNickname ? "Choose a nickname to play" : game.run ? "Continue Daily" : "Start Daily"}<SiteIcon name="arrow" /></button>}
            </div>
            {user && <YourDailyCard date={game.today} refreshKey={game.refreshKey} />}{next}
          </>}
      </section>
      {!pending && game.phase !== "loading" && <div className="hq-daily-ranking"><button className="hq-daily-ranking-toggle" aria-expanded={rankingOpen} aria-controls="daily-streak-list" onClick={() => setRankingOpen(value => !value)}><span><SiteIcon name="trophy" />Streak leaderboard</span><SiteIcon name="chevron" /></button><div id="daily-streak-list" hidden={!rankingOpen}>{rankingOpen && <StreakLeaderboard refreshKey={`${game.today}:${game.refreshKey}`} />}</div></div>}
    </div>}
    <Dialog open={exitOpen} onClose={() => setExitOpen(false)} className="hq-game-dialog-root"><div className="hq-game-dialog-backdrop" aria-hidden="true" /><div className="hq-game-dialog-wrap"><Dialog.Panel className="hq-game-dialog"><Dialog.Title>Leave Daily?</Dialog.Title><Dialog.Description>{active ? exitText : "Your answer hasn’t been submitted. You can come back to today’s challenge."}</Dialog.Description><div><button className="hq-secondary" autoFocus onClick={() => setExitOpen(false)}>Stay here</button><button className="hq-primary" onClick={() => { setExitOpen(false); navigate("/"); }}>Leave Daily</button></div></Dialog.Panel></div></Dialog>
  </>;
}
