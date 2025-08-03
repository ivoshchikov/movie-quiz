// frontend/src/components/Layout.tsx
import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen text-white bg-black">
      {/* ── Header (пока только логотип + Rules) ─────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 bg-[#0d0d0d]/95 backdrop-blur shadow-md">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-xl font-bold">
            Hard&nbsp;Quiz
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-sm">
            {/* Категории появятся позже — сейчас лишь ссылка на правила */}
            <Link to="/how-to-play" className="hover:text-indigo-400">
              Rules
            </Link>
            {/* Кнопка логина появится на шаге 6 */}
          </nav>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-sm py-4">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:text-left">
          © {year}&nbsp;Hard&nbsp;Quiz
        </div>
      </footer>
    </div>
  );
}
