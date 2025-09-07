// frontend/src/components/Layout.tsx
import { Fragment, useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Transition } from "@headlessui/react";
import { Helmet } from "react-helmet-async";
import { getProfile, isAdmin } from "../api";
import { useAuth } from "../AuthContext";
import LoginModal from "./LoginModal";
import { loadGA, pageview } from "../analytics/ga";

const CANON_BASE = "https://hard-quiz.com";
// Site-wide fallback OG image (pages can override via <Seo ogImage=.../>)
const DEFAULT_OG = `${CANON_BASE}/api/og/post?title=${encodeURIComponent(
  "Hard Quiz — Guess Movies from Stills & Faces"
)}&tags=${encodeURIComponent("Play now,Daily Challenge")}`;

export default function Layout() {
  /* ─── auth ─────────────────────────────── */
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const [profile, setProfile] =
    useState<{ nickname: string | null } | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [amIAdmin, setAmIAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setAmIAdmin(false);
      return;
    }
    getProfile(user.id).then(setProfile).catch(console.error);
    isAdmin().then(setAmIAdmin).catch(() => setAmIAdmin(false));
  }, [user]);

  // Фолбэк-редирект после логина
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem("postLoginRedirectPath");
    if (saved) {
      localStorage.removeItem("postLoginRedirectPath");
      const current = loc.pathname + (loc.search || "");
      if (current !== saved) navigate(saved, { replace: true });
    }
  }, [user, navigate, loc.pathname, loc.search]);

  const { pathname, search } = loc;
  const canonical = `${CANON_BASE}${pathname}${search || ""}`;

  // GA4: init once
  useEffect(() => {
    loadGA();
  }, []);
  // GA4: page_view on route change
  useEffect(() => {
    pageview(`${pathname}${search || ""}`);
  }, [pathname, search]);

  const year = new Date().getFullYear();
  const itemCls = "block px-4 py-2 text-sm hover:text-indigo-400";
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hard Quiz",
    url: CANON_BASE,
    logo: `${CANON_BASE}/vite.svg`,
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* site-wide head bits */}
      <Helmet>
        <link rel="canonical" href={canonical} />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>

        {/* Site-wide default social preview (can be overridden per page) */}
        <meta property="og:image" content={DEFAULT_OG} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={DEFAULT_OG} />
      </Helmet>

      {/* ── Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0d0d0d]/95 backdrop-blur shadow-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          {/* logo */}
          <Link to="/" className="text-xl font-bold whitespace-nowrap">
            Hard&nbsp;Quiz
          </Link>

          {/* ---------- Desktop nav ---------- */}
          <nav className="hidden items-center space-x-6 text-sm md:flex">
            <Link to="/daily" className="hover:text-indigo-400">
              Daily
            </Link>
            <Link to="/blog" className="hover:text-indigo-400">
              Blog
            </Link>
            <Link to="/how-to-play" className="hover:text-indigo-400">
              Rules
            </Link>

            {amIAdmin && (
              <Link to="/admin/daily" className="hover:text-indigo-400">
                Admin
              </Link>
            )}

            {!user ? (
              <button
                onClick={() => setShowLogin(true)}
                className="hover:text-indigo-400"
              >
                Log&nbsp;in
              </button>
            ) : (
              <>
                {profile?.nickname ? (
                  <span className="opacity-80">{profile.nickname}</span>
                ) : (
                  <Link to="/setup-profile" className="hover:text-indigo-400">
                    Set&nbsp;nickname
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="hover:text-indigo-400"
                >
                  Log&nbsp;out
                </button>
              </>
            )}
          </nav>

          {/* ---------- Mobile burger ---------- */}
          <Menu as="div" className="relative md:hidden">
            <Menu.Button className="inline-flex items-center justify-center p-2">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black/50 focus:outline-none">
                <Menu.Item as={Link} to="/daily" className={itemCls}>
                  Daily
                </Menu.Item>
                <Menu.Item as={Link} to="/blog" className={itemCls}>
                  Blog
                </Menu.Item>

                <Menu.Item as={Fragment}>
                  {({ close }) => (
                    <Link
                      to="/how-to-play"
                      onClick={() => close()}
                      className={itemCls}
                    >
                      Rules
                    </Link>
                  )}
                </Menu.Item>

                {amIAdmin && (
                  <Menu.Item as={Link} to="/admin/daily" className={itemCls}>
                    Admin
                  </Menu.Item>
                )}

                <div className="my-1 border-t border-gray-700" />

                {/* auth */}
                {!user ? (
                  <Menu.Item as={Fragment}>
                    {({ close }) => (
                      <button
                        onClick={() => {
                          close();
                          setShowLogin(true);
                        }}
                        className={itemCls}
                      >
                        Log&nbsp;in
                      </button>
                    )}
                  </Menu.Item>
                ) : (
                  <>
                    {profile?.nickname ? (
                      <div className="px-4 py-2 text-sm opacity-80">
                        {profile.nickname}
                      </div>
                    ) : (
                      <Menu.Item as={Link} to="/setup-profile" className={itemCls}>
                        Set nickname
                      </Menu.Item>
                    )}
                    <Menu.Item as={Fragment}>
                      {({ close }) => (
                        <button
                          onClick={() => {
                            close();
                            signOut();
                          }}
                          className={itemCls}
                        >
                          Log&nbsp;out
                        </button>
                      )}
                    </Menu.Item>
                  </>
                )}
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        {/* Глобальный баннер-напоминание про ник (только когда залогинен и ника нет) */}
        {user && profile && !profile.nickname && (
          <div className="bg-yellow-600/15 border-t border-b border-yellow-600/30">
            <div className="mx-auto max-w-6xl px-4 py-2 text-sm">
              Pick a nickname to appear on leaderboards —{" "}
              <Link to="/setup-profile" className="underline">
                set nickname
              </Link>
              .
            </div>
          </div>
        )}
      </header>

      {/* ── Main ───────────────────────────── */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#0d0d0d]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 text-sm opacity-70">
          <span>© {year} Hard Quiz</span>
          <div className="flex items-center gap-4">
            <Link to="/daily" className="hover:opacity-100">
              Daily
            </Link>
            <Link to="/blog" className="hover:opacity-100">
              Blog
            </Link>
            <Link to="/how-to-play" className="hover:opacity-100">
              Rules
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Auth modal ─────────────────────── */}
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
