// frontend/src/components/DailyRecords.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDailyStreakLeaderboard } from "../api";

type Row = {
  user_id: string;
  nickname: string | null;
  streak: number;
  start_d: string; // из RPC, но тут не используем
  end_d: string;   // из RPC, но тут не используем
};

function medal(i: number) {
  return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
}

export default function DailyRecords() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // all-time best streaks per user
        const data = await getDailyStreakLeaderboard(false, 50);
        setRows(data);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="mx-auto max-w-3xl">
      <h2 className="mb-1 text-xl font-bold">All-time Best Streaks</h2>
      <p className="mb-2 text-xs opacity-60">
        Longest consecutive days with correct answers (per player).
      </p>

      {loading ? (
        <p className="text-sm opacity-80">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm">
          No data yet.{" "}
          <Link to="/daily" className="underline">
            Play today’s Daily
          </Link>{" "}
          and start a streak!
        </div>
      ) : (
        <ol className="divide-y divide-white/10 rounded-md border border-white/10">
          {rows.map((r, i) => (
            <li key={`${r.user_id}-${i}`} className="flex items-center gap-4 p-3">
              <div className="w-8 text-right tabular-nums">{medal(i)}</div>
              <div className="flex-1">
                <div className="font-medium">{r.nickname ?? "Anonymous"}</div>
              </div>
              <div className="text-lg font-bold tabular-nums">
                {r.streak} <span className="text-sm opacity-70">days</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
