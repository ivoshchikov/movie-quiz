// frontend/src/components/ResultScreen.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { lastGameResult, RESULT_UPDATED } from "../game/resultStorage";
import type { GameResult, FinishReason, SaveStatus } from "../game/resultStorage";
import Seo from "./Seo";                              // ← NEW

interface State {
  score?: number;
  categoryId?: number;
  difficultyId?: number;
  elapsedSecs?: number;
  id?: string;
  finishReason?: FinishReason;
  saveStatus?: SaveStatus;
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
  const { user } = useAuth();
  const retained = lastGameResult(user?.id ?? null);
  const result = (state as State | null) ?? retained;
  const [saveUpdate, setSaveUpdate] = useState<{ id: string; status: SaveStatus } | null>(null);
  const saved = saveUpdate?.id === result?.id ? saveUpdate?.status : retained?.id === result?.id ? retained?.saveStatus : result?.saveStatus;
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<GameResult>).detail;
      if (detail.id === result?.id) setSaveUpdate({ id: detail.id, status: detail.saveStatus });
    };
    window.addEventListener(RESULT_UPDATED, update);
    return () => window.removeEventListener(RESULT_UPDATED, update);
  }, [result?.id]);
  const {
    score = 0,
    categoryId,
    difficultyId,
    elapsedSecs = 0,
    finishReason,
  } = result || {};

  const playAgain = () => {
    navigate(categoryId != null && difficultyId != null ? "/play" : "/", { state: { categoryId, difficultyId } });
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
        noindex
      />


      <div className="hq-panel mx-auto max-w-xl flex flex-col items-center justify-center px-4 py-8 gap-6 text-center">
        <h1 className={`text-3xl font-semibold${finishReason === "completed" ? " hq-result-completed" : ""}`}>{!result ? "No result yet" : finishReason === "completed" ? "You cleared the whole quiz!" : finishReason === "exit" ? "Quiz ended" : "Your result"}</h1>
        {finishReason === "completed" && <p className="max-w-sm text-sm text-gray-300">Every question played, and lives still left. A brilliant finish — congratulations!</p>}
        {!result && <p className="text-gray-300">Play a quiz to see your score here.</p>}

        {/* score */}
        {result && <div className="text-7xl font-extrabold">{score}<span className="block mt-2 text-sm font-normal text-gray-400">point{score === 1 ? "" : "s"}</span></div>}

        {/* session time */}
        {result && <div className="text-lg font-medium">
          Elapsed:&nbsp;
          <span className="font-bold">{formatSecs(elapsedSecs)}</span>
        </div>}
        {saved && <p className="max-w-sm text-sm text-gray-400" role="status">{saved === "saved" ? "Result saved. Your personal best updates if this run beats it." : saved === "device" ? "Result saved on this device. Sign in before your next quiz to keep personal bests." : "Result kept on this device. Saving to your account will retry when you’re online and signed in."}</p>}

        <div className="flex flex-col sm:flex-row gap-4">
          {result && <button
            onClick={playAgain}
            className="
              px-8 py-3 text-lg font-medium rounded-md
              bg-indigo-600 hover:bg-indigo-700
              transform hover:scale-105
              transition-all duration-150
            "
          >
            Play again
          </button>}
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
