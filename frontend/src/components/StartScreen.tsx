// frontend/src/components/StartScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getDifficultyLevels } from "../api";
import type { Category, DifficultyLevel } from "../api";
import { useAuth } from "../AuthContext";

export default function StartScreen() {
  const { user, loading, signOut } = useAuth();

  const [categories,       setCategories]  = useState<Category[]>([]);
  const [loadingCats,      setLoadingCats] = useState(true);
  const [selectedCat,      setSelectedCat] = useState<number>();

  const [difficulties,     setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingDiffs,     setLoadingDiffs] = useState(true);
  const [selectedDiff,     setSelectedDiff] = useState<number>();

  const navigate = useNavigate();

  /* ── загрузка справочников ───────────────────────────── */
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
    loadingCats ||
    loadingDiffs ||
    selectedCat  === undefined ||
    selectedDiff === undefined;

  const start = () => {
    navigate("/play", {
      state: { categoryId: selectedCat!, difficultyId: selectedDiff! },
    });
  };

  return (
    <div className="start-screen">
      <h1 className="title">Quiz</h1>

      {/* Категория */}
      <label className="select-wrapper">
        <span>Выберите категорию</span>
        <select
          value={selectedCat ?? ""}
          onChange={e =>
            setSelectedCat(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="" disabled>-- выберите категорию --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      {/* Сложность */}
      <label className="select-wrapper">
        <span>Выберите сложность</span>
        <select
          value={selectedDiff ?? ""}
          onChange={e =>
            setSelectedDiff(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="" disabled>-- выберите уровень --</option>
          {difficulties.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      {/* Играть */}
      <button className="btn-primary" onClick={start} disabled={isDisabled}>
        {loadingCats || loadingDiffs ? "Загрузка…" : "Играть"}
      </button>

      {/* Авторизация */}
      {!user ? (
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-3 text-base font-medium rounded-md border border-white hover:opacity-80 transition-opacity duration-150 mt-4"
        >
          Войти
        </button>
      ) : (
        <button
          onClick={signOut}
          className="px-6 py-3 text-base font-medium rounded-md border border-white hover:opacity-80 transition-opacity duration-150 mt-4"
        >
          Выйти
        </button>
      )}
    </div>
  );
}
