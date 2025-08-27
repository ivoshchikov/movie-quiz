// frontend/src/components/YourDailyCard.tsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { getDailyDateUS, getDailyUserStreak, getMyDailyResult } from "../api";

type Streak = {
  current_streak: number;
  longest_streak: number;
  total_correct: number;
  last_played?: string | null;
  last_correct?: string | null;
};

interface Props {
  className?: string;
}

export default function YourDailyCard({ className = "" }: Props) {
  const { user } = useAuth();
  const loc = useLocation();
  const dateStr = getDailyDateUS();

  const [loading, setLoading] = useState(false);
  const [answeredToday, setAnsweredToday] = useState<boolean | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setAnsweredToday(null);
      setStreak(null);
      return;
    }

    setLoading(true);
    Promise.all([getMyDailyResult(user.id, dateStr), getDailyUserStreak(user.id)])
      .then(([my, s]) => {
        if (!mounted) return;
        setAnsweredToday(!!my.is_answered);
        setStreak({
          current_streak: s?.current_streak ?? 0,
          longest_streak: s?.longest_streak ?? 0,
          total_correct: s?.total_correct ?? 0,
          last_played: s?.last_played ?? null,
          last_correct: s?.last_correct ?? null,
        });
      })
      .catch(console.error)
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [user, dateStr]);

  return (
    <section className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Daily</h3>
        {!user && (
          <Link
            to="/login"
            state={{ redirectTo: loc.pathname + loc.search }}
            onClick={() =>
              localStorage.setItem("postLoginRedirectPath", loc.pathname + loc.search)
            }
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500"
          >
            Log in
          </Link>
        )}
      </header>

      {!user ? (
        <p className="text-sm opacity-80">
          Log in to track your streaks and appear on the leaderboards.
        </p>
      ) : (
        <>
          <div className="mb-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <span className="opacity-70">Today: </span>
            {loading ? (
              <span>Checking…</span>
            ) : answeredToday ? (
              <span className="text-green-400">answered ✓</span>
            ) : (
              <>
                <span className="opacity-90">not answered yet.</span>{" "}
                <a href="#puzzle" className="underline">
                  Play now
                </a>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-white/10 bg-white/5 p-2">
              <div className="text-2xl font-bold tabular-nums">
                {streak?.current_streak ?? 0}
              </div>
              <div className="mt-0.5 text-xs opacity-70">Current</div>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-2">
              <div className="text-2xl font-bold tabular-nums">
                {streak?.longest_streak ?? 0}
              </div>
              <div className="mt-0.5 text-xs opacity-70">Best</div>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-2">
              <div className="text-2xl font-bold tabular-nums">
                {streak?.total_correct ?? 0}
              </div>
              <div className="mt-0.5 text-xs opacity-70">Total correct</div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
