import { Fragment, useCallback, useEffect, useState } from "react";
import { Outlet, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, Transition } from "@headlessui/react";
import { Helmet } from "react-helmet-async";
import { getProfile, isAdmin } from "../api";
import { useAuth } from "../AuthContext";
import LoginModal from "./LoginModal";
import NicknameModal from "./NicknameModal";
import SiteIcon from "./SiteIcon";
import { loadGA, pageview } from "../analytics/ga";
import { flushPendingGameResults, recoverInterruptedGame } from "../game/resultStorage";
import { useReadRequest } from "../hooks/useReadRequest";
import "../homepage.css";
import { consumeAuthReturn, loginReturnPath, publicSearch } from "../auth/redirect";
import "../login.css";

const CANON_BASE = "https://hard-quiz.com";
const DEFAULT_OG = `${CANON_BASE}/api/og/post?title=${encodeURIComponent("Hard Quiz — Guess Movies from Stills & Faces")}&tags=${encodeURIComponent("Play now,Daily Challenge")}`;
export interface SiteOutletContext {
  chooseNickname: () => void; openLogin: () => void; setDailyPlaying: (value: boolean) => void;
  profileReady: boolean; hasNickname: boolean; nickname: string | null;
  profileError: boolean; retryProfile: () => void;
}
function storedValue(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export default function Layout() {
  const { user, session, loading: authLoading, error: authError, retrySession, callbackError, clearCallbackError, authReturned, finishAuthReturn, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [showNickname, setShowNickname] = useState(false);
  const [admin, setAdmin] = useState<{ owner: string; value: boolean } | null>(null);
  const [dailyPlaying, setDailyPlaying] = useState(false);
  const isProfileSetup = loc.pathname === "/setup-profile";
  const isPlaying = loc.pathname === "/play";
  const isGameView = isPlaying || (loc.pathname === "/daily" && dailyPlaying);
  const owner = user?.id ?? "";
  const loadProfile = useCallback((signal: AbortSignal) => getProfile(owner, signal), [owner]);
  const account = useReadRequest(owner, loadProfile, !authLoading && !!owner);
  const nickname = account.value?.nickname ?? null;
  const profileReady = !user || (!account.loading && !account.error && account.value !== undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!isPlaying) recoverInterruptedGame();
    const flush = () => { void flushPendingGameResults(session); };
    flush();
    window.addEventListener("online", flush);
    const visible = () => { if (document.visibilityState === "visible") flush(); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener("online", flush); document.removeEventListener("visibilitychange", visible); };
  }, [session, authLoading, isPlaying]);

  useEffect(() => {
    let active = true;
    setAdmin(null);
    setShowNickname(false);
    if (!owner) return;
    isAdmin().then(value => { if (active) setAdmin({ owner, value }); }).catch(() => {});
    return () => { active = false; };
  }, [owner]);

  useEffect(() => {
    if (owner && profileReady && !nickname && !isProfileSetup) setShowNickname(true);
  }, [owner, profileReady, nickname, isProfileSetup]);

  useEffect(() => {
    if (!user || authLoading || !authReturned) return;
    const saved = consumeAuthReturn();
    finishAuthReturn(); setShowLogin(false);
    // A direct callback destination wins over another attempt's fallback.
    const destination = loc.pathname === "/login" ? loginReturnPath(loc) : loc.pathname === "/" ? saved : null;
    if (destination && loc.pathname + loc.search + loc.hash !== destination) navigate(destination, { replace: true });
  }, [user, authLoading, authReturned, finishAuthReturn, navigate, loc]);

  useEffect(() => { setShowLogin(false); }, [loc.pathname, loc.search]);

  const { pathname } = loc;
  const search = publicSearch(loc.search);
  useEffect(() => { loadGA(); }, []);
  useEffect(() => { pageview(`${pathname}${search || ""}`); }, [pathname, search]);
  const orgJsonLd = { "@context": "https://schema.org", "@type": "Organization", name: "Hard Quiz", url: CANON_BASE, logo: `${CANON_BASE}/vite.svg` };

  return <div className={`hq-site${isGameView ? " hq-site-playing" : ""}`}>
    <Helmet>
      <link rel="canonical" href={`${CANON_BASE}${pathname}${pathname === "/login" ? "" : search || ""}`} />
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
      <meta property="og:image" content={DEFAULT_OG} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={DEFAULT_OG} />
    </Helmet>
    {!isGameView && <header className="hq-header">
      <div className="hq-shell hq-header-inner">
        <Link to="/" className="hq-brand"><span className="hq-brand-mark"><SiteIcon name="cinema" /></span>Hard Quiz</Link>
        <nav className="hq-nav" aria-label="Main navigation">
          <NavLink to="/" end className="hq-nav-link">Play</NavLink>
          <NavLink to="/daily" className="hq-nav-link">Daily</NavLink>
          <NavLink to="/leaderboard" className="hq-nav-link">Leaderboard</NavLink>
          <NavLink to="/blog" className="hq-nav-link">Blog</NavLink>
        </nav>
        {authLoading && !authError ? <span className="hq-account-button hq-account" role="status">Checking account…</span> : !user ? <button className="hq-account-button hq-account" onClick={() => { clearCallbackError(); setShowLogin(true); }}>{authError ? "Check account" : "Log in"}</button>
          : <Menu as="div" className="hq-account">
            <Menu.Button className="hq-account-button" aria-label="Account menu">
              <span className="hq-avatar">{(nickname || "U").slice(0, 1).toUpperCase()}</span>
              <span className="hq-account-name">{nickname || "My account"}</span><SiteIcon name="chevron" />
            </Menu.Button>
            <Transition as={Fragment} enter="transition duration-100 ease-out" enterFrom="opacity-0" enterTo="opacity-100" leave="transition duration-75 ease-in" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Menu.Items className="hq-account-menu">
                <Menu.Item><Link className="hq-menu-item" to="/profile"><SiteIcon name="chart" />My results</Link></Menu.Item>
                {admin?.owner === owner && admin.value && <Menu.Item><Link className="hq-menu-item" to="/admin/daily"><SiteIcon name="settings" />Admin</Link></Menu.Item>}
                <div className="hq-menu-divider" />
                <Menu.Item><button className="hq-menu-item" onClick={() => signOut()}><SiteIcon name="logout" />Log out</button></Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>}
      </div>
    </header>}
    <main className={isGameView ? "hq-play-main" : pathname === "/" ? "hq-shell hq-main" : pathname === "/result" ? "hq-result-main" : pathname === "/daily" ? "hq-daily-main" : "mx-auto w-full max-w-6xl flex-1 px-4 py-6"}>
      {pathname !== "/login" && !showLogin && (callbackError || authError && pathname !== "/profile") && <div className="hq-auth-banner" role="alert"><p>{callbackError || authError}</p><button className="hq-inline-action" onClick={() => { if (authError) retrySession(); else { clearCallbackError(); setShowLogin(true); } }}>{authError ? "Retry sign-in check" : "Try signing in again"}</button></div>}
      <Outlet context={{ chooseNickname: () => { if (profileReady && !nickname) setShowNickname(true); }, openLogin: () => setShowLogin(true), setDailyPlaying,
        profileReady, hasNickname: !!nickname, nickname, profileError: account.error, retryProfile: account.retry } satisfies SiteOutletContext} />
    </main>
    {!isGameView && <footer className="hq-footer"><div className="hq-shell hq-footer-inner"><span>© {new Date().getFullYear()} Hard Quiz</span><Link to="/how-to-play" className="hq-text-action">How to play <SiteIcon name="arrow" /></Link></div></footer>}
    <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    <NicknameModal key={owner} open={showNickname && !!user && profileReady && !nickname && !isProfileSetup && !isGameView} onClose={() => setShowNickname(false)} prefill={storedValue("pre_nickname") || ""} onSaved={account.retry} />
  </div>;
}
