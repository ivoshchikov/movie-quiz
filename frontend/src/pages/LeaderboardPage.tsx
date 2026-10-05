import { useEffect, useState } from "react";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import Leaderboard from "../components/Leaderboard";
import QuizFilters from "../components/QuizFilters";
import Seo from "../components/Seo";

export default function LeaderboardPage() {
  const { categories, difficulties, loading, error, reload } = useQuizCatalog();
  const [categoryId, setCategoryId] = useState<number>();
  const [difficultyId, setDifficultyId] = useState<number>();
  useEffect(() => { setCategoryId(current => categories.some(cat => cat.id === current) ? current : categories[0]?.id); }, [categories]);
  useEffect(() => { setDifficultyId(current => difficulties.some(level => level.id === current) ? current : difficulties[0]?.id); }, [difficulties]);
  const category = categories.find(cat => cat.id === categoryId);
  const difficulty = difficulties.find(level => level.id === difficultyId);

  return <div className="hq-page">
    <Seo title="Movie Quiz Leaderboard | Hard Quiz" description="See the top Hard Quiz scores for movie stills and actors. Compare scores by category and difficulty." url="https://hard-quiz.com/leaderboard" />
    <h1 className="hq-page-heading">Leaderboard</h1>
    <p className="hq-page-copy">The best scores, by category and difficulty.</p>
    <div className="hq-panel hq-page-panel">
      {loading ? <p role="status" className="hq-status">Loading quiz options…</p>
        : error ? <p role="alert" className="hq-status">Quiz options could not be loaded. <button className="hq-inline-action" onClick={reload}>Try again</button></p>
        : !categories.length || !difficulties.length ? <p className="hq-status">No quizzes available yet.</p>
        : <><QuizFilters categories={categories} difficulties={difficulties} categoryId={categoryId} difficultyId={difficultyId} onCategoryChange={setCategoryId} onDifficultyChange={setDifficultyId} />
          <Leaderboard categoryId={categoryId} difficultyId={difficultyId} categoryLabel={category && categoryLabel(category)} difficultyLabel={difficulty?.name} /></>}
    </div>
  </div>;
}
