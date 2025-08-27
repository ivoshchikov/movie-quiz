// frontend/src/pages/DailyPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Seo from "../components/Seo";
import {
  getDailyDateUS,
  getDailyQuestion,
  getDailyQuestionPublic,
  getMyDailyResult,
  submitDailyResult,
  startDailySession,
  type Question,
  type MyDailyResult,
} from "../api";
import { shuffle } from "../utils/shuffle";
import { gaEvent } from "../analytics/ga";
import StreakLeaderboard from "../components/StreakLeaderboard";
import BestStreaksList from "../components/BestStreaksList";
import YourDailyCard from "../components/YourDailyCard";

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

  const [myDaily, setMyDaily] = useState<MyDailyResult>({
    is_answered: false,
    is_correct: null,
    time_spent: null,
    answered_at: null,
  });
  const [myDailyLoading, setMyDailyLoading] = useState(false);

  const [localAnswered, setLocalAnswered] = useState(false);

  const startTsRef = useRef<number | null>(null);
  const sessionKickoffOnce = useRef(false);

  const lsKey = user ? `daily:${dateStr}:answered:${user.id}` : null;

  useEffect(() => {
    gaEvent("daily_view", { d: dateStr, is_logged_in: !!user });
  }, [dateStr, user]);

  // ---------- load question ----------
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loader = user ? getDailyQuestion : getDailyQuestionPublic;
    loader()
      .then((qq) => {
        if (!mounted) return;
        setQ(qq);
        setOpts(shuffle(qq.options));
      })
      .catch(console.error)
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [dateStr, user]);

  // подтянуть локальный флаг
  useEffect(() => {
    if (!user) {
      setLocalAnswered(false);
      return;
    }
    const v = lsKey ? localStorage.getItem(lsKey) === "1" : false;
    setLocalAnswered(v);
  }, [user, dateStr, lsKey]);

  // старт таймера после загрузки изображения
  const onImageLoad = () => {
    setImgLoaded(true);
    if (!startTsRef.current) startTsRef.current = Date.now();

    if (user && !sessionKickoffOnce.current) {
      sessionKickoffOnce.current = true;
      startDailySession(user.id, dateStr).catch(console.error);
    }

    gaEvent("daily_start", { d: dateStr, is_logged_in: !!user });
  };

  // мой статус по daily
  useEffect(() => {
    if (!user) {
      setMyDaily({ is_answered: false, is_correct: null, time_spent: null, answered_at: null });
      setMyDailyLoading(false);
      return;
    }
    setMyDailyLoading(true);
    getMyDailyResult(user.id, dateStr)
      .then((res) => {
        setMyDaily(res);
        if (lsKey && res.is_answered) localStorage.setItem(lsKey, "1");
      })
      .catch(console.error)
      .finally(() => setMyDailyLoading(false));
  }, [user, dateStr, lsKey]);

  const alreadyAnswered = !!user && (localAnswered || myDaily.is_answered);
  const canAnswer = !!user && imgLoaded && !alreadyAnswered;
  const answered = selected !== null;

  // ---------- answer ----------
  const handleAnswer = async (answer: string) => {
    if (!user) {
      localStorage.setItem("postLoginRedirectPath", loc.pathname + loc.search);
      navigate("/login", { state: { redirectTo: loc.pathname + loc.search } });
      return;
    }
    if (!q || answered || saving || !imgLoaded || alreadyAnswered) return;

    try {
      const fresh = await getMyDailyResult(user.id, dateStr);
      if (fresh.is_answered) {
        setMyDaily(fresh);
        if (lsKey) localStorage.setItem(lsKey, "1");
        setLocalAnswered(true);
        return;
      }
    } catch (e) {
      console.error(e);
    }

    setSelected(answer);
    const ok = answer.trim() === (q?.correct_answer ?? "").trim();
    setIsCorrect(ok);

    const elapsed =
      startTsRef.current != null
        ? Math.max(1, Math.floor((Date.now() - startTsRef.current) / 1000))
        : 1;

    if (lsKey) localStorage.setItem(lsKey, "1");
    setLocalAnswered(true);
    setSaving(true);

    try {
      await submitDailyResult(user.id, dateStr, ok, elapsed);
      gaEvent("daily_submit", { d: dateStr, ok, elapsed });

      const status = await getMyDailyResult(user.id, dateStr);
      setMyDaily(status);
      if (lsKey && status.is_answered) localStorage.setItem(lsKey, "1");
    } catch (e) {
      console.error(e);
      if (lsKey) localStorage.removeItem(lsKey);
      setLocalAnswered(false);
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
        description="One new movie/actor image every day — plus leaderboards and streaks."
      />

      <section className="mx-auto max-w-6xl">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Daily Challenge</h1>
            <p className="mt-1 text-sm opacity-80">Date: {niceDate}</p>
          </div>
        </header>

        {/* Сообщение, если уже отвечал */}
        {alreadyAnswered && (
          <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
            You’ve already answered today’s Daily
            {myDailyLoading ? (
              <> — checking your result…</>
            ) : myDaily.is_correct != null ? (
              <>
                {" — "}
                {myDaily.is_correct ? "correct" : "not correct"}
                .
              </>
            ) : (
              "."
            )}
          </div>
        )}

        {/* Основная двухколоночная сетка */}
        <div className="grid gap-6 md:grid-cols-[1fr_420px]">
          {/* Левая колонка — игра */}
          <div id="puzzle">
            {loading || !q ? (
              <div className="w-full rounded-lg bg-white/5 animate-pulse h-[42vh] sm:h-[48vh]" />
            ) : (
              <>
                <div className="relative rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
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
                    onLoad={onImageLoad}
                    className="max-h-[44vh] sm:max-h-[52vh] w-auto max-w-full object-contain block select-none"
                  />
                </div>

                {/* варианты */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      (!user || !imgLoaded || alreadyAnswered || answered) &&
                        "cursor-not-allowed opacity-60",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <button
                        key={opt}
                        className={cls}
                        disabled={!user || !imgLoaded || alreadyAnswered || answered}
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

                {/* результат для своей попытки */}
                {user && answered && !alreadyAnswered && (
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      {isCorrect ? (
                        <span className="text-green-400">
                          {saving ? "Saving…" : "Correct! Your answer is recorded."}
                        </span>
                      ) : (
                        <span className="text-red-400">
                          Not this time. The correct answer:{" "}
                          <span className="font-semibold">
                            {q?.correct_answer}
                          </span>
                          .
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
                            : "Tried today’s Hard Quiz Daily. Can you beat it?",
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

          {/* Правая колонка — карточка + статы */}
          <aside className="md:sticky md:top-4 h-max">
            <YourDailyCard className="mb-4" />

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-1 text-xl font-semibold">Daily Stats</h2>
              <p className="mb-4 text-xs opacity-70">
                Streaks use US Central date. Only correct answers count.
              </p>

              {/* Лидерборд по стрикам (вкладки: Active / All-time) */}
              <StreakLeaderboard />

              {/* Лучшие стрики за всё время */}
              <BestStreaksList className="mt-6" limit={10} />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
