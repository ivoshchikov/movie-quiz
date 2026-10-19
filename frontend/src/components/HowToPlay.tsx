import { useCallback } from "react";
import { Link } from "react-router-dom";
import { getDifficultyLevels } from "../api";
import { useReadRequest } from "../hooks/useReadRequest";
import howToPlayMetadata from "../howToPlayMetadata.json";
import Seo from "./Seo";
import SiteIcon from "./SiteIcon";
import "../how-to-play.css";

export default function HowToPlay() {
  const loadLevels = useCallback(async (signal: AbortSignal) => {
    const levels = await getDifficultyLevels(signal);
    const ids = new Set<number>();
    if (!Array.isArray(levels)) throw new Error("invalid-difficulties");
    for (const level of levels) {
      if (!level || !Number.isInteger(level.id) || level.id < 1 || ids.has(level.id) ||
        typeof level.name !== "string" || !level.name.trim() ||
        !Number.isFinite(level.time_limit_secs) || level.time_limit_secs <= 0 ||
        !Number.isInteger(level.lives) || level.lives < 1 ||
        (level.sort_order != null && !Number.isFinite(level.sort_order))) throw new Error("invalid-difficulties");
      ids.add(level.id);
    }
    return [...levels].sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
  }, []);
  const levels = useReadRequest("how-to-play-difficulties", loadLevels);

  return <>
    <Seo {...howToPlayMetadata} />
    <article className="hq-panel hq-howto" aria-labelledby="howto-heading">
      <header className="hq-howto-intro">
        <p className="hq-eyebrow">The quick guide</p>
        <h1 id="howto-heading">How to play</h1>
        <p>Guess movies from still frames or actors from photos. Choose one of four answers before time runs out.</p>
        <div className="hq-howto-actions">
          <Link to="/" className="hq-primary">Start a quiz <SiteIcon name="arrow" /></Link>
          <Link to="/daily" className="hq-secondary">View Daily</Link>
        </div>
      </header>

      <ol className="hq-howto-steps" aria-label="Three steps to play a regular quiz">
        <li><span aria-hidden="true">1</span><div><h2>Choose your quiz</h2><p>Pick a category and difficulty on the Play page.</p></div></li>
        <li><span aria-hidden="true">2</span><div><h2>Look at the image</h2><p>The server starts your question timer when it issues the question. Loading time counts.</p></div></li>
        <li><span aria-hidden="true">3</span><div><h2>Choose an answer</h2><p>Tap one of four choices, or use keys 1–4.</p></div></li>
      </ol>

      <section className="hq-howto-section" aria-labelledby="howto-rules">
        <h2 id="howto-rules">Points & lives</h2>
        <ul className="hq-howto-rule-grid">
          <li><strong>Every correct answer: +1 point</strong><p>You keep all the points you earn. A mistake does not reset your score.</p></li>
          <li><strong>Wrong answer or timeout: −1 life</strong><p>Both cost one life. The correct answer is not revealed afterwards.</p></li>
          <li><strong>One choice per question</strong><p>Your answer locks as soon as you choose it. There is no free skip.</p></li>
          <li><strong>A new question follows</strong><p>The next image appears after brief feedback, while you still have lives and questions left.</p></li>
        </ul>
      </section>

      <section className="hq-howto-section" aria-labelledby="howto-difficulty">
        <h2 id="howto-difficulty">Difficulty levels</h2>
        <p>These are the current settings used by the game. Choose from the quizzes available on the Play page.</p>
        <div className="hq-howto-levels" aria-busy={levels.loading}>
          {levels.loading && <p role="status">Loading difficulty settings…</p>}
          {levels.value && levels.value.length > 0 && <table>
            <caption className="sr-only">Current regular quiz difficulty settings</caption>
            <thead><tr><th scope="col">Difficulty</th><th scope="col">Time per question</th><th scope="col">Lives</th></tr></thead>
            <tbody>{levels.value.map(level => <tr key={level.id}>
              <th scope="row">{level.name.trim()}</th><td>{level.time_limit_secs} s</td><td>{level.lives}</td>
            </tr>)}</tbody>
          </table>}
          {levels.error && <div className="hq-howto-status"><p role="alert">Difficulty settings couldn’t load. The rest of the rules are still available.</p><button className="hq-secondary" onClick={levels.retry} disabled={levels.loading}>Try again</button></div>}
          {!levels.loading && !levels.error && levels.value?.length === 0 && <div className="hq-howto-status"><p>No difficulty settings are available right now.</p><button className="hq-secondary" onClick={levels.retry}>Try again</button></div>}
        </div>
      </section>

      <section className="hq-howto-section" aria-labelledby="howto-clocks">
        <h2 id="howto-clocks">Two different clocks</h2>
        <dl className="hq-howto-clocks">
          <div><dt>Time left</dt><dd>The countdown for the current question. It starts when the server issues the question, including image loading. Switching tabs does not pause it.</dd></div>
          <div><dt>Quiz duration</dt><dd>The total time from the start of your quiz to its end. It includes question and image loading, feedback and time in the background. During play, it is labelled <strong>Elapsed</strong>.</dd></div>
        </dl>
        <p className="hq-howto-note">The server deadline applies during connection and image-loading errors too. Retry confirms the same question or chosen answer; it never resets a clock. The final duration stops when the server accepts the last answer, or receives your exit.</p>
      </section>

      <section className="hq-howto-section" aria-labelledby="howto-end">
        <h2 id="howto-end">When a quiz ends</h2>
        <p>A regular quiz ends when you lose your last life, reach the end of the available questions, or choose to exit. Leaving, reloading or closing the page also ends that run.</p>
        <p>If your browser cannot send an exit, the server closes the quiz after 15 minutes without activity. Its current question still counts as a timeout if its deadline passed. Starting another signed-in quiz ends your previous run; returning to its tab shows the saved result.</p>
        <p>You can revisit your last result and start a new quiz. A regular quiz cannot be resumed.</p>
      </section>

      <details className="hq-howto-demo">
        <summary>See the game screen</summary>
        <figure>
          <img src="/how-to-play-game.png" width="720" height="684" loading="lazy" decoding="async"
            alt="Example quiz screen: an image, four answer buttons, Time left, Score, Lives and Elapsed." />
          <figcaption>The current game layout, with an illustrative image and sample answers. Your quiz uses movie stills or actor photos.</figcaption>
        </figure>
      </details>

      <section className="hq-howto-section" aria-labelledby="howto-records">
        <h2 id="howto-records">Guests & saved records</h2>
        <p>You can play regular quizzes without an account. Your last guest result stays on this device while browser storage is available; logging in later does not add it to your account.</p>
        <p>Log in <strong>before starting a quiz</strong> to save personal bests and join the leaderboard. Records are kept separately for each category and difficulty. Higher scores rank first; equal scores are ordered by shorter Quiz duration. The server measures time, so your connection can affect it.</p>
        <div className="hq-howto-links"><Link to="/profile">Your records <SiteIcon name="arrow" /></Link><Link to="/leaderboard">Leaderboard <SiteIcon name="arrow" /></Link></div>
      </section>

      <section id="this-or-that" className="hq-howto-section" aria-labelledby="howto-this-that"><h2 id="howto-this-that">This or That</h2><p>Choose the actor you like more from two random faces. There are no right answers, lives or timer. Each set has ten pairs; after your choice, a short pause leads automatically to the next pair.</p><p>You can like both equally, mark an unfamiliar actor or skip. These choices do not award community votes. Every accepted choice is saved immediately, even if you leave before finishing a set.</p><p>Each pair appears once before your available pair pool starts over. Repeated comparisons can update your private favourites, but a verified account contributes only its first public vote on a pair. Guest favourites stay personal and can be saved privately after login.</p><p>Your personal top is visible only to you. The community ranking needs enough different voters; an early place may change. Pair percentages appear after your choice when at least twenty other eligible accounts have chosen that pair.</p><Link className="hq-text-action" to="/this-or-that">Play This or That <SiteIcon name="arrow" /></Link></section>
      <section id="time-attack" className="hq-howto-section" aria-labelledby="howto-time-attack">
        <h2 id="howto-time-attack">Time Attack</h2>
        <p>A fixed-time race for Movie Stills or Actors. Easy gives you 120 seconds, Medium 90, and Hard 60. All three use the same mixed question bank: two Easy, two Medium and one Hard question in each shuffled block while those questions remain. When a difficulty runs out, the remaining questions continue without repeats.</p>
        <ul>
          <li>Correct answer: +2 points. Wrong answer: −1 point. Scores can go below zero.</li>
          <li>Skip: −3 seconds, once per question. You cannot come back to a skipped question. A skip with less than three seconds left ends the run immediately.</li>
          <li>No lives or per-question timer. The overall clock runs during image loading, network requests, the 0.5-second feedback pause and time in another tab.</li>
          <li>The run ends at the server deadline, when the bank is exhausted, or when you choose End run. An unanswered final question costs no points.</li>
          <li>Reloading or leaving the page keeps the original run and deadline. Continue from the Time Attack page on this browser, or use your account on another device. Starting a new signed-in quiz ends your previous active quiz.</li>
          <li>Sign in before starting to save a personal best. Guest results stay guest results. Records are separate from regular quizzes, per category, time pressure and this fixed-time format.</li>
          <li>Higher scores rank first. Equal scores use server time to the last accepted answer that forms the final score, including wrong answers. If you submit no answers, the run duration is used. Exact ties keep the earlier record first, then a stable player order. Connection speed can affect time.</li>
        </ul>
        <Link className="hq-text-action" to="/time-attack">Play Time Attack <SiteIcon name="arrow" /></Link>
      </section>

      <section className="hq-howto-daily" aria-labelledby="howto-daily">
        <div className="hq-howto-daily-heading"><SiteIcon name="calendar" /><h2 id="howto-daily">Daily Challenge</h2></div>
        <p>A separate challenge: one movie, TV series or actor question and one answer per day. An account is required.</p>
        <ul>
          <li><strong>Until midnight US Central.</strong> Answer time runs from the first server start until the server accepts your answer, including loading, connection delays and time away. Continuing on another device keeps the original start.</li>
          <li><strong>Build a streak.</strong> Correct answers on consecutive days extend your streak.</li>
          <li><strong>Cancelled days are neutral.</strong> If an incorrect Daily is cancelled, it is cancelled for everyone. It does not break a streak or add a correct day.</li>
          <li><strong>A new question at midnight.</strong> Daily resets in America/Chicago (US Central), which may differ from your local date. Yesterday’s question closes immediately; unsent or late answers cannot be saved after the reset.</li>
        </ul>
        <Link to="/daily" className="hq-howto-daily-link">View Daily & its reset countdown <SiteIcon name="arrow" /></Link>
      </section>

      <footer className="hq-howto-bottom"><p>Ready for your first question?</p><Link to="/" className="hq-primary">Start a quiz <SiteIcon name="arrow" /></Link></footer>
    </article>
  </>;
}
