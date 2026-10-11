import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { countQuestions } from "../api";
import featuredPost from "../featuredPostMetadata.json";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import QuizFilters from "./QuizFilters";
import pageMetadata from "../pageMetadata.json";
import Seo from "./Seo";
import SiteIcon from "./SiteIcon";
import StatusMessage from "./StatusMessage";
import { useReadRequest } from "../hooks/useReadRequest";

interface QuizSelection { categoryId?: number; difficultyId?: number; }

export default function StartScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const requested = location.state as QuizSelection | null;
  const { categories, difficulties, loading, error, reload } = useQuizCatalog(true);
  const [categoryId, setCategoryId] = useState<number>();
  const [difficultyId, setDifficultyId] = useState<number>();
  const selectionKey = `${categoryId}:${difficultyId}`;
  const loadAvailability = useCallback((signal: AbortSignal) => countQuestions(categoryId ?? 0, difficultyId, signal), [categoryId, difficultyId]);
  const availability = useReadRequest(selectionKey, loadAvailability, !loading && !error && categoryId != null && difficultyId != null);

  useEffect(() => {
    setCategoryId(current => categories.some(cat => cat.id === requested?.categoryId)
      ? requested?.categoryId : categories.some(cat => cat.id === current) ? current : categories[0]?.id);
  }, [categories, requested?.categoryId]);
  useEffect(() => {
    setDifficultyId(current => difficulties.some(level => level.id === requested?.difficultyId)
      ? requested?.difficultyId : difficulties.some(level => level.id === current) ? current
        : (difficulties.find(level => level.key === "easy") ?? difficulties[0])?.id);
  }, [difficulties, requested?.difficultyId]);

  const category = categories.find(cat => cat.id === categoryId);
  const level = difficulties.find(item => item.id === difficultyId);
  const count = !availability.loading && !availability.error ? availability.value : undefined;
  const canPlay = !loading && !error && !!category && !!level && count != null && count > 0;

  return <>
    <Seo {...pageMetadata.home} />
    <div className="hq-home">
      <section className="hq-hero">
        <div className="hq-eyebrow">For the love of cinema</div>
        <h1>How well do you know cinema?</h1>
        <p>Guess movies from stills. Recognize the faces.</p>
      </section>
      <div className="hq-play-area">
        <section className="hq-panel hq-quiz-panel" aria-labelledby="start-quiz-heading" aria-busy={loading || availability.loading}>
          <h2 id="start-quiz-heading" className="hq-section-heading">Start a quiz</h2>
          {loading ? <StatusMessage tone="loading">Loading quiz options…</StatusMessage>
            : error ? <StatusMessage tone="error">Quiz options could not be loaded. <button className="hq-inline-action" onClick={reload}>Try again</button></StatusMessage>
            : !categories.length || !difficulties.length ? <StatusMessage>New quizzes are coming soon.</StatusMessage>
            : <>
              <QuizFilters categories={categories} difficulties={difficulties} categoryId={categoryId} difficultyId={difficultyId} onCategoryChange={setCategoryId} onDifficultyChange={setDifficultyId} />
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
        </section>
        <section className="hq-panel hq-daily-panel" aria-labelledby="daily-heading">
          <div className="hq-daily-label"><SiteIcon name="calendar" />Daily Challenge</div>
          <h2 id="daily-heading">Today’s challenge</h2>
          <p className="hq-daily-copy">One question. One attempt.<br />Same challenge for everyone.</p>
          <div className="hq-daily-bottom">
            <p className="hq-daily-note">Come back every day to build your streak.</p>
            <Link to="/daily" className="hq-secondary hq-secondary-wide">Play Daily <SiteIcon name="arrow" /></Link>
          </div>
        </section>
      </div>
      <div className="hq-blog-strip">
        {featuredPost && <div><p className="hq-blog-label">From the blog</p><Link className="hq-blog-title" to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link></div>}
        <Link to="/blog" className="hq-text-action">Explore the blog <SiteIcon name="arrow" /></Link>
      </div>
    </div>
  </>;
}
