import { useCallback, useEffect } from "react";
import { RadioGroup } from "@headlessui/react";
import { Link, useSearchParams } from "react-router-dom";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import { LEADERBOARD_TIMEOUT } from "../leaderboard/useLeaderboard";
import Leaderboard from "../components/Leaderboard";
import SiteIcon from "../components/SiteIcon";
import pageMetadata from "../pageMetadata.json";
import Seo from "../components/Seo";
import StatusMessage from "../components/StatusMessage";
import ModeSwitcher from "../components/ModeSwitcher";
import { gameMode } from "../games/modes";
import { useReadRequest } from "../hooks/useReadRequest";
import { attackCatalog, isLevel } from "../timeAttack/api";
import type { AttackLevel } from "../timeAttack/api";
import AttackLeaderboard from "../timeAttack/AttackLeaderboard";
import ActorRanking from "../thisThat/ActorRanking";
import StreakLeaderboard from "../components/StreakLeaderboard";
import { dailyDate } from "../daily/time";
import "../modes.css";
import "../time-attack.css";
import "../this-that.css";
import "../daily.css";
import "../leaderboard.css";

function ClassicRankings() {
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

  return <>
      {loading ? <StatusMessage tone="loading">Loading quiz options…</StatusMessage>
        : error ? <StatusMessage tone="error">Quiz options could not be loaded. <button className="hq-inline-action" onClick={reload}>Try again</button></StatusMessage>
        : !category || !difficulty ? <StatusMessage>No quizzes available yet.</StatusMessage>
        : <>
          <div className="hq-leaderboard-filters">
            <RadioGroup value={category.id} onChange={id => select(id, difficulty.id)} aria-label="Select category" className="hq-leaderboard-category-desktop">
              <RadioGroup.Label className="hq-legend">Category</RadioGroup.Label>
              <div className="hq-leaderboard-category-options">{categories.map(cat => <RadioGroup.Option as="button" type="button" key={cat.id} value={cat.id} className="hq-leaderboard-filter">{({ checked }) => <><span>{categoryLabel(cat)}</span>{checked && <SiteIcon name="check" />}</>}</RadioGroup.Option>)}</div>
            </RadioGroup>
            <div className="hq-leaderboard-category-mobile"><label className="hq-legend" htmlFor="leaderboard-category">Category</label><select id="leaderboard-category" value={category.id} onChange={event => select(Number(event.target.value), difficulty.id)}>{categories.map(cat => <option key={cat.id} value={cat.id}>{categoryLabel(cat)}</option>)}</select></div>
            <RadioGroup value={difficulty.id} onChange={id => select(category.id, id)} aria-label="Select level">
              <RadioGroup.Label className="hq-legend">Difficulty</RadioGroup.Label>
              <div className="hq-leaderboard-level-options">{difficulties.map(level => <RadioGroup.Option as="button" type="button" key={level.id} value={level.id} className="hq-leaderboard-filter">{({ checked }) => <><span>{level.name}</span>{checked && <SiteIcon name="check" />}</>}</RadioGroup.Option>)}</div>
            </RadioGroup>
          </div>
          <Leaderboard categoryId={category.id} difficultyId={difficulty.id} categoryLabel={categoryLabel(category)} difficultyLabel={difficulty.name} />
        </>}
  </>;
}

function AttackRankings() {
  const [params, setParams] = useSearchParams();
  const load = useCallback((signal: AbortSignal) => attackCatalog(signal), []);
  const catalog = useReadRequest("attack-ranking-catalog", load);
  const category = catalog.value?.categories.find(c => c.id === Number(params.get("attack-category"))) ?? catalog.value?.categories[0];
  const requested = params.get("level"), level: AttackLevel = isLevel(requested) ? requested : "easy";
  function select(key: string, value: string) { const next = new URLSearchParams(params); next.set(key, value); setParams(next, { preventScrollReset: true }); }
  return <>
    {catalog.loading && <StatusMessage tone="loading">Loading Time Attack options…</StatusMessage>}
    {catalog.error && <StatusMessage tone="error">Options could not load. <button className="hq-inline-action" onClick={catalog.retry}>Retry options</button></StatusMessage>}
    {category && <>
      <div className="hq-attack-setup">
        <RadioGroup value={category.id} onChange={id => select("attack-category", String(id))} aria-label="Time Attack category"><RadioGroup.Label className="hq-legend">Category</RadioGroup.Label><div className="hq-attack-choices">{catalog.value!.categories.map(c => <RadioGroup.Option as="button" type="button" key={c.id} value={c.id} className="hq-category-option">{c.id === 1 ? "Movie Stills" : c.name}</RadioGroup.Option>)}</div></RadioGroup>
        <RadioGroup value={level} onChange={key => select("level", key)} aria-label="Time Attack difficulty"><RadioGroup.Label className="hq-legend">Time pressure</RadioGroup.Label><div className="hq-attack-choices">{catalog.value!.levels.map(l => <RadioGroup.Option as="button" type="button" key={l.key} value={l.key} className="hq-difficulty-option">{l.name} · {l.duration_secs} s</RadioGroup.Option>)}</div></RadioGroup>
      </div>
      <AttackLeaderboard category={category.id} level={level} />
      <Link className="hq-secondary" to={`/time-attack?category=${category.id}&level=${level}`}>Play Time Attack <SiteIcon name="arrow" /></Link>
    </>}
    {catalog.value && !category && <p>No Time Attack quizzes available yet.</p>}
  </>;
}

export default function LeaderboardPage() {
  const [params, setParams] = useSearchParams();
  const mode = gameMode(params.get("mode"));
  return <div className="hq-leaderboard-page"><Seo {...pageMetadata.leaderboard} />
    <section className="hq-panel hq-leaderboard-panel" aria-labelledby="leaderboard-title">
      <header className="hq-leaderboard-heading"><div><h1 id="leaderboard-title">Rankings</h1><p>{mode === "this-or-that" ? "Actor favourites, chosen by players" : mode === "daily" ? "Daily streaks" : "All-time personal bests"}</p></div><span className="hq-leaderboard-symbol"><SiteIcon name="trophy" /></span></header>
      <ModeSwitcher label="Ranking mode" value={mode} onChange={value => { const next = new URLSearchParams(params); next.set("mode", value); setParams(next, { preventScrollReset: true }); }} />
      <div className="hq-rankings-content">{mode === "classic" ? <ClassicRankings /> : mode === "time-attack" ? <AttackRankings /> : mode === "this-or-that" ? <ActorRanking /> : <><StreakLeaderboard refreshKey={dailyDate()} /><Link className="hq-secondary" to="/daily">Play Daily <SiteIcon name="arrow" /></Link></>}</div>
    </section>
  </div>;
}
