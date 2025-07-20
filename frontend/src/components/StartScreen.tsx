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

export default function StartScreen() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  /* ───── dictionaries ───── */
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingCats,  setLoadingCats]  = useState(true);
  const [loadingDiffs, setLoadingDiffs] = useState(true);

  /* ───── best results ───── */
  const [bestRows,    setBestRows]    = useState<UserBestRow[]>([]);
  const [bestLoading, setBestLoading] = useState(false);

  /* ───── ui state ───── */
  const [selectedCat,  setSelectedCat]  = useState<number>();
  const [selectedDiff, setSelectedDiff] = useState<number>();

  /* ───── load dictionaries once ───── */
  useEffect(() => {
    getCategories().then(setCategories).catch(console.error).finally(() => setLoadingCats(false));
    getDifficultyLevels().then(setDifficulties).catch(console.error).finally(() => setLoadingDiffs(false));
  }, []);

  /* ───── load user best after login ───── */
  useEffect(() => {
    if (!user) { setBestRows([]); return; }
    setBestLoading(true);
    getMyBest().then(setBestRows).catch(console.error).finally(() => setBestLoading(false));
  }, [user]);

  /* ───── helpers ───── */
  const diffById = useMemo(() => new Map(difficulties.map(d => [d.id, d])), [difficulties]);
  const catById  = useMemo(() => new Map(categories.map(c  => [c.id, c])),  [categories]);

  const bestForSelectedCat = useMemo(
    () => (selectedCat ? bestRows.filter(r => r.category_id === selectedCat) : bestRows),
    [bestRows, selectedCat],
  );

  const canPlay =
    !loadingCats && !loadingDiffs && selectedCat !== undefined && selectedDiff !== undefined;

  const startGame = () =>
    navigate("/play", { state: { categoryId: selectedCat!, difficultyId: selectedDiff! } });

  /* ───── render ───── */
  return (
    <>
      <Seo
        title="Start a new quiz | Hard Quiz"
        description="Choose a category and difficulty level to start guessing movie posters!"
      />

      <div className="flex flex-col lg:flex-row items-center justify-center h-full gap-8 px-4">

        {/* ---------- LEFT: best results ---------- */}
        {user && (
          <section className="w-full lg:w-1/2">
            <h2 className="text-2xl font-semibold mb-4">Your best results</h2>

            {bestLoading ? (
              <p>Loading…</p>
            ) : bestForSelectedCat.length === 0 ? (
              <p className="opacity-70">No results yet — play and set a record!</p>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="border-b border-gray-600">
                  <tr>
                    {!selectedCat && <th className="py-1 pr-2">Category</th>}
                    <th className="py-1 pr-2">Level</th>
                    <th className="py-1 pr-2">Score</th>
                    <th className="py-1">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {bestForSelectedCat.map(row => (
                    <tr key={`${row.category_id}-${row.difficulty_level_id}`}>
                      {!selectedCat && (
                        <td className="py-1 pr-2">
                          {catById.get(row.category_id)?.name ?? row.category_id}
                        </td>
                      )}
                      <td className="py-1 pr-2">
                        {diffById.get(row.difficulty_level_id)?.name ?? row.difficulty_level_id}
                      </td>
                      <td className="py-1 pr-2">{row.best_score}</td>
                      <td className="py-1">
                        {String(Math.floor(row.best_time / 60)).padStart(2, "0")}:
                        {String(row.best_time % 60).padStart(2, "0")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ---------- RIGHT: quiz setup ---------- */}
        <section className="w-full lg:w-1/2 max-w-md">
          <h1 className="title mb-6">Hard&nbsp;Quiz</h1>

          {/* Category */}
          <label className="select-wrapper">
            <span>Select category</span>
            <select
              value={selectedCat ?? ""}
              onChange={e => setSelectedCat(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="" disabled>-- Choose category --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          {/* Difficulty */}
          <label className="select-wrapper">
            <span>Select level</span>
            <select
              value={selectedDiff ?? ""}
              onChange={e => setSelectedDiff(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="" disabled>-- Choose level --</option>
              {difficulties.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>

          {/* Buttons row */}
          <div className="flex gap-4 mt-6">
            <button className="btn-primary" onClick={startGame} disabled={!canPlay}>
              {loadingCats || loadingDiffs ? "Loading…" : "Play"}
            </button>

            {!user ? (
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 text-base font-medium rounded-md border border-white hover:opacity-80 transition-opacity duration-150"
              >
                Log&nbsp;in
              </button>
            ) : (
              <button
                onClick={signOut}
                className="px-6 py-3 text-base font-medium rounded-md border border-white hover:opacity-80 transition-opacity duration-150"
              >
                Log&nbsp;out
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
