import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { categoryLabel } from "../hooks/useQuizCatalog";
import { useNormalGame } from "../game/useNormalGame";
import Seo from "./Seo";
import SiteIcon from "./SiteIcon";
import "../game.css";

interface LocationState { categoryId?: number; difficultyId?: number; }
export default function GameScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { categoryId, difficultyId } = (location.state as LocationState | null) ?? {};
  const validSelection = Number.isInteger(categoryId) && Number.isInteger(difficultyId);
  const game = useNormalGame(validSelection ? categoryId : undefined, validSelection ? difficultyId : undefined, location.key);
  const { user } = useAuth();
  const [exitOpen, setExitOpen] = useState(false);
  const ready = game.phase === "playing", busyImage = game.phase === "image-loading";
  const error = ["setup-error", "question-error", "image-error", "answer-error"].includes(game.phase);
  const label = game.category ? categoryLabel(game.category) : "Quiz", question = game.question;
  const feedbackText = game.feedback === "correct" ? "Correct! +1 point" : game.feedback === "wrong" ? "Incorrect. 1 life lost." : "Time’s up. 1 life lost.";
  const elapsed = `${String(Math.floor(game.elapsed / 60)).padStart(2, "0")}:${String(game.elapsed % 60).padStart(2, "0")}`;

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (exitOpen || event.repeat || event.ctrlKey || event.altKey || event.metaKey || !ready) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.isContentEditable || target?.matches("input, textarea, select")) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < game.options.length && /^[1-4]$/.test(event.key)) {
        event.preventDefault(); game.actions.current?.answer(game.options[index]);
      }
    }
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [exitOpen, ready, game.actions, game.options]);

  const instructions = !validSelection ? "Choose a category and difficulty to start a quiz." : game.phase === "empty" ?
    "No questions for this difficulty yet." : error ? (
      game.phase === "image-error" ? "The image couldn’t load. Your timer hasn’t started." :
      game.phase === "answer-error" ? "Your answer couldn’t be checked. Your timer is paused." : "The quiz couldn’t load. No life lost."
    ) : "Loading your quiz…";

  return <>
    <Seo title="Play | Hard Quiz" description="Guess the movie or actor, beat the timer and score as many points as you can." noindex />
    <header className="hq-play-header">
      {validSelection ? <button className="hq-brand" onClick={() => setExitOpen(true)} aria-label="Hard Quiz — exit quiz"><span className="hq-brand-mark"><SiteIcon name="cinema" /></span>Hard Quiz</button> :
        <Link className="hq-brand" to="/"><span className="hq-brand-mark"><SiteIcon name="cinema" /></span>Hard Quiz</Link>}
      {validSelection ? <button className="hq-play-exit" onClick={() => setExitOpen(true)}><SiteIcon name="logout" />Exit quiz</button> : <Link className="hq-play-exit" to="/">Back to home</Link>}
    </header>
    {(!validSelection || game.phase === "setup" || game.phase === "setup-error" || game.phase === "empty") ?
      <section className="hq-game-placeholder" aria-live="polite"><SiteIcon name="film" />
        <h1>{!validSelection ? "Ready to play?" : game.phase === "empty" ? "More questions are on the way" : error ? "Let’s try that again" : "Getting your quiz ready"}</h1>
        <p role={error ? "alert" : undefined}>{instructions}</p>
        {game.phase === "setup-error" && <button className="hq-secondary" onClick={() => game.actions.current?.retry()}>Try again</button>}
        {(!validSelection || game.phase === "empty") && <Link className="hq-primary" to="/">Choose a quiz</Link>}
      </section> :
      <section className="hq-game" aria-label="Quiz">
        <div className="hq-game-heading"><div><h1>{label}</h1><span>{game.level?.name}</span></div><span className="hq-question-number">Question {game.number || "…"}</span></div>
        <div className="hq-game-image" aria-busy={busyImage || game.phase === "loading"}>
          {question && game.phase !== "image-error" && <img key={`${question.id}:${game.imageAttempt}`} src={game.imageAttempt ? `${question.image_url}${question.image_url.includes("?") ? "&" : "?"}hq_retry=${game.imageAttempt}` : question.image_url}
            alt={label === "Actors" || label === "Actresses" ? "Actor photograph to identify" : "Movie still to identify"}
            className={busyImage ? "hq-image-loading" : ""} draggable={false}
            onLoad={event => event.currentTarget.naturalWidth > 0 ? game.actions.current?.imageReady(question.id, game.imageAttempt) : game.actions.current?.imageFailed(question.id, game.imageAttempt)} onError={() => game.actions.current?.imageFailed(question.id, game.imageAttempt)} />}
          {(busyImage || game.phase === "loading") && <div className="hq-game-image-message" role="status"><span className="hq-game-spinner" /><span>{busyImage ? "Loading image…" : "Loading next question…"}</span></div>}
          {(game.phase === "image-error" || game.phase === "question-error") && <div className="hq-game-image-message"><p role="alert">{game.phase === "image-error" ? "The image couldn’t load." : "The next question couldn’t load."}</p><button className="hq-secondary" onClick={() => game.actions.current?.retry()}>Try again</button></div>}
        </div>
        <div className="hq-game-timer" aria-label={ready || game.phase === "feedback" ? `${game.seconds} seconds left` : "Timer waits until the question is ready"}>
          <div className="hq-game-timer-label"><span><SiteIcon name="timer" />Time left</span><strong className={game.seconds <= 5 && ready ? "hq-time-low" : ""}>{game.seconds}<small> s</small></strong></div>
          <div className="hq-game-time-track"><div className={`hq-game-time-fill${game.seconds <= 5 && ready ? " hq-time-low" : ""}`} style={{ width: `${Math.max(0, Math.min(1, game.remaining)) * 100}%` }} /></div>
        </div>
        <div className="hq-game-answers" aria-label="Answer choices" aria-busy={game.phase === "checking"}>
          {(game.options.length ? game.options : ["…", "…", "…", "…"]).map((option, index) => {
            const selected = game.selected === option, outcome = selected && game.phase === "feedback" ? game.feedback : null;
            return <button key={`${question?.id}:${index}`} className={`hq-game-answer${outcome ? ` hq-answer-${outcome}` : ""}${selected && game.phase === "checking" ? " hq-answer-checking" : ""}`}
              onClick={() => game.actions.current?.answer(option)} disabled={!ready || exitOpen} aria-label={option} aria-keyshortcuts={String(index + 1)}>
              <span className="hq-answer-key" aria-hidden="true">{index + 1}</span><span className="hq-answer-text">{option}</span>
            </button>;
          })}
        </div>
        <div className={`hq-game-feedback${game.feedback ? ` hq-feedback-${game.feedback}` : ""}${game.phase === "answer-error" ? " hq-feedback-error" : ""}`} role={game.phase === "answer-error" ? "alert" : "status"} aria-live="polite">
          {game.phase === "feedback" ? <><strong>{feedbackText}</strong><span>{game.lives === 0 ? "Your result is next" : "Next question coming up…"}</span></> :
            game.phase === "checking" ? <span>Checking your answer…</span> : game.phase === "answer-error" ? <><span>{instructions}</span><button className="hq-inline-action" onClick={() => game.actions.current?.retry()}>Try again</button></> :
              ready ? <span>{label === "Actors" || label === "Actresses" ? "Who is in the picture?" : "Which title matches the image?"} Choose one answer.</span> : <span>Answers unlock when the image is ready.</span>}
        </div>
        <div className="hq-game-stats"><span className="hq-game-stat">Score <strong>{game.score}</strong></span><span className="hq-game-lives"><SiteIcon name="heart" /><span>Lives <strong>{game.lives}<small> / {game.level?.lives}</small></strong></span></span></div>
        <div className="hq-game-footer"><span>Elapsed <strong>{elapsed}</strong></span><span className="hq-game-shortcuts">Use keys <kbd>1</kbd>–<kbd>4</kbd> to answer</span></div>
      </section>}
    <Dialog open={exitOpen} onClose={() => setExitOpen(false)} className="hq-game-dialog-root"><div className="hq-game-dialog-backdrop" aria-hidden="true" />
      <div className="hq-game-dialog-wrap"><Dialog.Panel className="hq-game-dialog"><Dialog.Title>End this quiz?</Dialog.Title>
        <Dialog.Description>Your current score ({game.score}) and elapsed time will be saved on this device. This quiz will end and cannot be resumed. {user && "We’ll also submit it for your personal best. If you’re offline, saving will retry when you’re back online."}</Dialog.Description>
        <p>The timer keeps running until you end the quiz.</p><div><button className="hq-secondary" autoFocus onClick={() => setExitOpen(false)}>Keep playing</button>
          <button className="hq-primary" onClick={() => { setExitOpen(false); if (game.actions.current) game.actions.current.finish(); else navigate("/"); }}>End quiz & save</button></div>
      </Dialog.Panel></div>
    </Dialog>
  </>;
}
