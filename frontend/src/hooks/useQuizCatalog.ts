import { useEffect, useState } from "react";
import { getCategories, getDifficultyLevels } from "../api";
import type { Category, DifficultyLevel } from "../api";
import { READ_TIMEOUT } from "./useReadRequest";

const categoryOrder = ["All movies", "Actors", "Actresses", "TV series"];
export function categoryLabel(category: Category) {
  return category.name === "All movies" ? "Movie Stills" : category.name;
}

export function classicCategoryLabel(category: Category) {
  if (category.name === "All movies") return "Movies";
  if (category.name === "TV series") return "TV Series";
  return category.name;
}

export function useQuizCatalog(timeoutMs = READ_TIMEOUT) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const aborted = () => { if (active) { setError(true); setLoading(false); } };
    controller.signal.addEventListener("abort", aborted);
    setLoading(true);
    setError(false);
    async function load() {
      const [loadedCategories, levels] = await Promise.all([getCategories(controller.signal), getDifficultyLevels(controller.signal)]);
      if (!loadedCategories.every(cat => Number.isInteger(cat.id) && cat.id > 0 && typeof cat.name === "string" && cat.name.trim()) ||
        !levels.every(level => Number.isInteger(level.id) && level.id > 0 && typeof level.name === "string" && level.name.trim())) {
        throw new Error("invalid-quiz-catalog");
      }
      loadedCategories.sort((a, b) => {
        const ai = categoryOrder.indexOf(a.name), bi = categoryOrder.indexOf(b.name);
        return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) || a.name.localeCompare(b.name);
      });
      levels.sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
      if (active && !controller.signal.aborted) { setCategories(loadedCategories); setDifficulties(levels); }
    }
    load().catch(() => { if (active) setError(true); }).finally(() => { window.clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); controller.signal.removeEventListener("abort", aborted); };
  }, [attempt, timeoutMs]);

  return { categories, difficulties, loading, error, reload: () => setAttempt(value => value + 1) };
}
