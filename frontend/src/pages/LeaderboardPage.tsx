import { useEffect } from "react";
import { RadioGroup } from "@headlessui/react";
import { useSearchParams } from "react-router-dom";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import { LEADERBOARD_TIMEOUT } from "../leaderboard/useLeaderboard";
import Leaderboard from "../components/Leaderboard";
import SiteIcon from "../components/SiteIcon";
import Seo from "../components/Seo";
import "../leaderboard.css";

export default function LeaderboardPage() {
  const { categories, difficulties, loading, error, reload } = useQuizCatalog(false, LEADERBOARD_TIMEOUT);
  const [params, setParams] = useSearchParams();
  const requestedCategory = Number(params.get("category"));
  const requestedDifficulty = Number(params.get("difficulty"));
  const category = categories.find(cat => cat.id === requestedCategory) ?? categories[0];
  const difficulty = difficulties.find(level => level.id === requestedDifficulty) ?? difficulties[0];
  const invalidCategory = params.has("category") && !categories.some(cat => cat.id === requestedCategory);
  const invalidDifficulty = params.has("difficulty") && !difficulties.some(level => level.id === requestedDifficulty);
  useEffect(() => {
    if (loading || error || !category || !difficulty || (!invalidCategory && !invalidDifficulty)) return;
    const next = new URLSearchParams(params);
    next.set("category", String(category.id)); next.set("difficulty", String(difficulty.id));
    setParams(next, { replace: true });
  }, [params, setParams, loading, error, category, difficulty, invalidCategory, invalidDifficulty]);
  function select(categoryId: number, difficultyId: number) {
    if (categoryId === category?.id && difficultyId === difficulty?.id) return;
    const next = new URLSearchParams(params);
    next.set("category", String(categoryId)); next.set("difficulty", String(difficultyId));
    setParams(next);
  }

  return <div className="hq-leaderboard-page">
    <Seo title="Movie Quiz Leaderboard | Hard Quiz" description="See all-time Hard Quiz personal bests for movie stills and actors. Compare scores by category and difficulty, then play the quiz." url="https://hard-quiz.com/leaderboard" />
    <section className="hq-panel hq-leaderboard-panel" aria-labelledby="leaderboard-title">
      <header className="hq-leaderboard-heading"><div><h1 id="leaderboard-title">Leaderboard</h1><p>All-time personal bests</p></div><span className="hq-leaderboard-symbol"><SiteIcon name="trophy" /></span></header>
      {loading ? <p role="status" className="hq-status">Loading quiz options…</p>
        : error ? <p role="alert" className="hq-status">Quiz options could not be loaded. <button className="hq-inline-action" onClick={reload}>Try again</button></p>
        : !category || !difficulty ? <p className="hq-status">No quizzes available yet.</p>
        : <>
          <div className="hq-leaderboard-filters">
            <RadioGroup value={category.id} onChange={id => select(id, difficulty.id)} aria-label="Select category" className="hq-leaderboard-category-desktop">
              <RadioGroup.Label className="hq-legend">Category</RadioGroup.Label>
              <div className="hq-leaderboard-category-options">{categories.map(cat => <RadioGroup.Option as="button" type="button" key={cat.id} value={cat.id} className="hq-leaderboard-filter">{categoryLabel(cat)}</RadioGroup.Option>)}</div>
            </RadioGroup>
            <div className="hq-leaderboard-category-mobile"><label className="hq-legend" htmlFor="leaderboard-category">Category</label><select id="leaderboard-category" value={category.id} onChange={event => select(Number(event.target.value), difficulty.id)}>{categories.map(cat => <option key={cat.id} value={cat.id}>{categoryLabel(cat)}</option>)}</select></div>
            <RadioGroup value={difficulty.id} onChange={id => select(category.id, id)} aria-label="Select level">
              <RadioGroup.Label className="hq-legend">Difficulty</RadioGroup.Label>
              <div className="hq-leaderboard-level-options">{difficulties.map(level => <RadioGroup.Option as="button" type="button" key={level.id} value={level.id} className="hq-leaderboard-filter">{level.name}</RadioGroup.Option>)}</div>
            </RadioGroup>
          </div>
          <Leaderboard categoryId={category.id} difficultyId={difficulty.id} categoryLabel={categoryLabel(category)} difficultyLabel={difficulty.name} />
        </>}
    </section>
  </div>;
}
