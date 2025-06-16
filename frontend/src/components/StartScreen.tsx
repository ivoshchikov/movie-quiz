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

  // блокируем кнопку, пока идёт загрузка или не выбрана категория
  const isDisabled = loading || selected === undefined;

  const start = () => {
    // сюда selected гарантированно number, потому что кнопка разблокирована
    navigate("/play", { state: { categoryId: selected! } });
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
          {/* плейсхолдер, недоступная опция */}
          <option value="" disabled>
            -- выберите категорию --
          </option>
          {/* реальные категории из БД */}
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
