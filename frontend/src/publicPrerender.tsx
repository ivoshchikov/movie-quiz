import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { Link } from "react-router-dom";
import StartScreen from "./components/StartScreen";
import HowToPlay from "./components/HowToPlay";
import LeaderboardPage from "./pages/LeaderboardPage";

/** No live API requests, accounts, scores or question data are read at build time. */
export function renderPublicPage(route: string): string {
  const content = route === "/" ? <StartScreen /> : route === "/how-to-play" ? <HowToPlay /> : route === "/leaderboard" ? <LeaderboardPage /> :
    <section className="hq-daily-card" aria-label="Daily Challenge"><div className="hq-daily-content"><h1>One image. One daily challenge.</h1><p>Identify the movie or actor. Get it right and build your streak, one day at a time.</p><div className="hq-daily-rules"><span>One answer per day</span><span>Until midnight US Central</span></div><p>Daily requires an account to save your answer and track your streak.</p><Link className="hq-primary" to="/login?redirect=%2Fdaily">Log in to play</Link><Link className="hq-inline-action" to="/">Play a regular quiz as a guest</Link><p>Resets at midnight US Central (America/Chicago).</p></div></section>;
  const shell = route === "/" ? "hq-shell hq-main" : route === "/daily" ? "hq-daily-main" : "mx-auto w-full max-w-6xl flex-1 px-4 py-6";
  return renderToStaticMarkup(<HelmetProvider context={{}}><StaticRouter location={route}><div className="hq-site"><header className="hq-header"><div className="hq-shell hq-header-inner"><Link className="hq-brand" to="/">Hard Quiz</Link><nav className="hq-nav" aria-label="Main navigation">{[["/", "Play"], ["/daily", "Daily"], ["/leaderboard", "Leaderboard"], ["/blog", "Blog"]].map(([to, label]) => <Link key={to} className="hq-nav-link" aria-current={route === to ? "page" : undefined} to={to}>{label}</Link>)}</nav></div></header><main id="main-content" className={shell}>{content}</main><footer className="hq-footer"><div className="hq-shell hq-footer-inner"><Link to="/how-to-play">How to play</Link></div></footer></div></StaticRouter></HelmetProvider>);
}
