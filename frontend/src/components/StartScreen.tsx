import { lazy, Suspense, useCallback } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { countQuestions } from "../api";
import featuredPost from "../featuredPostMetadata.json";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import QuizFilters from "./QuizFilters";
import pageMetadata from "../pageMetadata.json";
import Seo from "./Seo";
import SiteIcon from "./SiteIcon";
import StatusMessage from "./StatusMessage";
import ModeSwitcher from "./ModeSwitcher";
import { gameMode } from "../games/modes";
import ModePreview from "./ModePreview";
import DailySetup from "./DailySetup";
import { useReadRequest } from "../hooks/useReadRequest";
import "../modes.css";

const TimeAttackSetup = lazy(() => import("../pages/TimeAttackPage").then(module => ({ default: module.TimeAttackSetup })));
const ThisThatSetup = lazy(() => import("../pages/ThisThatPage").then(module => ({ default: module.ThisThatSetup })));

interface QuizSelection { categoryId?: number; difficultyId?: number; }

export function ClassicSetup() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = location.state as QuizSelection | null;
  const { categories, difficulties, loading, error, reload } = useQuizCatalog(true);
  const categoryId = (categories.find(c => c.id === Number(params.get("category"))) ?? categories.find(c => c.id === requested?.categoryId) ?? categories[0])?.id;
  const difficultyId = (difficulties.find(d => d.id === Number(params.get("difficulty"))) ?? difficulties.find(d => d.id === requested?.difficultyId) ?? difficulties.find(d => d.key === "easy") ?? difficulties[0])?.id;
  const selectionKey = `${categoryId}:${difficultyId}`;
  const loadAvailability = useCallback((signal: AbortSignal) => countQuestions(categoryId ?? 0, difficultyId, signal), [categoryId, difficultyId]);
  const availability = useReadRequest(selectionKey, loadAvailability, !loading && !error && categoryId != null && difficultyId != null);

  const category = categories.find(cat => cat.id === categoryId);
  const level = difficulties.find(item => item.id === difficultyId);
  const count = !availability.loading && !availability.error ? availability.value : undefined;
  const canPlay = !loading && !error && !!category && !!level && count != null && count > 0;

  function select(key: string, value: number) {
    const next = new URLSearchParams(params); next.set(key, String(value)); setParams(next, { preventScrollReset: true });
  }
  return <div className="hq-classic-setup" aria-busy={loading || availability.loading}>
          {loading ? <StatusMessage tone="loading">Loading quiz options…</StatusMessage>
            : error ? <StatusMessage tone="error">Quiz options could not be loaded. <button className="hq-inline-action" onClick={reload}>Try again</button></StatusMessage>
            : !categories.length || !difficulties.length ? <StatusMessage>New quizzes are coming soon.</StatusMessage>
            : <>
              <QuizFilters categories={categories} difficulties={difficulties} categoryId={categoryId} difficultyId={difficultyId} onCategoryChange={id => select("category", id)} onDifficultyChange={id => select("difficulty", id)} />
              <div className="hq-rule-summary" aria-live="polite">
                {level && <><span><SiteIcon name="timer" />{level.time_limit_secs} sec per question</span><span><SiteIcon name="heart" />{level.lives} {level.lives === 1 ? "life" : "lives"}</span></>}
              </div>
              {availability.error && <StatusMessage tone="error">Questions could not be checked. <button className="hq-inline-action" onClick={availability.retry}>Try again</button></StatusMessage>}
              {count === 0 && <StatusMessage>No questions for this difficulty yet. Try another level.</StatusMessage>}
              <span className="sr-only" role="status">{availability.loading ? "Checking questions…" : ""}</span>
            </>}
          <button className="hq-primary" disabled={!canPlay} onClick={() => { if (canPlay) navigate("/play", { state: { categoryId, difficultyId } }); }}>
            {loading ? "Loading…" : error || !category || !level || availability.error ? "Play quiz" : count === 0 ? "Coming soon" : count == null ? "Checking questions…" : `Play ${categoryLabel(category)}`}
            <SiteIcon name="arrow" />
          </button>
      <p className="hq-mode-note">No account needed. <Link className="hq-inline-action" to="/how-to-play#classic">Classic rules</Link></p>
    </div>;
}

export default function StartScreen() {
  const [params, setParams] = useSearchParams();
  const mode = gameMode(params.get("mode"));
  const titles = { classic: "Classic", "time-attack": "Time Attack", "this-or-that": "This or That", daily: "Daily Challenge" };
  const copy = { classic: "Recognize movies and faces. Four answers, one right choice.", "time-attack": "Answer as many as you can before the clock runs out.", "this-or-that": "Which actor do you prefer? Your taste decides.", daily: "One question for everyone. Come back each day to build your streak." };
  return <><Seo {...pageMetadata.home} /><div className="hq-home hq-games-home">
    <header className="hq-hero"><h1>Choose your game</h1></header>
    <ModeSwitcher value={mode} onChange={value => { const next = new URLSearchParams(params); next.set("mode", value); setParams(next, { preventScrollReset: true }); }} />
    <section className="hq-panel hq-mode-panel" aria-labelledby="selected-mode-title">
      <div className="hq-mode-content"><header className="hq-mode-heading"><h2 id="selected-mode-title">{titles[mode]}</h2><p>{copy[mode]}</p></header>
        <Suspense fallback={<p role="status">Loading game options…</p>}>
          {mode === "classic" ? <ClassicSetup /> : mode === "time-attack" ? <TimeAttackSetup embedded /> : mode === "this-or-that" ? <ThisThatSetup embedded /> : <DailySetup />}
        </Suspense>
      </div><ModePreview key={mode} mode={mode} />
    </section>
    <div className="hq-games-links"><Link className="hq-text-action" to={`/leaderboard?${new URLSearchParams({ ...Object.fromEntries(params), mode })}`}><SiteIcon name="trophy" />{mode === "this-or-that" ? "Actor favourites" : "View rankings"}</Link></div>
    <div className="hq-blog-strip">{featuredPost && <div><p className="hq-blog-label">From the blog</p><Link className="hq-blog-title" to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link></div>}<Link to="/blog" className="hq-text-action">Explore the blog <SiteIcon name="arrow" /></Link></div>
  </div></>;
}
