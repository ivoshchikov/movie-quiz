// frontend/src/components/Layout.tsx
import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { getCategories, getProfile, Category } from "../api";
import { useAuth } from "../AuthContext";
import LoginModal from "./LoginModal";

export default function Layout() {
  /* ─── auth ─────────────────────────────── */
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ nickname: string | null } | null>(
    null,
  );
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!user) return setProfile(null);
    getProfile(user.id).then(setProfile).catch(console.error);
  }, [user]);

  /* ─── категории для навбара ─────────────── */
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCats).catch(console.error);
  }, []);

  /* ─── активная категория по location.state */
  const loc = useLocation();
  const activeId: number | undefined = (loc.state as any)?.categoryId;

  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen text-white bg-black">
      {/* ── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 bg-[#0d0d0d]/95 backdrop-blur shadow-md">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          {/* logo */}
          <Link to="/" className="text-xl font-bold whitespace-nowrap">
            Hard&nbsp;Quiz
          </Link>

          {/* nav items */}
          <nav className="hidden md:flex items-center space-x-6 text-sm">
            {cats.map((c) => (
              <Link
                key={c.id}
                to="/"
                state={{ categoryId: c.id }}
                className={`hover:text-indigo-400 ${
                  activeId === c.id
                    ? "font-semibold border-b-2 border-indigo-500 pb-[2px]"
                    : ""
                }`}
              >
                {c.name}
              </Link>
            ))}

            <Link to="/how-to-play" className="hover:text-indigo-400">
              Rules
            </Link>
          </nav>

          {/* auth area */}
          <div className="flex items-center">
            {!user ? (
              <button
                onClick={() => setShowLogin(true)}
                className="text-sm font-medium hover:text-indigo-400"
              >
                Log&nbsp;in
              </button>
            ) : (
              <>
                {profile?.nickname && (
                  <span className="mr-4 text-sm opacity-80 hidden sm:inline">
                    {profile.nickname}
                  </span>
                )}
                <button
                  onClick={() => signOut()}
                  className="text-sm font-medium hover:text-indigo-400"
                >
                  Log&nbsp;out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="bg-gray-900 text-sm py-4">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:text-left">
          © {year}&nbsp;Hard&nbsp;Quiz
        </div>
      </footer>

      {/* ── Login modal ─────────────────────────────────── */}
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
