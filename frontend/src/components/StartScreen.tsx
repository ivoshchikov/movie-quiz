import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { countQuestions } from "../api";
import { posts } from "../blog";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import QuizFilters from "./QuizFilters";
import Seo from "./Seo";
import SiteIcon from "./SiteIcon";

interface QuizSelection { categoryId?: number; difficultyId?: number; }
interface Availability { key: string; count?: number; error?: boolean; }

export default function StartScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const requested = location.state as QuizSelection | null;
  const { categories, difficulties, loading, error, reload } = useQuizCatalog(true);
  const [categoryId, setCategoryId] = useState<number>();
  const [difficultyId, setDifficultyId] = useState<number>();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [countAttempt, setCountAttempt] = useState(0);
  const selectionKey = `${categoryId}:${difficultyId}`;

  useEffect(() => {
    setCategoryId(current => categories.some(cat => cat.id === requested?.categoryId)
      ? requested?.categoryId : categories.some(cat => cat.id === current) ? current : categories[0]?.id);
  }, [categories, requested?.categoryId]);
  useEffect(() => {
    setDifficultyId(current => difficulties.some(level => level.id === requested?.difficultyId)
      ? requested?.difficultyId : difficulties.some(level => level.id === current) ? current
        : (difficulties.find(level => level.key === "easy") ?? difficulties[0])?.id);
  }, [difficulties, requested?.difficultyId]);

  useEffect(() => {
    let active = true;
    if (categoryId == null || difficultyId == null) return;
    setAvailability(null);
    countQuestions(categoryId, difficultyId)
      .then(count => { if (active) setAvailability({ key: selectionKey, count }); })
      .catch(() => { if (active) setAvailability({ key: selectionKey, error: true }); });
    return () => { active = false; };
  }, [categoryId, difficultyId, selectionKey, countAttempt]);

  const category = categories.find(cat => cat.id === categoryId);
  const level = difficulties.find(item => item.id === difficultyId);
  const currentAvailability = availability?.key === selectionKey ? availability : null;
  const canPlay = !loading && !error && !!category && !!level && (currentAvailability?.count ?? 0) > 0;
  const featuredPost = posts.find(post => post.slug === "why-2-39-1-feels-more-cinematic") ?? posts[0];

  return <>
    <Seo title="Movie & Actor Quiz | Hard Quiz" description="Guess movies from stills and recognize famous actors. Choose a difficulty, beat the timer, or take on today's Daily Challenge." url="https://hard-quiz.com/" />
    <div className="hq-home">
      <section className="hq-hero">
        <div className="hq-eyebrow">For the love of cinema</div>
        <h1>How well do you know cinema?</h1>
        <p>Guess movies from stills. Recognize the faces.</p>
      </section>
      <div className="hq-play-area">
        <section className="hq-panel hq-quiz-panel" aria-labelledby="start-quiz-heading">
          <h2 id="start-quiz-heading" className="hq-section-heading">Start a quiz</h2>
          {loading ? <p role="status" className="hq-status">Loading quiz options…</p>
            : error ? <div role="alert" className="hq-status">Quiz options could not be loaded. <button className="hq-inline-action" onClick={reload}>Try again</button></div>
            : !categories.length || !difficulties.length ? <p className="hq-status">New quizzes are coming soon.</p>
            : <>
              <QuizFilters categories={categories} difficulties={difficulties} categoryId={categoryId} difficultyId={difficultyId} onCategoryChange={setCategoryId} onDifficultyChange={setDifficultyId} />
              <div className="hq-rule-summary" aria-live="polite">
                {level && <><span><SiteIcon name="timer" />{level.time_limit_secs} sec per question</span><span><SiteIcon name="heart" />{level.lives} {level.lives === 1 ? "life" : "lives"}</span></>}
              </div>
              {currentAvailability?.error && <p role="alert" className="hq-status">Questions could not be checked. <button className="hq-inline-action" onClick={() => setCountAttempt(value => value + 1)}>Try again</button></p>}
              {currentAvailability?.count === 0 && <p role="status" className="hq-status">No questions for this difficulty yet. Try another level.</p>}
            </>}
          <button className="hq-primary" disabled={!canPlay} onClick={() => { if (canPlay) navigate("/play", { state: { categoryId, difficultyId } }); }}>
            {loading ? "Loading…" : error || !category || !level ? "Play quiz" : currentAvailability?.error ? "Play quiz" : currentAvailability?.count === 0 ? "Coming soon" : !currentAvailability ? "Checking questions…" : `Play ${categoryLabel(category)}`}
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
