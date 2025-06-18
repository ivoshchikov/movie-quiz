// frontend/src/components/ResultScreen.tsx
import { useLocation, useNavigate } from "react-router-dom";

interface State {
  score?: number;
  categoryId?: number;
  difficultyId?: number;
}

export default function ResultScreen() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { score = 0, categoryId, difficultyId } = (state as State) || {};

  const playAgain = () => {
    // стартуем новый раунд в той же категории и на том же уровне сложности
    navigate("/play", { state: { categoryId, difficultyId } });
  };

  const chooseCategory = () => {
    // возвращаемся на стартовый экран для выбора категории и сложности
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 gap-8 bg-black text-white">
      {/* Заголовок */}
      <h1 className="text-4xl font-semibold">Ваш результат</h1>

      {/* Большая цифра */}
      <div className="text-7xl font-extrabold">{score}</div>

      {/* Кнопки действий */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={playAgain}
          className="
            px-8 py-3 text-lg font-medium rounded-md
            bg-indigo-600 hover:bg-indigo-700
            transform hover:scale-105
            transition-all duration-150
          "
        >
          Сыграть ещё
        </button>
        <button
          onClick={chooseCategory}
          className="
            px-6 py-3 text-base font-medium rounded-md
            border border-white
            hover:opacity-80
            transition-opacity duration-150
          "
        >
          Выбрать другую категорию
        </button>
      </div>
    </div>
  );
}
