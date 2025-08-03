// frontend/src/components/Layout.tsx
import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { getCategories, Category } from "../api";

export default function Layout() {
  /* ── категории для навбара ─────────────────────────────── */
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCats).catch(console.error);
  }, []);

  /* ── определяем «активную» категорию из location.state ── */
  const loc = useLocation();
  // мы передаём {state:{categoryId}} при навигации
  const activeId: number | undefined = (loc.state as any)?.categoryId;

  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen text-white bg-black">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 bg-[#0d0d0d]/95 backdrop-blur shadow-md">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          {/* logo */}
          <Link to="/" className="text-xl font-bold whitespace-nowrap">
            Hard&nbsp;Quiz
          </Link>

          {/* nav – desktop */}
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
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-sm py-4">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:text-left">
          © {year}&nbsp;Hard&nbsp;Quiz
        </div>
      </footer>
    </div>
  );
}
