// frontend/src/components/BestStreaksList.tsx
import { useEffect, useState } from "react";
import { getDailyStreakLeaderboard } from "../api";

type Row = {
  user_id: string;
  nickname: string | null;
  streak: number;
  start_d: string;
  end_d: string;
};

interface Props {
  limit?: number;
  className?: string;
}

const Medal: React.FC<{ place: number }> = ({ place }) => {
  if (place === 1) return <span title="1st">🥇</span>;
  if (place === 2) return <span title="2nd">🥈</span>;
  if (place === 3) return <span title="3rd">🥉</span>;
  return <span className="opacity-60">•</span>;
};

export default function BestStreaksList({ limit = 10, className = "" }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getDailyStreakLeaderboard(false, limit)
      .then((r) => mounted && setRows(r))
      .catch(console.error)
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [limit]);

  return (
    <section className={className}>
      <h3 className="mb-2 text-lg font-semibold">All-time Best Streaks</h3>
      <p className="mb-3 text-xs opacity-70">
        Longest consecutive correct days (best per player).
      </p>

      {loading ? (
        <p className="text-sm opacity-80">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm opacity-80">No data yet.</p>
      ) : (
        <ol className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
          {rows.map((r, i) => (
            <li
              key={`${r.user_id}-${r.end_d}`}
              className="flex items-center gap-3 p-3"
            >
              <div className="w-6 text-center">
                <Medal place={i + 1} />
              </div>
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
