// frontend/src/components/StartScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getDifficultyLevels } from "../api";
import type { Category, DifficultyLevel } from "../api";

export default function StartScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCat, setSelectedCat] = useState<number | undefined>(undefined);

  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingDiffs, setLoadingDiffs] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<number | undefined>(undefined);

  const navigate = useNavigate();

  // загрузка категорий
  useEffect(() => {
    setLoadingCats(true);
    getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoadingCats(false));
  }, []);

  // загрузка уровней сложности
  useEffect(() => {
    setLoadingDiffs(true);
    getDifficultyLevels()
      .then(setDifficulties)
      .catch(console.error)
      .finally(() => setLoadingDiffs(false));
  }, []);

  // блокируем кнопку, пока идёт загрузка или не выбраны оба селекта
  const isDisabled =
    loadingCats ||
    loadingDiffs ||
    selectedCat === undefined ||
    selectedDiff === undefined;

  const start = () => {
    navigate("/play", {
      state: { categoryId: selectedCat!, difficultyId: selectedDiff! },
    });
  };

  return (
    <div className="start-screen">
      <h1 className="title">Quiz</h1>

      <label className="select-wrapper">
        <span>Выберите категорию</span>
        <select
          value={selectedCat ?? ""}
          onChange={(e) =>
            setSelectedCat(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="" disabled>
            -- выберите категорию --
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="select-wrapper">
        <span>Выберите сложность</span>
        <select
          value={selectedDiff ?? ""}
          onChange={(e) =>
            setSelectedDiff(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="" disabled>
            -- выберите уровень --
          </option>
          {difficulties.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="btn-primary"
        onClick={start}
        disabled={isDisabled}
      >
        {loadingCats || loadingDiffs ? "Загрузка…" : "Играть"}
      </button>
    </div>
  );
}
