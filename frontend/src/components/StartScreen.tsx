// frontend/src/components/StartScreen.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCategories,
  getDifficultyLevels,
  getMyBest,
  Category,
  DifficultyLevel,
  UserBestRow,
} from "../api";
import { useAuth } from "../AuthContext";
import Seo from "./Seo";

const DEFAULT_CAT_ID = 1; // «General»

export default function StartScreen() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  /* ─── dictionaries ───────────────────────────── */
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingCats,  setLoadingCats]  = useState(true);
  const [loadingDiffs, setLoadingDiffs] = useState(true);

  /* ─── user best rows ─────────────────────────── */
  const [bestRows,    setBestRows]    = useState<UserBestRow[]>([]);
  const [bestLoading, setBestLoading] = useState(false);

  /* ─── ui state ───────────────────────────────── */
  const [selectedCat,  setSelectedCat]  = useState<number>(DEFAULT_CAT_ID);
  const [selectedDiff, setSelectedDiff] = useState<number>();

  /* ─── load dictionaries once ─────────────────── */
  useEffect(() => {
    getCategories()
      .then(data => {
        setCategories(data);
        if (!data.find(c => c.id === DEFAULT_CAT_ID) && data.length)
          setSelectedCat(data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingCats(false));

    getDifficultyLevels()
      .then(setDifficulties)
      .catch(console.error)
      .finally(() => setLoadingDiffs(false));
  }, []);

  /* ─── load best rows (on login) ──────────────── */
  useEffect(() => {
    if (!user) { setBestRows([]); return; }
    setBestLoading(true);
    getMyBest()
      .then(setBestRows)
      .catch(console.error)
      .finally(() => setBestLoading(false));
  }, [user]);

  /* ─── helpers ────────────────────────────────── */
  const tableRows = useMemo(() => {
    return difficulties.map(diff => {
      const rec = bestRows.find(
        r => r.category_id === selectedCat && r.difficulty_level_id === diff.id
      );
      return {
        diffName: diff.name,
        score:    rec?.best_score ?? "—",
        time:     rec ? `${String(Math.floor(rec.best_time/60)).padStart(2,"0")}:${String(rec.best_time%60).padStart(2,"0")}` : "—",
      };
    });
  }, [difficulties, bestRows, selectedCat]);

  const canPlay =
    !loadingCats && !loadingDiffs &&
    selectedCat !== undefined && selectedDiff !== undefined;

  const startGame = () =>
    navigate("/play", { state: { categoryId: selectedCat!, difficultyId: selectedDiff! } });

  /* ─── render ─────────────────────────────────── */
  return (
    <>
      <Seo
        title="Start a new quiz | Hard Quiz"
        description="Choose a category and difficulty level to start guessing movie posters!"
      />

      <div className="flex flex-col lg:flex-row lg:gap-10 start-screen">
        {/* ---------- LEFT 1/3 : best results ---------- */}
        {user && (
          <section className="w-full lg:w-1/3">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3">
              Your best results
            </h2>

            {/* category picker for table */}
            <select
              className="border border-gray-400 rounded bg-white text-black text-xs sm:text-sm px-2 py-1 mb-4"
              value={selectedCat}
              onChange={e => setSelectedCat(Number(e.target.value))}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {bestLoading ? (
              <p>Loading…</p>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="border-b border-gray-600">
                  <tr>
                    <th className="py-1 px-2">Level</th>
                    <th className="py-1 px-2">Score</th>
                    <th className="py-1 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(row => (
                    <tr key={row.diffName}>
                      <td className="py-1 px-2">{row.diffName}</td>
                      <td className="py-1 px-2">{row.score}</td>
                      <td className="py-1 px-2">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ---------- RIGHT 2/3 : game setup ---------- */}
        <section className="w-full lg:w-2/3 flex flex-col items-center">
          <h1 className="title mb-4">Hard&nbsp;Quiz</h1>

          {/* form container to limit width */}
          <div className="w-full max-w-md">
            {/* category for game */}
            <label className="select-wrapper">
              <span>Select category</span>
              <select
                value={selectedCat ?? ""}
                onChange={e => setSelectedCat(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="" disabled>-- Choose category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            {/* difficulty */}
            <label className="select-wrapper">
              <span>Select level</span>
              <select
                value={selectedDiff ?? ""}
                onChange={e => setSelectedDiff(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="" disabled>-- Choose level --</option>
                {difficulties.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          </div>

          {/* buttons block */}
          <div className="flex gap-4 mt-6">
            <button
              className="btn-primary"
              onClick={startGame}
              disabled={!canPlay}
            >
              {loadingCats || loadingDiffs ? "Loading…" : "Play"}
            </button>

            {!authLoading && (
              !user ? (
                <button
                  onClick={() => navigate("/login")}
                  className="px-6 py-3 text-base font-medium rounded-md border border-white hover:opacity-80 transition-opacity duration-150"
                >
                  Log in
                </button>
              ) : (
                <button
                  onClick={signOut}
                  className="px-6 py-3 text-base font-medium rounded-md border border-white hover:opacity-80 transition-opacity duration-150"
                >
                  Log out
                </button>
              )
            )}
          </div>
        </section>
      </div>
    </>
  );
}
