// frontend/src/components/StreakLeaderboard.tsx
import { useEffect, useState } from "react";
import {
  getDailyStreakLeaderboard,
} from "../api";

type Row = {
  user_id: string;
  nickname: string | null;
  streak: number;
  start_d: string;
  end_d: string;
};

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
      <header className="mb-3 flex items-center gap-2">
        <h2 className="text-xl font-bold">Streak Leaderboard</h2>
        <div className="ml-auto inline-flex rounded-md border border-white/10 overflow-hidden">
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

      {loading ? (
        <p className="text-sm opacity-80">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm opacity-80">No data yet.</p>
      ) : (
        <ol className="divide-y divide-white/10 rounded-md border border-white/10">
          {rows.map((r, i) => (
            <li key={`${r.user_id}-${r.end_d}`} className="flex items-center p-3 gap-4">
              <div className="w-6 text-right tabular-nums opacity-70">{i + 1}.</div>
              <div className="flex-1">
                <div className="font-medium">{r.nickname ?? "Anonymous"}</div>
                <div className="text-xs opacity-70">
                  {r.start_d} → {r.end_d}
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
