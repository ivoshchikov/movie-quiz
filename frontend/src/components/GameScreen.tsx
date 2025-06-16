// frontend/src/components/GameScreen.tsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getQuestion, checkAnswer, getCategories } from "../api";
import type { Question, Category } from "../api";

interface LocationState {
  categoryId?: number;
}

export default function GameScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location as { state?: LocationState; key: string };
  const { categoryId } = (state || {}) as LocationState;
  const playKey = location.key; // обновляется при каждом заходе

  // ─── game state ─────────────────────────────────────────────────────────────
  const [exclude, setExclude] = useState<number[]>([]);
  const [q, setQ] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0); // всегда актуальный счёт
  const [seconds, setSeconds] = useState(20);
  const [answered, setAnswered] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const intervalRef = useRef<number>(0);
  const timeoutRef = useRef<number>(0);

  // ─── load categories для header ────────────────────────────────────────────────
  useEffect(() => {
    if (categoryId == null) {
      setLoadingCats(false);
      return;
    }
    setLoadingCats(true);
    getCategories()
      .then((cats) => setCategories(cats))
      .catch(console.error)
      .finally(() => setLoadingCats(false));
  }, [categoryId]);

  const categoryName =
    categoryId == null
      ? "Все"
      : categories.find((c) => c.id === categoryId)?.name ?? "...";

  // ─── fetch next question ──────────────────────────────────────────────────────
  // теперь автоматически добавляем id загруженного вопроса в exclude
  async function loadQuestion(currentExclude = exclude) {
    // сброс feedback
    setAnswered(false);
    setLastAnswer(null);
    setIsCorrect(false);

    try {
      const question = await getQuestion(currentExclude, categoryId);
      setQ(question);
      setSeconds(20);
      // добавляем только что показанный вопрос в список исключений
      setExclude([...currentExclude, question.id]);
    } catch (e: unknown) {
      if (e.message === "no-more-questions") {
        // когда вопросы закончились — навигация на результат
        navigate("/result", {
          state: { score: scoreRef.current, categoryId },
        });
      }
    }
  }

  // ─── старт новой игры при входе или смене категории ────────────────────────────
  useEffect(() => {
    // сбросим всё
    setExclude([]);
    setScore(0);
    scoreRef.current = 0;
    setAnswered(false);
    setLastAnswer(null);
    setIsCorrect(false);
    // загрузить первый вопрос, передав пустой exclude
    loadQuestion([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, playKey]);

  // ─── таймер ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!q) return;
    intervalRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s === 1) {
          window.clearInterval(intervalRef.current);
          navigate("/result", {
            state: { score: scoreRef.current, categoryId },
          });
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [q, navigate, categoryId]);

  // ─── перемешиваем варианты ───────────────────────────────────────────────────
  const shuffledOptions = useMemo(() => {
    if (!q) return [];
    return [...q.options].sort(() => Math.random() - 0.5);
  }, [q]);

  // ─── ответ пользователя ───────────────────────────────────────────────────────
  const handleAnswer = (answer: string) => {
    if (!q || answered) return;
    window.clearInterval(intervalRef.current);
    setLastAnswer(answer);

    checkAnswer(q.id, answer)
      .then((res) => {
        setIsCorrect(res.correct);
        setAnswered(true);

        if (res.correct) {
          // обновляем счёт
          setScore((s) => {
            const next = s + 1;
            scoreRef.current = next;
            return next;
          });
          // через паузу грузим следующий вопрос (с учётом уже обновлённого exclude)
          timeoutRef.current = window.setTimeout(() => loadQuestion(), 500);
        } else {
          // при ошибке сразу переходим на результат
          timeoutRef.current = window.setTimeout(() => {
            navigate("/result", {
              state: { score: scoreRef.current, categoryId },
            });
          }, 500);
        }
      })
      .catch(console.error);
  };

  // очистка таймаутов/интервалов при unmount
  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
      window.clearInterval(intervalRef.current);
    },
    []
  );

  if (!q) return <p className="loading">Загрузка…</p>;

  return (
    <div className="game-screen">
      <header className="game-header">
        <div className="game-category">
          {loadingCats ? "..." : `Категория: ${categoryName}`}
        </div>
        <div className="game-score">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="star-icon"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          {score}
        </div>
      </header>

      <div className="timer-feedback">
        <div className="timer-bar-wrapper">
          <div
            className="timer-bar"
            style={{
              width: `${(seconds / 20) * 100}%`,
              backgroundColor:
                seconds > 12
                  ? "#4ade80"
                  : seconds > 6
                  ? "#facc15"
                  : "#f87171",
            }}
          />
        </div>
      </div>

      <div className="poster-container">
        <img src={q.image_url} alt="poster" className="poster" />
      </div>

      <div className="answers-grid">
        {shuffledOptions.map((opt) => {
          const isSelected = answered && lastAnswer === opt;
          const classes = [
            "answer-btn",
            isSelected && (isCorrect ? "correct" : "wrong"),
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={opt}
              className={classes}
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
