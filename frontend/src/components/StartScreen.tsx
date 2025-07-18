// frontend/src/components/StartScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getDifficultyLevels } from "../api";
import type { Category, DifficultyLevel } from "../api";
import { useAuth } from "../AuthContext";
import Seo from "./Seo";

export default function StartScreen() {
  const { user, loading, signOut } = useAuth();

  const [categories,   setCategories]  = useState<Category[]>([]);
  const [loadingCats,  setLoadingCats] = useState(true);
  const [selectedCat,  setSelectedCat] = useState<number>();

  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingDiffs, setLoadingDiffs] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<number>();

  const navigate = useNavigate();

  /* ---------- load dictionaries ---------- */
  useEffect(() => {
    setLoadingCats(true);
    getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoadingCats(false));
  }, []);

  useEffect(() => {
    setLoadingDiffs(true);
    getDifficultyLevels()
      .then(setDifficulties)
      .catch(console.error)
      .finally(() => setLoadingDiffs(false));
  }, []);

  const isDisabled =
    loadingCats || loadingDiffs ||
    selectedCat === undefined || selectedDiff === undefined;

  const start = () => {
    navigate("/play", {
      state: { categoryId: selectedCat!, difficultyId: selectedDiff! },
    });
  };

  /* ---------- render ---------- */
  return (
    <>
      <Seo
        title="Start a new quiz | Hard Quiz"
        description="Choose a category and difficulty level to start guessing movie posters!"
      />

      <div className="start-screen">
        <h1 className="title">Quiz</h1>

        {/* Category */}
        <label className="select-wrapper">
          <span>Choose category</span>
          <select
            value={selectedCat ?? ""}
            onChange={e =>
              setSelectedCat(e.target.value ? Number(e.target.value) : undefined)
            }
          >
            <option value="" disabled>-- Choose category --</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {/* Difficulty */}
        <label className="select-wrapper">
          <span>Choose level</span>
          <select
            value={selectedDiff ?? ""}
            onChange={e =>
              setSelectedDiff(e.target.value ? Number(e.target.value) : undefined)
            }
          >
            <option value="" disabled>-- Choose level --</option>
            {difficulties.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>

        {/* Play button */}
        <button className="btn-primary" onClick={start} disabled={isDisabled}>
          {loadingCats || loadingDiffs ? "Loading…" : "Play"}
        </button>

        {/* Auth */}
        {!user ? (
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 text-base font-medium rounded-md border border-white hover:opacity-80 transition-opacity duration-150 mt-4"
          >
            Enter
          </button>
        ) : (
          <button
            onClick={signOut}
            className="px-6 py-3 text-base font-medium rounded-md border border-white hover:opacity-80 transition-opacity duration-150 mt-4"
          >
            Exit
          </button>
        )}
      </div>
    </>
  );
}
