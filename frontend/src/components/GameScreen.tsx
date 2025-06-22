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
import { supabase, getPublicUrl } from "../supabase";   // ← supabase client
import CircleTimer from "./CircleTimer";
import LinearTimer from "./LinearTimer";

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

  /* ── момент старта всей сессии ───────────────────────── */
  const sessionStartRef = useRef(Date.now());
  const [sessionSecs, setSessionSecs] = useState(0);

  /* ── справочники ─────────────────────────────────────── */
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loadingCats,  setLoadingCats]  = useState(true);
  const [difficulties, setDifficulties] = useState<DifficultyLevel[]>([]);
  const [loadingDiffs, setLoadingDiffs] = useState(true);

  /* ── состояние игры ──────────────────────────────────── */
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

  /* ── live-секундомер всей сессии ─────────────────────── */
  useEffect(() => {
    const id = window.setInterval(() => {
      setSessionSecs(
        Math.floor((Date.now() - sessionStartRef.current) / 1000)
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  /* ── helpers ─────────────────────────────────────────── */
  const fmtTime = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
      2,
      "0"
    )}`;

  /* запись «лучшего» результата и переход к /result */
  const endGame = async () => {
    const elapsedSecs = Math.floor(
      (Date.now() - sessionStartRef.current) / 1000
    );

    /* 1️⃣ upsert в user_best */
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.rpc("upsert_user_best", {
      p_user_id:     user?.id ?? null,
      p_category_id: categoryId,
      p_score:       scoreRef.current,
      p_time:        elapsedSecs,
    });

    /* 2️⃣ переходим к экрану результата */
    navigate("/result", {
      state: {
        score: scoreRef.current,
        categoryId,
        difficultyId,
        elapsedSecs,
      },
    });
  };

  /* ── загрузка справочников ───────────────────────────── */
  useEffect(() => {
    if (categoryId == null) { setLoadingCats(false); return; }
    setLoadingCats(true);
    getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoadingCats(false));
  }, [categoryId]);

  useEffect(() => {
    if (difficultyId == null) { setLoadingDiffs(false); return; }
    setLoadingDiffs(true);
    getDifficultyLevels()
      .then(setDifficulties)
      .catch(console.error)
      .finally(() => setLoadingDiffs(false));
  }, [difficultyId]);

  /* ── старт нового раунда ─────────────────────────────── */
  useEffect(() => {
    sessionStartRef.current = Date.now();
    setSessionSecs(0);
    setExclude([]);
    setScore(0);
    scoreRef.current = 0;
    setAnswered(false);
    setLastAnswer(null);
    setIsCorrect(false);

    if (!loadingDiffs && difficultyId != null) {
      const level = difficulties.find(d => d.id === difficultyId);
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
        currentExclude, categoryId, difficultyId
      );
      setQ(question);

      const level = difficulties.find(d => d.id === difficultyId);
      if (level) setSeconds(level.time_limit_secs);

      setExclude([...currentExclude, question.id]);
    } catch (e: any) {
      if (e.message === "no-more-questions") endGame();
    }
  }

  /* ── таймер вопроса ─────────────────────────────────── */
  useEffect(() => {
    if (!q) return;
    intervalRef.current = window.setInterval(() => {
      setSeconds(s => {
        if (s === 1) {
          window.clearInterval(intervalRef.current);
          if (mistakesLeft > 0) {
            setMistakesLeft(m => m - 1);
            setLives(l => l - 1);
            loadQuestion(exclude);
          } else endGame();
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [q, mistakesLeft, exclude]);

  /* ── перемешиваем варианты ───────────────────────────── */
  const shuffledOptions = useMemo(
    () => (q ? [...q.options].sort(() => Math.random() - 0.5) : []),
    [q]
  );

  /* ── обработка ответа ───────────────────────────────── */
  const handleAnswer = (answer: string) => {
    if (!q || answered) return;
    window.clearInterval(intervalRef.current);
    setLastAnswer(answer);

    checkAnswer(q.id, answer).then(async (res) => {
      setIsCorrect(res.correct);
      setAnswered(true);

      /* 1️⃣ фиксируем статистику по вопросу */
      await supabase.rpc("touch_question_stats", {
        p_question_id: q.id,
        p_is_correct:  res.correct,
      });

      if (res.correct) {
        setScore(s => {
          const next = s + 1;
          scoreRef.current = next;
          return next;
        });
        timeoutRef.current = window.setTimeout(
          () => loadQuestion(exclude), 500
        );
      } else {
        if (mistakesLeft > 0) {
          setMistakesLeft(m => m - 1);
          setLives(l => l - 1);
          timeoutRef.current = window.setTimeout(
            () => loadQuestion(exclude), 500
          );
        } else {
          timeoutRef.current = window.setTimeout(endGame, 500);
        }
      }
    }).catch(console.error);
  };

  /* ── очистка ─────────────────────────────────────────── */
  useEffect(() => () => {
    window.clearTimeout(timeoutRef.current);
    window.clearInterval(intervalRef.current);
  }, []);

  if (!q) return <p className="loading">Загрузка…</p>;

  /* ── подготовка данных для UI ───────────────────────── */
  const categoryLabel =
    loadingCats
      ? "..."
      : categories.find(c => c.id === categoryId)?.name ?? "—";

  const difficultyLabel =
    loadingDiffs
      ? "..."
      : difficulties.find(d => d.id === difficultyId)?.name ?? "—";

  const totalSecs =
    difficulties.find(d => d.id === difficultyId)?.time_limit_secs ?? 20;

  /* ── рендер ─────────────────────────────────────────── */
  return (
    <div className="game-screen">
      {/* ---------- верхняя панель ---------- */}
      <header className="game-header gap-2">
        <div className="flex flex-col sm:flex-row sm:space-x-4 text-sm sm:text-base">
          <span>{categoryLabel}</span>
          <span>{difficultyLabel}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* жизни */}
          <div className="flex space-x-1">
            {Array.from({ length: lives }).map((_, i) => (
              <span key={i} className="text-xl">❤️</span>
            ))}
          </div>

          {/* круговой таймер */}
          <CircleTimer seconds={seconds} total={totalSecs} />

          {/* счёт + секундомер */}
          <div className="game-score flex items-center space-x-2">
            <div className="flex items-center">
              <svg viewBox="0 0 24 24" className="star-icon">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span className="ml-1 text-lg">{score}</span>
            </div>
            <span className="text-sm opacity-80">{fmtTime(sessionSecs)}</span>
          </div>
        </div>
      </header>

      {/* ---------- постер ---------- */}
      <div className="poster-container mt-6">
        <img src={getPublicUrl(q.image_url)} alt="poster" className="poster" />
      </div>

      {/* ---------- линейный таймер ---------- */}
      <LinearTimer seconds={seconds} total={totalSecs} />

      {/* ---------- ответы ---------- */}
      <div className="answers-grid mt-6">
        {shuffledOptions.map(opt => {
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
