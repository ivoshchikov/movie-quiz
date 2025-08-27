// frontend/src/pages/DailyStatsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import StreakLeaderboard from "../components/StreakLeaderboard";
import DailyRecords from "../components/DailyRecords";
import { useAuth } from "../AuthContext";
import { getDailyDateUS, getDailyUserStreak } from "../api";

export default function DailyStatsPage() {
  return (
    <>
      <Seo
        title="Daily Stats | Hard Quiz"
        description="Streak leaderboard and all-time daily records on Hard Quiz."
      />
      <section className="mx-auto max-w-5xl">
        <header className="mb-4">
          <h1 className="text-3xl font-extrabold">Daily Stats</h1>
          <p className="mt-1 text-sm opacity-80">
            Active streaks, all-time best streaks, fastest times, and total correct answers.
          </p>
          <p className="mt-1 text-xs opacity-60">
            Stats use <b>US Central</b> date ({getDailyDateUS()}). Times are seconds on correct answers only.
          </p>
        </header>

        <MySummaryCard />

        <div className="mt-8 space-y-10">
          <StreakLeaderboard />
          <DailyRecords />
        </div>
      </section>
    </>
  );
}

/** Small personal summary card (only when logged in) */
function MySummaryCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(!!user);
  const [data, setData] = useState<{
    current_streak: number;
    longest_streak: number;
    total_correct: number;
    last_played: string | null;
    last_correct: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!user) return;
    setLoading(true);
    import("../api")
      .then(({ getDailyUserStreak }) => getDailyUserStreak(user.id))
      .then((d) => {
        if (mounted) setData(d);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Your Daily</h3>
            <p className="text-sm opacity-75">
              Log in to track your streaks and appear on the leaderboards.
            </p>
          </div>
          <Link to="/login" className="btn-primary inline-flex items-center gap-1 text-sm">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-lg font-semibold">Your Daily</h3>
      {loading ? (
        <p className="text-sm opacity-80">Loading your stats…</p>
      ) : !data ? (
        <p className="text-sm opacity-80">No data yet — play the Daily to get started.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Current streak" value={data.current_streak} />
          <Stat label="Longest streak" value={data.longest_streak} />
          <Stat label="Total correct" value={data.total_correct} />
          <Stat
            label="Last played"
            value={data.last_played ? new Date(data.last_played).toLocaleDateString() : "—"}
          />
        </div>
      )}
      <div className="mt-3">
        <Link to="/daily" className="btn-secondary inline-block text-sm">
          Play today’s Daily
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
