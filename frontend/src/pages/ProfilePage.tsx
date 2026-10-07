import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { countQuestions, getDailyUserStreak, getMyBest } from "../api";
import type { Category, DifficultyLevel, UserBestRow } from "../api";
import { useAuth } from "../AuthContext";
import { categoryLabel, useQuizCatalog } from "../hooks/useQuizCatalog";
import { READ_TIMEOUT, useReadRequest } from "../hooks/useReadRequest";
import { dailyDate, nextDailyReset } from "../daily/time";
import { isGameResult, RESULT_UPDATED } from "../game/resultStorage";
import { formatQuizDuration } from "../leaderboard/useLeaderboard";
import type { SiteOutletContext } from "../components/Layout";
import SiteIcon from "../components/SiteIcon";
import Seo from "../components/Seo";
import "../profile.css";

const EMPTY: UserBestRow[] = [];
const updatedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
function RecordRow({ row, category, difficulty, refresh, metadataLoading }: { row: UserBestRow; category?: Category; difficulty?: DifficultyLevel; refresh: number; metadataLoading: boolean }) {
  const loadCount = useCallback((signal: AbortSignal) => countQuestions(row.category_id, row.difficulty_level_id, signal), [row.category_id, row.difficulty_level_id]);
  const available = useReadRequest(`${row.category_id}:${row.difficulty_level_id}:${refresh}`, loadCount, !!category && !!difficulty);
  const date = new Date(row.updated_at);
  const validDate = !!row.updated_at && Number.isFinite(date.getTime());
  const query = `category=${row.category_id}&difficulty=${row.difficulty_level_id}`;
  const label = `${category ? categoryLabel(category) : `Category ${row.category_id}`} — ${difficulty?.name ?? `Level ${row.difficulty_level_id}`}`;
  return <tr>
    <th scope="row">{difficulty?.name ?? `Level ${row.difficulty_level_id}`}</th>
    <td className="hq-profile-score"><span aria-hidden="true" className="hq-profile-mobile-label">Score</span><strong>{row.best_score}</strong></td>
    <td className="hq-profile-duration"><span aria-hidden="true" className="hq-profile-mobile-label">Quiz duration</span>{formatQuizDuration(row.best_time)}</td>
    <td className="hq-profile-date"><span aria-hidden="true" className="hq-profile-mobile-label">Updated</span>{validDate ? <time dateTime={date.toISOString()} title={date.toLocaleString("en-US")}>{updatedDate.format(date)}</time> : "—"}</td>
    <td className="hq-profile-record-actions">
      {metadataLoading ? <span className="hq-profile-unavailable">Loading quiz details…</span>
        : !category || !difficulty ? <span className="hq-profile-unavailable">Quiz details unavailable</span>
        : available.error ? <span role="alert" className="hq-profile-unavailable">Availability could not be checked. <button className="hq-inline-action" onClick={available.retry} aria-label={`Retry availability for ${label}`}>Retry</button></span>
        : available.loading ? <span className="hq-profile-unavailable">Checking availability…</span>
        : available.value === 0 ? <span className="hq-profile-unavailable">Quiz unavailable</span>
        : <Link className="hq-profile-play hq-inline-action" to="/play" state={{ categoryId: row.category_id, difficultyId: row.difficulty_level_id }} aria-label={`Play again: ${label}`}>Play again <SiteIcon name="arrow" /></Link>}
      {!!category && !!difficulty && <Link className="hq-profile-ranking hq-text-action" to={`/leaderboard?${query}`} aria-label={`View leaderboard: ${label}`}>View leaderboard</Link>}
    </td>
  </tr>;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const owner = user?.id ?? "";
  const { nickname, profileReady, profileError, retryProfile, chooseNickname } = useOutletContext<SiteOutletContext>();
  const catalog = useQuizCatalog(false, READ_TIMEOUT);
  const loadBests = useCallback((signal: AbortSignal) => getMyBest(owner, signal), [owner]);
  const bests = useReadRequest(owner, loadBests, !!owner);
  const [date, setDate] = useState(dailyDate);
  const loadDaily = useCallback((signal: AbortSignal) => getDailyUserStreak(owner, signal).then(value => value ?? { current_streak: 0, longest_streak: 0, total_correct: 0 }), [owner]);
  const daily = useReadRequest(`${owner}:${date}`, loadDaily, !!owner);
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);
  const retryBests = bests.retry, retryDaily = daily.retry;
  useEffect(() => {
    const updated = (event: Event) => {
      const result: unknown = (event as CustomEvent<unknown>).detail;
      if (isGameResult(result) && result.saveStatus === "saved" && result.userId === owner) {
        retryBests(); setAvailabilityRefresh(value => value + 1);
      }
    };
    const visible = () => { if (document.visibilityState === "visible") { setDate(dailyDate()); retryDaily(); } };
    const timeout = window.setTimeout(() => setDate(dailyDate()), Math.max(1, nextDailyReset() - Date.now()));
    window.addEventListener(RESULT_UPDATED, updated);
    document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener(RESULT_UPDATED, updated); document.removeEventListener("visibilitychange", visible); window.clearTimeout(timeout); };
  }, [owner, date, retryBests, retryDaily]);
  const rows = bests.value ?? EMPTY;
  const groups = [...new Set(rows.map(row => row.category_id))].sort((a, b) => {
    const ai = catalog.categories.findIndex(cat => cat.id === a), bi = catalog.categories.findIndex(cat => cat.id === b);
    return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi) || a - b;
  });
  const refresh = () => { retryBests(); retryDaily(); retryProfile(); catalog.reload(); setDate(dailyDate()); setAvailabilityRefresh(value => value + 1); };
  const refreshing = bests.loading || daily.loading || catalog.loading || !profileReady && !profileError;
  return <div className="hq-profile-page">
    <Seo title="My Results | Hard Quiz" noindex />
    <section className="hq-panel hq-profile-panel" aria-labelledby="profile-title">
      <header className="hq-profile-heading"><div><h1 id="profile-title">My results</h1><p>Your personal bests, in one place.</p></div><span className="hq-profile-symbol"><SiteIcon name="chart" /></span></header>
      <div className="hq-profile-identity" aria-label="Player identity">
        <span className="hq-profile-avatar" aria-hidden="true">{(nickname || "U").slice(0, 1).toUpperCase()}</span>
        <div>{profileError ? <p role="alert">Player details could not be loaded. <button className="hq-inline-action" onClick={retryProfile}>Retry profile</button></p>
          : !profileReady ? <p role="status">Loading player details…</p>
          : nickname ? <><h2>{nickname}</h2><p>Your leaderboard nickname</p></>
          : <><h2>Choose your player name</h2><button className="hq-inline-action" onClick={chooseNickname}>Choose nickname</button></>}
        </div>
      </div>
      <section className="hq-profile-daily" aria-labelledby="profile-daily-title">
        <div className="hq-profile-section-heading"><h2 id="profile-daily-title">Daily Challenge</h2><Link className="hq-text-action" to="/daily">View Daily <SiteIcon name="arrow" /></Link></div>
        {daily.error && <p role="alert" className="hq-profile-message">Your Daily stats could not be loaded. <button className="hq-inline-action" onClick={daily.retry}>Retry Daily stats</button></p>}
        {daily.value ? <dl><div><dt>Current streak</dt><dd>{daily.value.current_streak}<span> {daily.value.current_streak === 1 ? "day" : "days"}</span></dd></div><div><dt>Best streak</dt><dd>{daily.value.longest_streak}<span> {daily.value.longest_streak === 1 ? "day" : "days"}</span></dd></div></dl>
          : !daily.error && <p role="status" className="hq-profile-message">Loading your streak…</p>}
      </section>
      <section className="hq-profile-results" aria-labelledby="profile-bests-title" aria-busy={bests.loading}>
        <div className="hq-profile-section-heading"><h2 id="profile-bests-title">Personal bests{bests.value !== undefined && <span className="hq-profile-count">{rows.length}</span>}</h2><button className="hq-profile-refresh hq-text-action" onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh results"}</button></div>
        <p className="hq-profile-note">One saved record per category and difficulty. Score is the number of correct answers; Quiz duration is the total time of that run.</p>
        {catalog.error && <p role="alert" className="hq-profile-message">Quiz names could not be loaded. Your saved records are still shown. <button className="hq-inline-action" onClick={catalog.reload}>Retry quiz details</button></p>}
        {bests.error && <p role="alert" className="hq-profile-message">{bests.value === undefined ? "Your results could not be loaded." : "Your results could not be refreshed. Showing previously loaded records."} <button className="hq-inline-action" onClick={bests.retry}>Retry results</button></p>}
        {bests.value === undefined ? !bests.error && <div className="hq-profile-skeleton"><p role="status">Loading your results…</p><div aria-hidden="true" /><div aria-hidden="true" /></div>
          : !rows.length ? <div className="hq-profile-empty"><SiteIcon name="trophy" /><h3>Your first personal best is waiting</h3><p>Play a regular quiz while logged in. Your best score for each quiz will appear here after it is saved.</p><Link className="hq-primary" to="/">Start a quiz <SiteIcon name="arrow" /></Link></div>
          : groups.map(id => {
            const category = catalog.categories.find(cat => cat.id === id);
            const label = category ? categoryLabel(category) : `Category ${id}`;
            const group = rows.filter(row => row.category_id === id).sort((a, b) => {
              const ai = catalog.difficulties.findIndex(level => level.id === a.difficulty_level_id), bi = catalog.difficulties.findIndex(level => level.id === b.difficulty_level_id);
              return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi) || a.difficulty_level_id - b.difficulty_level_id;
            });
            return <section key={id} className="hq-profile-group" aria-labelledby={`profile-category-${id}`}><h3 id={`profile-category-${id}`}>{label}</h3>
              <table className="hq-profile-table" aria-label={`${label} personal bests`}><thead><tr><th scope="col">Difficulty</th><th scope="col" className="hq-profile-score">Score</th><th scope="col">Quiz duration</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{group.map(row => <RecordRow key={`${owner}:${row.difficulty_level_id}`} row={row} category={catalog.error || catalog.loading ? undefined : category} difficulty={catalog.error || catalog.loading ? undefined : catalog.difficulties.find(level => level.id === row.difficulty_level_id)} refresh={availabilityRefresh} metadataLoading={catalog.loading} />)}</tbody></table>
            </section>;
          })}
      </section>
    </section>
  </div>;
}
