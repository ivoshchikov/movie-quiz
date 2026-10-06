import { useEffect, useReducer, useState } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getPersonalBest } from "../api";
import type { PersonalBest } from "../api";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import { dismissRecentGameResult, isGameResult, isRecentGameResult, isSavingGameResult, lastGameResult, RESULT_UPDATED, saveGameResult } from "../game/resultStorage";
import type { GameResult } from "../game/resultStorage";
import type { SiteOutletContext } from "./Layout";
import Seo from "./Seo";
import SiteIcon from "./SiteIcon";
import "../result.css";

function formatSecs(sec: number) {
  const rounded = Math.floor(sec);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

function ResultCard({ result }: { result: GameResult }) {
  const { user, session } = useAuth();
  const { openLogin } = useOutletContext<SiteOutletContext>();
  const catalog = useQuizCatalog();
  const [fresh] = useState(() => isRecentGameResult(result.id));
  const [bestAttempt, retryBest] = useReducer(value => value + 1, 0);
  const [bestQuery, setBestQuery] = useState<{ key: string; phase: "loading" | "ready" | "error"; value: PersonalBest | null } | null>(null);
  const bestKey = `${result.id}:${user?.id ?? "guest"}`;
  const category = catalog.categories.find(item => item.id === result.categoryId);
  const difficulty = catalog.difficulties.find(item => item.id === result.difficultyId);
  const categoryName = category ? categoryLabel(category) : typeof result.categoryName === "string" ?
    categoryLabel({ id: result.categoryId, name: result.categoryName }) : null;
  const difficultyName = difficulty?.name ?? (typeof result.difficultyName === "string" ? result.difficultyName : null);
  const canReplay = result.categoryId > 0 && result.difficultyId > 0 && (catalog.loading || catalog.error || (!!category && !!difficulty));
  const completed = result.finishReason === "completed";
  const syncing = result.saveStatus === "pending" && isSavingGameResult(result.id);
  const failed = result.saveStatus === "pending" && !syncing;
  const best = bestQuery?.key === bestKey && bestQuery.phase === "ready" ? bestQuery.value : result.personalBest;
  const bestStale = bestQuery?.key === bestKey && bestQuery.phase === "error";
  const bestFailed = bestStale && !best;
  const award = fresh && result.saveStatus === "saved" && best?.score === result.score ? result.recordOutcome : undefined;
  const finishedAt = typeof result.finishedAt === "number" && Number.isFinite(result.finishedAt) && result.finishedAt > 0 ? new Date(result.finishedAt) : null;
  const title = !fresh ? "Last quiz result" : completed ? "All questions completed!" : result.finishReason === "exit" ? "Quiz ended" : "Your result";
  const explanation = completed ? "Every question played, and lives still left. Congratulations!" :
    result.finishReason === "out-of-lives" ? "All lives used. Ready for another round?" : "This quiz ended before completion.";

  useEffect(() => () => dismissRecentGameResult(result.id), [result.id]);
  useEffect(() => {
    const refreshRelated = (event: Event) => {
      const detail: unknown = (event as CustomEvent<unknown>).detail;
      if (isGameResult(detail) && detail.saveStatus === "saved" && detail.id !== result.id &&
        detail.userId === user?.id && detail.categoryId === result.categoryId && detail.difficultyId === result.difficultyId) retryBest();
    };
    window.addEventListener(RESULT_UPDATED, refreshRelated);
    return () => window.removeEventListener(RESULT_UPDATED, refreshRelated);
  }, [user?.id, result.id, result.categoryId, result.difficultyId]);
  useEffect(() => {
    if (!user || result.userId !== user.id) return;
    let active = true;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 4000);
    setBestQuery({ key: bestKey, phase: "loading", value: null });
    getPersonalBest(user.id, result.categoryId, result.difficultyId, abort.signal)
      .then(value => { if (active) setBestQuery({ key: bestKey, phase: "ready", value }); })
      .catch(() => { if (active) setBestQuery({ key: bestKey, phase: "error", value: null }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; abort.abort(); window.clearTimeout(timeout); };
  }, [user, bestKey, result.userId, result.categoryId, result.difficultyId, result.saveStatus, bestAttempt]);

  const statusText = syncing ? "Syncing…" : failed ? "Couldn’t sync with your account." :
    result.saveStatus === "saved" ? "Synced with your account" : result.saveStatus === "memory" ?
      "Browser storage is unavailable. This result is available while this page is open." : "Saved on this device";
  const duration = formatSecs(result.elapsedSecs);
  return <>
    <Seo title="Your result | Hard Quiz" description={`You scored ${result.score} point${result.score === 1 ? "" : "s"} in ${duration}. Play again to beat your score.`} noindex />
    <section className={`hq-panel hq-result-card${completed ? " hq-result-victory" : ""}`} aria-labelledby="result-title">
      <header className="hq-result-heading">
        {completed && <span className="hq-result-achievement"><SiteIcon name="trophy" /></span>}
        <p className="hq-result-mode">{categoryName && difficultyName ? <>{categoryName}<span aria-hidden="true"> · </span>{difficultyName}</> :
          catalog.loading ? "Loading quiz details…" : "Quiz details unavailable"}
        </p>
        <h1 id="result-title">{title}</h1>
        <p className="hq-result-explanation">{explanation}</p>
        {!fresh && finishedAt && <time className="hq-result-date" dateTime={finishedAt.toISOString()}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(finishedAt)}</time>}
      </header>
      <div className="hq-result-score"><strong>{result.score}</strong><span>{result.score === 1 ? "point" : "points"}</span></div>
      {award && <p className="hq-result-record"><SiteIcon name="trophy" />{award === "first" ? "Your first personal best!" : "New personal best!"}</p>}
      <dl className={`hq-result-stats${!user ? " hq-result-stats-guest" : ""}`}>
        <div><dt>Quiz duration</dt><dd>{duration}</dd></div>
        {user && <div><dt>{bestStale && best ? "Last known personal best" : "Personal best"}</dt><dd className="hq-result-best-value">{best ? <>{best.score}<span> {best.score === 1 ? "point" : "points"}</span></> :
          bestFailed ? <button className="hq-inline-action" onClick={retryBest}>Try again</button> : best === null ? <span className="hq-result-stat-note">No record yet</span> :
            <span className="hq-result-stat-note">Loading…</span>}</dd>{bestStale && best && <button className="hq-inline-action" onClick={retryBest}>Refresh</button>}</div>}
      </dl>
      <div className="hq-result-actions">
        {canReplay && <Link className="hq-primary" to="/play" state={{ categoryId: result.categoryId, difficultyId: result.difficultyId }}><SiteIcon name="replay" />Play again</Link>}
        <Link className="hq-secondary" to="/">Back to home</Link>
      </div>
      <div className="hq-result-save" role="status" aria-live="polite" aria-atomic="true">
        <p>{statusText}{failed && <button className="hq-inline-action" onClick={() => { void saveGameResult(result, session); }}>Retry</button>}</p>
        {failed && <p className="hq-result-save-note">{result.deviceStored === false ? "Keep this page open to retry; browser storage is unavailable." : "Your result is kept on this device. We’ll also retry when you’re online."}</p>}
      </div>
      {canReplay && <Link className="hq-result-leaderboard hq-text-action" to={`/leaderboard?category=${result.categoryId}&difficulty=${result.difficultyId}`}>View leaderboard<SiteIcon name="arrow" /></Link>}
      {catalog.error && (!categoryName || !difficultyName) && <p className="hq-result-details-error">Quiz details couldn’t load. <button className="hq-inline-action" onClick={catalog.reload}>Try again</button></p>}
      {!user && <aside className="hq-result-guest" aria-label="Guest account">
        <p>Keep your personal bests</p>
        <span>Log in before your next quiz to save records to your account.</span>
        <button className="hq-inline-action" onClick={openLogin}>Log in</button>
      </aside>}
    </section>
  </>;
}

export default function ResultScreen() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const owner = user?.id ?? null;
  const [updated, setUpdated] = useState<GameResult | null>(null);
  const [, rerender] = useReducer(value => value + 1, 0);
  const incoming = !loading && isGameResult(location.state) && location.state.userId === owner ? location.state : null;
  const retained = !loading ? lastGameResult(owner) : null;
  const base = incoming && (!retained || incoming.id === retained.id || isRecentGameResult(incoming.id) ||
    (incoming.finishedAt ?? 0) > (retained.finishedAt ?? 0)) ? incoming : retained;
  const result = updated?.id === base?.id && updated?.userId === owner ? updated :
    retained?.id === base?.id ? retained : base;

  useEffect(() => {
    const update = (event: Event) => {
      const detail: unknown = (event as CustomEvent<unknown>).detail;
      if (isGameResult(detail) && detail.userId === owner && detail.id === result?.id) setUpdated({ ...detail });
    };
    window.addEventListener(RESULT_UPDATED, update);
    window.addEventListener("storage", rerender);
    return () => { window.removeEventListener(RESULT_UPDATED, update); window.removeEventListener("storage", rerender); };
  }, [owner, result?.id]);

  if (result && !loading) return <ResultCard key={`${owner}:${result.id}`} result={result} />;
  return <>
    <Seo title="Your result | Hard Quiz" description="Play a movie or actor quiz and see your result. Choose a mode to start a new quiz." noindex />
    <section className="hq-panel hq-result-card hq-result-empty">
      <SiteIcon name="chart" />
      <h1>{loading ? "Loading your result…" : "No result yet"}</h1>
      <p>{loading ? "Checking your account." : "Play a quiz to see your score here."}</p>
      {!loading && <Link className="hq-primary" to="/">Start a quiz<SiteIcon name="arrow" /></Link>}
    </section>
  </>;
}
