// frontend/src/pages/DailyPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Seo from "../components/Seo";
import {
  getDailyDateUS,
  getDailyFastest,
  getDailyQuestion,
  getDailyQuestionPublic,
  getMyDailyResult,
  submitDailyResult,
  type Question,
  type DailyFastestRow,
  type MyDailyResult,
} from "../api";
import { shuffle } from "../utils/shuffle";

export default function DailyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const dateStr = getDailyDateUS();

  // ---------- state ----------
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState<Question | null>(null);
  const [opts, setOpts] = useState<string[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);

  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const [fastest, setFastest] = useState<DailyFastestRow[]>([]);
  const [fastestLoading, setFastestLoading] = useState(true);

  const [myDaily, setMyDaily] = useState<MyDailyResult>({
    is_answered: false, is_correct: null, time_spent: null, answered_at: null,
  });

  const startTsRef = useRef<number | null>(null);

  // ---------- load question ----------
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loader = user ? getDailyQuestion : getDailyQuestionPublic;
    loader()
      .then((qq: any) => {
        if (!mounted) return;
        setQ(qq as Question);
        setOpts(shuffle((qq as Question).options));
      })
      .catch(console.error)
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [dateStr, user]);

  // старт таймера после загрузки изображения
  const onImageLoad = () => {
    setImgLoaded(true);
    if (!startTsRef.current) startTsRef.current = Date.now();
  };

  // ---------- load fastest ----------
  const refreshFastest = () => {
    setFastestLoading(true);
    getDailyFastest(dateStr, 5)
      .then(setFastest)
      .catch(console.error)
      .finally(() => setFastestLoading(false));
  };
  useEffect(() => { refreshFastest(); }, [dateStr]);

  // ---------- мой статус по daily ----------
  useEffect(() => {
    if (!user) {
      setMyDaily({ is_answered: false, is_correct: null, time_spent: null, answered_at: null });
      return;
    }
    getMyDailyResult(user.id, dateStr)
      .then(setMyDaily)
      .catch(console.error);
  }, [user, dateStr]);

  const alreadyAnswered = !!user && myDaily.is_answered;
  const canAnswer = !!user && imgLoaded && !alreadyAnswered;
  const answered = selected !== null;

  // ---------- answer ----------
  const handleAnswer = async (answer: string) => {
    // Без входа — ведём на логин и возвращаемся обратно
    if (!user) {
      navigate("/login", { state: { redirectTo: loc.pathname + loc.search } });
      return;
    }
    if (!q || answered || !imgLoaded || alreadyAnswered) return;

    setSelected(answer);
    const ok = answer.trim() === q.correct_answer.trim();
    setIsCorrect(ok);

    const elapsed =
      startTsRef.current != null
        ? Math.max(1, Math.floor((Date.now() - startTsRef.current) / 1000))
        : 1;

    try {
      setSaving(true);
      await submitDailyResult(user.id, dateStr, ok, elapsed); // первый ответ побеждает
      // подтянем статус с сервера (на случай повторных кликов/обновлений)
      const status = await getMyDailyResult(user.id, dateStr);
      setMyDaily(status);
      refreshFastest();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ---------- helpers ----------
  const niceDate = useMemo(() => {
    const [y, m, d] = dateStr.split("-");
    return `${y}–${m}–${d}`;
  }, [dateStr]);

  return (
    <>
      <Seo
        title="Daily Challenge | Hard Quiz"
        description="One new movie/actor image every day. Guess it fast and enter Today’s Fastest!"
      />

      <section className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Daily Challenge</h1>
            <p className="mt-1 text-sm opacity-80">Date: {niceDate}</p>
          </div>

          <aside className="hidden md:block w-72">
            <h2 className="text-lg font-semibold">Today’s Fastest</h2>
            {fastestLoading ? (
              <p className="text-sm opacity-80 mt-2">Loading…</p>
            ) : fastest.length === 0 ? (
              <p className="text-sm opacity-80 mt-2">Be the first to set a time!</p>
            ) : (
              <ol className="mt-2 space-y-1 text-sm">
                {fastest.map((r, i) => (
                  <li key={i} className="flex justify-between border-b border-white/10 py-1">
                    <span className="truncate">{r.nickname}</span>
                    <span className="tabular-nums">{r.time_spent}s</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </header>

        {/* CTA для анонимов */}
        {!user && (
          <div className="mb-4 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
            <b>Sign in to play the Daily.</b> We only accept answers from logged-in
            players to keep the competition fair.{" "}
            <Link to="/login" state={{ redirectTo: "/daily" }} className="underline">
              Log in
            </Link>
            .
          </div>
        )}

        {/* Сообщение, если уже отвечал */}
        {alreadyAnswered && (
          <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
            You’ve already answered today’s Daily
            {myDaily.is_correct != null && (
              <>
                {" — "}
                {myDaily.is_correct ? "correct" : "not correct"}
                {myDaily.time_spent ? ` in ${myDaily.time_spent}s` : ""}
                .
              </>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_280px] gap-8">
          <div>
            {loading || !q ? (
              <div className="aspect-video w-full rounded-lg bg-white/5 animate-pulse" />
            ) : (
              <>
                {/* постер */}
                <div className="relative rounded-lg overflow-hidden bg-white/5">
                  {!user && (
                    <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[1px] flex items-center justify-center text-sm">
                      Log in to play
                    </div>
                  )}
                  {alreadyAnswered && (
                    <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-[1px] flex items-center justify-center text-sm">
                      You’ve already played today
                    </div>
                  )}
                  <img
                    src={q.image_url}
                    alt="daily still"
                    className="w-full h-auto block"
                    onLoad={onImageLoad}
                  />
                </div>

                {/* варианты */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opts.map((opt) => {
                    const isSel = answered && selected === opt;
                    const cls = [
                      "answer-btn px-4 py-3 rounded-md border transition text-left",
                      answered
                        ? "opacity-90"
                        : "hover:border-indigo-400 hover:bg-indigo-500/10",
                      isSel &&
                        (isCorrect
                          ? "border-green-500 bg-green-500/10"
                          : "border-red-500 bg-red-500/10"),
                      !canAnswer && "cursor-not-allowed opacity-60",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <button
                        key={opt}
                        className={cls}
                        disabled={!canAnswer || answered}
                        onClick={() => handleAnswer(opt)}
                        title={
                          !user
                            ? "Log in to answer the Daily"
                            : alreadyAnswered
                            ? "You’ve already answered today"
                            : !imgLoaded
                            ? "Loading image…"
                            : undefined
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* результат (только для авторизованных) */}
                {user && answered && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm">
                      {isCorrect ? (
                        <span className="text-green-400">
                          Correct! {saving ? "Saving…" : "Your time is recorded."}
                        </span>
                      ) : (
                        <span className="text-red-400">
                          Not this time. The correct answer:{" "}
                          <span className="font-semibold">{q?.correct_answer}</span>.
                        </span>
                      )}
                    </div>

                    <a
                      className="btn-secondary text-sm"
                      href={
                        "https://twitter.com/intent/tweet?text=" +
                        encodeURIComponent(
                          isCorrect
                            ? "I just solved today’s Hard Quiz Daily! 🎬"
                            : "Tried today’s Hard Quiz Daily. Can you beat it?"
                        ) +
                        "&url=" +
                        encodeURIComponent("https://hard-quiz.com/daily")
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Share on X
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* правый сайдбар на мобильных уезжает вниз */}
          <aside className="md:hidden">
            <h2 className="text-lg font-semibold">Today’s Fastest</h2>
            {fastestLoading ? (
              <p className="text-sm opacity-80 mt-2">Loading…</p>
            ) : fastest.length === 0 ? (
              <p className="text-sm opacity-80 mt-2">Be the first to set a time!</p>
            ) : (
              <ol className="mt-2 space-y-1 text-sm">
                {fastest.map((r, i) => (
                  <li key={i} className="flex justify-between border-b border-white/10 py-1">
                    <span className="truncate">{r.nickname}</span>
                    <span className="tabular-nums">{r.time_spent}s</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
