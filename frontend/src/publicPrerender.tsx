import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { Link } from "react-router-dom";
import ThisThatIntro from "./thisThat/ThisThatIntro";
import TimeAttackIntro from "./timeAttack/TimeAttackIntro";
import ModePreview from "./components/ModePreview";
import StartScreen from "./components/StartScreen";
import GameModeLinks from "./components/GameModeLinks";
import pageMetadata from "./pageMetadata.json";
import HowToPlay from "./components/HowToPlay";
import LeaderboardPage from "./pages/LeaderboardPage";

/** No live API requests, accounts, scores or question data are read at build time. */
export function renderPublicPage(route: string): string {
  const content = route === "/this-or-that" ? <section className="hq-panel hq-pick-panel"><ThisThatIntro /><p>10 pairs · No timer · No wrong answers</p><ModePreview mode="this-or-that" /><p>Choose an actor, like both equally, mark an unfamiliar face or skip. Play free as a guest to keep your personal favourites private. Sign in before choosing to contribute eligible votes to the community ranking.</p><Link className="hq-primary" to="/?mode=this-or-that">Choose a pair</Link><Link className="hq-text-action" to="/how-to-play#this-or-that">How it works</Link></section> : route === "/time-attack" ? <section className="hq-panel hq-attack-panel"><TimeAttackIntro /><p>Correct: +2 points · Wrong: −1 point · Skip: −3 seconds</p><ModePreview mode="time-attack" /><p>Choose Movie Stills or Actors. Easy: 120 seconds, Medium: 90, Hard: 60. The timer continues during loading and time away. Play free as a guest, or sign in before starting to save a record.</p><Link className="hq-primary" to="/?mode=time-attack">Choose Time Attack options</Link><Link className="hq-text-action" to="/how-to-play#time-attack">How it works</Link></section> : route === "/" ? <StartScreen /> : route === "/how-to-play" ? <HowToPlay /> : route === "/leaderboard" ? <LeaderboardPage /> :
    <section className="hq-daily-card" aria-label="Daily Challenge"><div className="hq-daily-content"><h1>{pageMetadata.daily.heading}</h1><p>{pageMetadata.daily.intro}</p><div className="hq-daily-rules"><span>One answer per day</span><span>Until midnight US Central</span></div><p>Daily requires an account to save your answer and track your streak.</p><Link className="hq-primary" to="/login?redirect=%2Fdaily">Log in to play</Link><Link className="hq-inline-action" to="/">Play as a guest</Link><p>Resets at midnight US Central (America/Chicago).</p><Link className="hq-text-action" to="/how-to-play#daily">Daily rules</Link></div></section>;
  const relatedMode = route === "/daily" ? "daily" : route === "/time-attack" ? "time-attack" : route === "/this-or-that" ? "this-or-that" : null;
  const shell = route === "/" ? "hq-shell hq-main" : route === "/daily" ? "hq-daily-main" : "mx-auto w-full max-w-6xl flex-1 px-4 py-6";
  return renderToStaticMarkup(<HelmetProvider context={{}}><StaticRouter location={route}><div className="hq-site"><header className="hq-header"><div className="hq-shell hq-header-inner"><Link className="hq-brand" to="/">Hard Quiz</Link><nav className="hq-nav" aria-label="Main navigation">{[["/", "Games"], ["/leaderboard", "Rankings"], ["/blog", "Blog"]].map(([to, label]) => <Link key={to} className="hq-nav-link" aria-current={route === to ? "page" : undefined} to={to}>{label}</Link>)}</nav></div></header><main id="main-content" className={shell}>{route === "/daily" ? <div className="hq-daily-page">{content}{relatedMode && <GameModeLinks current={relatedMode} />}</div> : <>{content}{relatedMode && <GameModeLinks current={relatedMode} />}</>}</main><footer className="hq-footer"><div className="hq-shell hq-footer-inner"><Link to="/how-to-play">How to play</Link></div></footer></div></StaticRouter></HelmetProvider>);
}
