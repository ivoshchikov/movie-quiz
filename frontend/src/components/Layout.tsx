// frontend/src/components/Layout.tsx
import { Fragment, useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Menu, Transition } from "@headlessui/react";
import { getCategories, getProfile, Category } from "../api";
import { useAuth } from "../AuthContext";
import LoginModal from "./LoginModal";

export default function Layout() {
  /* ── auth ───────────────────────────────────── */
  const { user, signOut } = useAuth();
  const [profile, setProfile] =
    useState<{ nickname: string | null } | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!user) return setProfile(null);
    getProfile(user.id).then(setProfile).catch(console.error);
  }, [user]);

  /* ── categories ─────────────────────────────── */
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCats).catch(console.error);
  }, []);

  /* ── active category from router state ──────── */
  const activeId: number | undefined =
    (useLocation().state as any)?.categoryId;

  const year = new Date().getFullYear();

  /* helper для классов ссылок */
  const navCls = (id?: number) =>
    `block px-4 py-2 text-sm hover:text-indigo-400 ${
      activeId === id ? "font-semibold text-indigo-400" : ""
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* ────────── HEADER ────────── */}
      <header className="sticky top-0 z-30 h-14 bg-[#0d0d0d]/95 backdrop-blur shadow-md">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          {/* logo */}
          <Link to="/" className="whitespace-nowrap text-xl font-bold">
            Hard&nbsp;Quiz
          </Link>

          {/* ── Desktop nav ───────────────── */}
          <nav className="hidden items-center space-x-6 text-sm md:flex">
            {cats.map((c) => (
              <Link
                key={c.id}
                to="/"
                state={{ categoryId: c.id }}
                className={
                  activeId === c.id
                    ? "border-b-2 border-indigo-500 pb-[2px] font-semibold"
                    : "hover:text-indigo-400"
                }
              >
                {c.name}
              </Link>
            ))}

            <Link to="/how-to-play" className="hover:text-indigo-400">
              Rules
            </Link>

            {!user ? (
              <button
                onClick={() => setShowLogin(true)}
                className="hover:text-indigo-400"
              >
                Log&nbsp;in
              </button>
            ) : (
              <>
                {profile?.nickname && (
                  <span className="opacity-80">{profile.nickname}</span>
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

          {/* ── Mobile burger ─────────────── */}
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
                {/* categories */}
                {cats.map((c) => (
                  <Menu.Item key={c.id} as={Fragment}>
                    {({ close }) => (
                      <Link
                        to="/"
                        state={{ categoryId: c.id }}
                        onClick={() => close()}
                        className={navCls(c.id)}
                      >
                        {c.name}
                      </Link>
                    )}
                  </Menu.Item>
                ))}

                {/* rules */}
                <Menu.Item as={Fragment}>
                  {({ close }) => (
                    <Link
                      to="/how-to-play"
                      onClick={() => close()}
                      className={navCls()}
                    >
                      Rules
                    </Link>
                  )}
                </Menu.Item>

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
                        className={navCls()}
                      >
                        Log&nbsp;in
                      </button>
                    )}
                  </Menu.Item>
                ) : (
                  <>
                    {profile?.nickname && (
                      <div className="px-4 py-2 text-sm opacity-80">
                        {profile.nickname}
                      </div>
                    )}
                    <Menu.Item as={Fragment}>
                      {({ close }) => (
                        <button
                          onClick={() => {
                            close();
                            signOut();
                          }}
                          className={navCls()}
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
      </header>

      {/* ────────── MAIN ────────── */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* ────────── FOOTER ───────── */}
      <footer className="bg-gray-900 py-4 text-sm">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:text-left">
          © {year}&nbsp;Hard&nbsp;Quiz
        </div>
      </footer>

      {/* login modal */}
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
