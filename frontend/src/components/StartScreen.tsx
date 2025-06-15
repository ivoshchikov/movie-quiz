// frontend/src/components/StartScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories } from "../api";
import type { Category } from "../api";

export default function StartScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const navigate = useNavigate();

  // загрузка категорий
  useEffect(() => {
    setLoading(true);
    getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // кнопка блокируется, пока идёт загрузка
  const isDisabled = loading;

  const start = () => {
    navigate("/play", { state: { categoryId: selected } });
  };

  return (
    <div className="start-screen">
      <h1 className="title">Quiz</h1>

      <label className="select-wrapper">
        <span>Выберите категорию</span>
        <select
          value={selected ?? ""}
          onChange={(e) =>
            setSelected(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">Все</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <button className="btn-primary" onClick={start} disabled={isDisabled}>
        {loading ? "Загрузка…" : "Играть"}
      </button>
    </div>
  );
}
