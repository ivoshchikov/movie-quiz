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
  startDailySession,
  type Question,
  type DailyFastestRow,
  type MyDailyResult,
} from "../api";
import { shuffle } from "../utils/shuffle";
import { gaEvent } from "../analytics/ga";   // ← GA events

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
    is_answered: false,
    is_correct: null,
    time_spent: null,
    answered_at: null,
  });
  const [myDailyLoading, setMyDailyLoading] = useState(false);

  // мгновенный локальный флаг (оптимистичный)
  const [localAnswered, setLocalAnswered] = useState(false);

  const startTsRef = useRef<number | null>(null);
  const sessionKickoffOnce = useRef(false);

  // ключ для localStorage
  const lsKey = user ? `daily:${dateStr}:answered:${user.id}` : null;

  // GA: просмотр страницы Daily (с датой US Central)
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

  // при смене пользователя/даты — подтянем локальный флаг
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

    // неблокирующий старт серверной сессии
    if (user && !sessionKickoffOnce.current) {
      sessionKickoffOnce.current = true;
      startDailySession(user.id, dateStr).catch(console.error);
    }

    // GA: фиксируем момент старта (когда постер реально показан)
    gaEvent("daily_start", { d: dateStr, is_logged_in: !!user });
  };

  // ---------- load fastest ----------
  const refreshFastest = () => {
    setFastestLoading(true);
    getDailyFastest(dateStr, 5)
      .then(setFastest)
      .catch(console.error)
      .finally(() => setFastestLoading(false));
  };
  useEffect(() => {
    refreshFastest();
  }, [dateStr]);

  // ---------- мой статус по daily (в фоне) ----------
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
    // Без входа — сохраняем цель и ведём на логин
    if (!user) {
      localStorage.setItem("postLoginRedirectPath", loc.pathname + loc.search);
      navigate("/login", { state: { redirectTo: loc.pathname + loc.search } });
      return;
    }
    // Доп. защита: не даём повторный старт, пока сохраняем
    if (!q || answered || saving || !imgLoaded || alreadyAnswered) return;

    // Fresh re-check against server just in case (multi-tab/cleared LS)
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

    // локально фиксируем выбор
    setSelected(answer);
    const ok = answer.trim() === (q?.correct_answer ?? "").trim();
    setIsCorrect(ok);

    const elapsed =
      startTsRef.current != null
        ? Math.max(1, Math.floor((Date.now() - startTsRef.current) / 1000))
        : 1;

    // ⬇⬇⬇ Оптимистично фиксируем "ответил" до RPC (закрывает мультивкладки/перезагрузку)
    if (lsKey) localStorage.setItem(lsKey, "1");
    setLocalAnswered(true);
    setSaving(true);

    try {
      await submitDailyResult(user.id, dateStr, ok, elapsed); // БД примет только первый ответ
      // GA: событие попытки
      gaEvent("daily_submit", { d: dateStr, ok, elapsed });

      // подтягиваем подтверждение с сервера
      const status = await getMyDailyResult(user.id, dateStr);
      setMyDaily(status);
      if (lsKey && status.is_answered) localStorage.setItem(lsKey, "1");
      refreshFastest();
    } catch (e) {
      console.error(e);
      // откат оптимистичного флага, если RPC провалился
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
        description="One new movie/actor image every day. Guess it fast and enter Today’s Fastest!"
      />

      <section className="mx-auto max-w-5xl">
        <header className="mb-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Daily Challenge</h1>
            <p className="mt-1 text-sm opacity-80">Date: {niceDate}</p>
          </div>

          <aside className="hidden md:block w-72">
            <h2 className="text-lg font-semibold">Today’s Fastest</h2>
            {fastestLoading ? (
              <p className="mt-2 text-sm opacity-80">Loading…</p>
            ) : fastest.length === 0 ? (
              <p className="mt-2 text-sm opacity-80">
                Be the first to set a time!
              </p>
            ) : (
              <ol className="mt-2 space-y-1 text-sm">
                {fastest.map((r, i) => (
                  <li
                    key={i}
                    className="flex justify-between border-b border-white/10 py-1"
                  >
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
          <div className="mb-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
            <b>Sign in to play the Daily.</b> We only accept answers from
            logged-in players to keep the competition fair.{" "}
            <Link
              to="/login"
              state={{ redirectTo: loc.pathname + loc.search }}
              onClick={() =>
                localStorage.setItem(
                  "postLoginRedirectPath",
                  loc.pathname + loc.search,
                )
              }
              className="underline"
            >
              Log in
            </Link>
            .
          </div>
        )}

        {/* Сообщение, если уже отвечал (локально мгновенно, детали догружаются) */}
        {alreadyAnswered && (
          <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
            You’ve already answered today’s Daily
            {myDailyLoading ? (
              <> — checking your result…</>
            ) : myDaily.is_correct != null ? (
              <>
                {" — "}
                {myDaily.is_correct ? "correct" : "not correct"}
                {myDaily.time_spent ? ` in ${myDaily.time_spent}s` : ""}
                .
              </>
            ) : (
              "."
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <div>
            {loading || !q ? (
              // Скелетон, который не займет больше первого экрана
              <div className="w-full rounded-lg bg-white/5 animate-pulse h-[42vh] sm:h-[48vh]" />
            ) : (
              <>
                {/* Постер: ограничиваем высоту, чтобы варианты влезали в первый экран */}
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
                    className="
                      max-h-[44vh] sm:max-h-[52vh] 
                      w-auto max-w-full object-contain 
                      block select-none
                    "
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

                {/* результат (только если это наша попытка; когда alreadyAnswered=true — баннер выше) */}
                {user && answered && !alreadyAnswered && (
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      {isCorrect ? (
                        <span className="text-green-400">
                          {saving ? "Saving…" : "Correct! Your time is recorded."}
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

          {/* правый сайдбар на мобильных уезжает вниз */}
          <aside className="md:hidden">
            <h2 className="text-lg font-semibold">Today’s Fastest</h2>
            {fastestLoading ? (
              <p className="mt-2 text-sm opacity-80">Loading…</p>
            ) : fastest.length === 0 ? (
              <p className="mt-2 text-sm opacity-80">
                Be the first to set a time!
              </p>
            ) : (
              <ol className="mt-2 space-y-1 text-sm">
                {fastest.map((r, i) => (
                  <li
                    key={i}
                    className="flex justify-between border-b border-white/10 py-1"
                  >
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
