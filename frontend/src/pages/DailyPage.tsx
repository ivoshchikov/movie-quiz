// frontend/src/pages/DailyPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDailyDateUS,
  getDailyFastest,
  getDailyQuestion,
  submitDailyResult,
  checkAnswer,
  type DailyFastestRow,
  type Question,
} from "../api";
import { useAuth } from "../AuthContext";
import { shuffle } from "../utils/shuffle";
import Seo from "../components/Seo";

function fmtMMSS(t: number) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DailyPage() {
  const { user } = useAuth();

  /* ---------- state ---------- */
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState<Question | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);

  const [fastest, setFastest] = useState<DailyFastestRow[]>([]);
  const [saving, setSaving] = useState(false);

  const tickRef = useRef<number | null>(null);
  const startRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  const dateUS = getDailyDateUS(); // для подписи и RPC по умолчанию
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `I just played today's Hard Quiz Daily! ${isCorrect ? "✅ Correct" : "❌ Wrong"} in ${fmtMMSS(elapsed)}.`
  )}&url=${encodeURIComponent(
    `https://hard-quiz.com/daily?utm_source=x&utm_medium=social&utm_campaign=daily`
  )}`;

  const shuffledOptions = useMemo(() => (q ? shuffle(q.options) : []), [q]);

  /* ---------- load daily question ---------- */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getDailyQuestion()
      .then((dq) => {
        if (!mounted) return;
        setQ(dq);
        // старт таймера
        startRef.current = Date.now();
        tickRef.current = window.setInterval(() => {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 1000);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // лидерборд
    getDailyFastest().then(setFastest).catch(console.error);

    return () => {
      mounted = false;
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  /* ---------- answer handler ---------- */
  const onAnswer = (ans: string) => {
    if (!q || answered) return;
    if (tickRef.current) window.clearInterval(tickRef.current);

    setLastAnswer(ans);

    checkAnswer(q.id, ans)
      .then(async (res) => {
        setIsCorrect(res.correct);
        setAnswered(true);

        // если залогинен — сохраняем результат дня
        if (user && !submittedRef.current) {
          submittedRef.current = true;
          setSaving(true);
          try {
            await submitDailyResult(user.id, dateUS, !!res.correct, elapsed);
          } catch (e) {
            console.error(e);
            submittedRef.current = false; // на всякий случай
          } finally {
            setSaving(false);
          }
        }

        // обновим топ-5 после ответа
        getDailyFastest().then(setFastest).catch(console.error);
      })
      .catch(console.error);
  };

  /* ---------- render ---------- */
  return (
    <>
      <Seo
        title="Daily Challenge | Hard Quiz"
        description="One new movie/actor question every day. Can you answer it fast enough to make the Top-5?"
      />

      <section className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold">Daily Challenge</h1>
        <p className="mt-2 text-sm sm:text-base opacity-80">
          Date: <span className="font-mono">{dateUS}</span>
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ---------- LEFT+CENTER: основной блок ---------- */}
        <section className="lg:col-span-2">
          {loading && <p>Loading…</p>}

          {!loading && q && (
            <div className="space-y-6">
              {/* постер */}
              <div className="poster-container">
                <img src={q.image_url} alt="daily still" className="poster" />
              </div>

              {/* таймер и статус */}
              <div className="flex items-center justify-between text-sm">
                <div className="opacity-80">Time: {fmtMMSS(elapsed)}</div>
                {answered && (
                  <div className={isCorrect ? "text-green-400" : "text-red-400"}>
                    {isCorrect ? "Correct!" : "Wrong!"}
                  </div>
                )}
              </div>

              {/* ответы */}
              <div className="answers-grid">
                {shuffledOptions.map((opt) => {
                  const isSel = answered && lastAnswer === opt;
                  const cls = [
                    "answer-btn",
                    isSel && (isCorrect ? "correct" : "wrong"),
                    answered && !isSel ? "opacity-60" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={opt}
                      className={cls}
                      onClick={() => onAnswer(opt)}
                      disabled={answered}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* действия после ответа */}
              {answered && (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <a
                    className="btn-primary inline-flex items-center justify-center"
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Share on X
                  </a>
                  <Link to="/" className="underline opacity-80 hover:opacity-100">
                    Go to start
                  </Link>
                  {user ? (
                    <span className="text-xs opacity-70">
                      {saving ? "Saving result…" : "Result saved."}
                    </span>
                  ) : (
                    <span className="text-xs opacity-70">
                      Log in to save your Daily result.
                    </span>
                  )}
                </div>
              )}

              {/* подсказка: один вопрос в день */}
              <p className="text-xs opacity-60">
                One Daily question per day. New challenge unlocks with the next US-Central day.
              </p>
            </div>
          )}
        </section>

        {/* ---------- RIGHT: топ-5 самых быстрых на сегодня ---------- */}
        <aside className="lg:col-span-1">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">
            Today’s Fastest
          </h2>
          {fastest.length === 0 ? (
            <p className="text-sm opacity-70">Be the first to set a time!</p>
          ) : (
            <ol className="space-y-1">
              {fastest.map((row, i) => (
                <li
                  key={`${row.nickname}-${row.answered_at}-${i}`}
                  className="flex items-center justify-between rounded border border-white/10 px-3 py-2"
                >
                  <span className="truncate max-w-[55%]">
                    {i + 1}. {row.nickname}
                  </span>
                  <span className="font-mono">{fmtMMSS(row.time_spent)}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </>
  );
}
