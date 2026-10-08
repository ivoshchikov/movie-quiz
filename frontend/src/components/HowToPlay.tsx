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
        <li><span aria-hidden="true">2</span><div><h2>Look at the image</h2><p>Your question timer starts when the image is ready.</p></div></li>
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
          <div><dt>Time left</dt><dd>The countdown for the current question. It starts after the image loads. Switching tabs does not pause it.</dd></div>
          <div><dt>Quiz duration</dt><dd>The total time from the start of your quiz to its end. It includes question and image loading, feedback and time in the background. During play, it is labelled <strong>Elapsed</strong>.</dd></div>
        </dl>
        <p className="hq-howto-note">An image-loading or answer-checking error does not cost a life. Follow the on-screen retry instructions; Quiz duration keeps counting.</p>
      </section>

      <section className="hq-howto-section" aria-labelledby="howto-end">
        <h2 id="howto-end">When a quiz ends</h2>
        <p>A regular quiz ends when you lose your last life, reach the end of the available questions, or choose to exit. Leaving, reloading or closing the page also ends that run.</p>
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
        <p>Log in <strong>before starting a quiz</strong> to save personal bests and join the leaderboard. Records are kept separately for each category and difficulty, with the final Quiz duration.</p>
        <div className="hq-howto-links"><Link to="/profile">Your records <SiteIcon name="arrow" /></Link><Link to="/leaderboard">Leaderboard <SiteIcon name="arrow" /></Link></div>
      </section>

      <section className="hq-howto-daily" aria-labelledby="howto-daily">
        <div className="hq-howto-daily-heading"><SiteIcon name="calendar" /><h2 id="howto-daily">Daily Challenge</h2></div>
        <p>A separate challenge: one question and one answer per day. An account is required.</p>
        <ul>
          <li><strong>No time limit.</strong> Answer time measures how long you take to choose your answer; it keeps counting in the background.</li>
          <li><strong>Build a streak.</strong> Correct answers on consecutive days extend your streak.</li>
          <li><strong>A new question at midnight.</strong> Daily resets in America/Chicago (US Central), which may differ from your local date.</li>
        </ul>
        <Link to="/daily" className="hq-howto-daily-link">View Daily & its reset countdown <SiteIcon name="arrow" /></Link>
      </section>

      <footer className="hq-howto-bottom"><p>Ready for your first question?</p><Link to="/" className="hq-primary">Start a quiz <SiteIcon name="arrow" /></Link></footer>
    </article>
  </>;
}
