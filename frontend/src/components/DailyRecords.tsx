// frontend/src/components/DailyRecords.tsx
import { useEffect, useState } from "react";
import {
  getDailyBestTimeRecords,
  getDailyTotalCorrectLeaderboard,
} from "../api";

type BestTime = {
  user_id: string;
  nickname: string | null;
  best_time: number;
  d: string;
  answered_at: string;
};

type TotalCorrect = {
  user_id: string;
  nickname: string | null;
  total_correct: number;
};

export default function DailyRecords() {
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);
  const [totals, setTotals] = useState<TotalCorrect[]>([]);
  const [loadingA, setLoadingA] = useState(true);
  const [loadingB, setLoadingB] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoadingA(true);
        const a = await getDailyBestTimeRecords(20);
        setBestTimes(a);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingA(false);
      }
    })();

    (async () => {
      try {
        setLoadingB(true);
        const b = await getDailyTotalCorrectLeaderboard(20);
        setTotals(b);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingB(false);
      }
    })();
  }, []);

  return (
    <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
      <div>
        <h2 className="mb-2 text-xl font-bold">All-time Best Times</h2>
        {loadingA ? (
          <p className="text-sm opacity-80">Loading…</p>
        ) : bestTimes.length === 0 ? (
          <p className="text-sm opacity-80">No records yet.</p>
        ) : (
          <ol className="divide-y divide-white/10 rounded-md border border-white/10">
            {bestTimes.map((r, i) => (
              <li key={`${r.user_id}-${r.answered_at}`} className="flex items-center p-3 gap-4">
                <div className="w-6 text-right tabular-nums opacity-70">{i + 1}.</div>
                <div className="flex-1">
                  <div className="font-medium">{r.nickname ?? "Anonymous"}</div>
                  <div className="text-xs opacity-70">{r.d}</div>
                </div>
                <div className="text-lg font-bold tabular-nums">{r.best_time}s</div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-xl font-bold">All-time Total Correct</h2>
        {loadingB ? (
          <p className="text-sm opacity-80">Loading…</p>
        ) : totals.length === 0 ? (
          <p className="text-sm opacity-80">No data yet.</p>
        ) : (
          <ol className="divide-y divide-white/10 rounded-md border border-white/10">
            {totals.map((r, i) => (
              <li key={`${r.user_id}-${r.total_correct}`} className="flex items-center p-3 gap-4">
                <div className="w-6 text-right tabular-nums opacity-70">{i + 1}.</div>
                <div className="flex-1">
                  <div className="font-medium">{r.nickname ?? "Anonymous"}</div>
                </div>
                <div className="text-lg font-bold tabular-nums">{r.total_correct}</div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
