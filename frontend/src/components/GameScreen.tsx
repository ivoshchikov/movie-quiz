// frontend/src/components/GameScreen.tsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getQuestion,
  checkAnswer,
  getCategories,
  getDifficultyLevels,
} from "../api";
import type { Question, Category, DifficultyLevel } from "../api";
import { getPublicUrl } from "../supabase";   // ⬅ добавили

interface LocationState {
  categoryId?: number;
  difficultyId?: number;
}

export default function GameScreen() {
  const navigate = useNavigate();
  const { state, key: playKey } = useLocation() as {
    state?: LocationState;
    key: string;
  };
  const { categoryId, difficultyId } = state || {};

  /* ─── справочники ─────────────────────────────────────── */
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loadingCats,  setLoadingCats]  = useState(true);
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingDiffs, setLoadingDiffs] = useState(true);

  /* ─── состояние игры ──────────────────────────────────── */
  const [exclude,      setExclude]      = useState<number[]>([]);
  const [q,            setQ]            = useState<Question | null>(null);
  const [score,        setScore]        = useState(0);
  const scoreRef       = useRef(0);
  const [seconds,      setSeconds]      = useState(0);
  const [lives,        setLives]        = useState(0);
  const [mistakesLeft, setMistakesLeft] = useState(0);
  const [answered,     setAnswered]     = useState(false);
  const [lastAnswer,   setLastAnswer]   = useState<string | null>(null);
  const [isCorrect,    setIsCorrect]    = useState(false);

  const intervalRef = useRef<number>(0);
  const timeoutRef  = useRef<number>(0);

  /* ─── загрузка справочников ───────────────────────────── */
  useEffect(() => {
    if (categoryId == null) setLoadingCats(false);
    else {
      setLoadingCats(true);
      getCategories()
        .then(setCategories)
        .catch(console.error)
        .finally(() => setLoadingCats(false));
    }
  }, [categoryId]);

  useEffect(() => {
    if (difficultyId == null) setLoadingDiffs(false);
    else {
      setLoadingDiffs(true);
      getDifficultyLevels()
        .then(setDifficulties)
        .catch(console.error)
        .finally(() => setLoadingDiffs(false));
    }
  }, [difficultyId]);

  /* ─── старт нового раунда ─────────────────────────────── */
  useEffect(() => {
    setExclude([]);
    setScore(0);
    scoreRef.current = 0;
    setAnswered(false);
    setLastAnswer(null);
    setIsCorrect(false);

    if (!loadingDiffs && difficultyId != null) {
      const level = difficulties.find((d) => d.id === difficultyId);
      if (level) {
        setLives(level.lives);
        setMistakesLeft(level.mistakes_allowed);
        setSeconds(level.time_limit_secs);
      }
    }

    loadQuestion([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, difficultyId, playKey, loadingDiffs]);

  async function loadQuestion(currentExclude: number[]) {
    setAnswered(false);
    setLastAnswer(null);
    setIsCorrect(false);
    try {
      const question = await getQuestion(
        currentExclude,
        categoryId,
        difficultyId
      );
      setQ(question);

      const level = difficulties.find((d) => d.id === difficultyId);
      if (level) setSeconds(level.time_limit_secs);

      setExclude([...currentExclude, question.id]);
    } catch (e: any) {
      if (e.message === "no-more-questions") {
        navigate("/result", {
          state: { score: scoreRef.current, categoryId, difficultyId },
        });
      }
    }
  }

  /* ─── таймер ──────────────────────────────────────────── */
  useEffect(() => {
    if (!q) return;
    intervalRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s === 1) {
          window.clearInterval(intervalRef.current);
          if (mistakesLeft > 0) {
            setMistakesLeft((m) => m - 1);
            setLives((l) => l - 1);
            loadQuestion(exclude);
          } else {
            navigate("/result", {
              state: { score: scoreRef.current, categoryId, difficultyId },
            });
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [q, mistakesLeft, navigate, categoryId, difficultyId, exclude]);

  /* ─── перемешиваем варианты ───────────────────────────── */
  const shuffledOptions = useMemo(() => {
    if (!q) return [];
    return [...q.options].sort(() => Math.random() - 0.5);
  }, [q]);

  /* ─── обработка ответа ───────────────────────────────── */
  const handleAnswer = (answer: string) => {
    if (!q || answered) return;
    window.clearInterval(intervalRef.current);
    setLastAnswer(answer);

    checkAnswer(q.id, answer)
      .then((res) => {
        setIsCorrect(res.correct);
        setAnswered(true);

        if (res.correct) {
          setScore((s) => {
            const next = s + 1;
            scoreRef.current = next;
            return next;
          });
          timeoutRef.current = window.setTimeout(
            () => loadQuestion(exclude),
            500
          );
        } else {
          if (mistakesLeft > 0) {
            setMistakesLeft((m) => m - 1);
            setLives((l) => l - 1);
            timeoutRef.current = window.setTimeout(
              () => loadQuestion(exclude),
              500
            );
          } else {
            timeoutRef.current = window.setTimeout(() => {
              navigate("/result", {
                state: { score: scoreRef.current, categoryId, difficultyId },
              });
            }, 500);
          }
        }
      })
      .catch(console.error);
  };

  /* ─── очистка эффектов ───────────────────────────────── */
  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
      window.clearInterval(intervalRef.current);
    },
    []
  );

  if (!q) return <p className="loading">Загрузка…</p>;

  /* ─── рендер ─────────────────────────────────────────── */
  return (
    <div className="game-screen">
      {/* ---------- шапка ---------- */}
      <header className="game-header flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {loadingCats
            ? "..."
            : `Категория: ${categories.find((c) => c.id === categoryId)?.name}`}
        </div>
        <div>
          {loadingDiffs
            ? "..."
            : `Сложность: ${
                difficulties.find((d) => d.id === difficultyId)?.name
              }`}
        </div>
        <div className="flex space-x-1">
          {Array.from({ length: lives }).map((_, i) => (
            <span key={i} className="text-xl">
              ❤️
            </span>
          ))}
        </div>
        <div className="game-score flex items-center">
          <svg viewBox="0 0 24 24" className="star-icon">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <span className="ml-1 text-lg">{score}</span>
        </div>
      </header>

      {/* ---------- таймер ---------- */}
      <div className="timer-feedback mt-4">
        <div className="timer-seconds text-2xl font-bold mb-1">{seconds}s</div>
        <div className="timer-bar-wrapper">
          <div
            className="timer-bar"
            style={{
              width: `${
                (seconds /
                  (difficulties.find((d) => d.id === difficultyId)
                    ?.time_limit_secs ?? 20)) *
                100
              }%`,
              backgroundColor:
                seconds >
                (difficulties.find((d) => d.id === difficultyId)
                  ?.time_limit_secs ?? 20) *
                  0.6
                  ? "#4ade80"
                  : seconds >
                    (difficulties.find((d) => d.id === difficultyId)
                      ?.time_limit_secs ?? 20) *
                      0.3
                  ? "#facc15"
                  : "#f87171",
            }}
          />
        </div>
      </div>

      {/* ---------- постер ---------- */}
      <div className="poster-container mt-6">
        <img
          src={getPublicUrl(q.image_url)}   // ⬅ использует новую утилиту
          alt="poster"
          className="poster"
        />
      </div>

      {/* ---------- варианты ответов ---------- */}
      <div className="answers-grid mt-6">
        {shuffledOptions.map((opt) => {
          const isSel = answered && lastAnswer === opt;
          const cls = ["answer-btn", isSel && (isCorrect ? "correct" : "wrong")]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={opt}
              className={cls}
              onClick={() => handleAnswer(opt)}
              disabled={answered}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
