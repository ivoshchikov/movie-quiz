// frontend/src/components/StreakLeaderboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDailyStreakLeaderboard } from "../api";

type Row = {
  user_id: string;
  nickname: string | null;
  streak: number;
  start_d: string;
  end_d: string;
};

function medal(i: number) {
  return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
}

export default function StreakLeaderboard() {
  const [tab, setTab] = useState<"active" | "all">("active");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async (active: boolean) => {
    setLoading(true);
    try {
      const data = await getDailyStreakLeaderboard(active, 20);
      setRows(data);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(true);
  }, []);

  useEffect(() => {
    refresh(tab === "active");
  }, [tab]);

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-2 flex items-center gap-2">
        <h2 className="text-xl font-bold">Streak Leaderboard</h2>
        <div className="ml-auto inline-flex overflow-hidden rounded-md border border-white/10">
          <button
            className={`px-3 py-1 text-sm ${tab === "active" ? "bg-white/10" : "hover:bg-white/5"}`}
            onClick={() => setTab("active")}
          >
            Active today
          </button>
          <button
            className={`px-3 py-1 text-sm ${tab === "all" ? "bg-white/10" : "hover:bg-white/5"}`}
            onClick={() => setTab("all")}
          >
            All-time best
          </button>
        </div>
      </header>
      <p className="mb-3 text-xs opacity-60">
        Consecutive correct days. “Active today” uses US Central date.
      </p>

      {loading ? (
        <p className="text-sm opacity-80">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm">
          No data yet{tab === "active" ? " for today" : ""}.{" "}
          <Link to="/daily" className="underline">
            Play today’s Daily
          </Link>{" "}
          to start a streak.
        </div>
      ) : (
        <ol className="divide-y divide-white/10 rounded-md border border-white/10">
          {rows.map((r, i) => (
            <li key={`${r.user_id}-${r.end_d}`} className="flex items-center gap-4 p-3">
              <div className="w-8 text-right tabular-nums">{medal(i)}</div>
              <div className="flex-1">
                <div className="font-medium">{r.nickname ?? "Anonymous"}</div>
                <div className="text-xs opacity-70">
                  {new Date(r.start_d).toLocaleDateString()} →{" "}
                  {new Date(r.end_d).toLocaleDateString()}
                </div>
              </div>
              <div className="text-lg font-bold tabular-nums">{r.streak}</div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
