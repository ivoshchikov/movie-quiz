// frontend/src/components/ResultScreen.tsx
import { useLocation, useNavigate } from "react-router-dom";
import Seo from "./Seo";                              // ← NEW

interface State {
  score?: number;
  categoryId?: number;
  difficultyId?: number;
  elapsedSecs?: number;
}

function formatSecs(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ResultScreen() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const {
    score = 0,
    categoryId,
    difficultyId,
    elapsedSecs = 0,
  } = (state as State) || {};

  const playAgain = () => {
    navigate("/play", { state: { categoryId, difficultyId } });
  };

  const chooseCategory = () => {
    navigate("/");
  };

  return (
    <>
      <Seo
        title="Your result | Hard Quiz"
        description={`You scored ${score} point${
          score === 1 ? "" : "s"
        } in ${formatSecs(elapsedSecs)}. Can you beat it?`}
      />

      <div className="flex flex-col items-center justify-center h-full px-4 py-8 gap-8 bg-black text-white">
        <h1 className="text-4xl font-semibold">Your result</h1>

        {/* score */}
        <div className="text-7xl font-extrabold">{score}</div>

        {/* session time */}
        <div className="text-2xl font-medium">
          Time:&nbsp;
          <span className="font-bold">{formatSecs(elapsedSecs)}</span>
        </div>

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
            Play again
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
            Choose another category
          </button>
        </div>
      </div>
    </>
  );
}
