// src/components/Leaderboard.tsx
import { useEffect, useState } from "react";
import { getLeaderboard, LeaderboardRow } from "../api";

interface Props {
  categoryId?: number;
  difficultyId?: number;
  categoryLabel?: string;
  difficultyLabel?: string;
}

function fmt(t: number) {
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function Leaderboard({
  categoryId,
  difficultyId,
  categoryLabel,
  difficultyLabel,
}: Props) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const ready = categoryId != null && difficultyId != null;

  useEffect(() => {
    if (!ready) {
      setRows([]);
      return;
    }
    setLoading(true);
    getLeaderboard(categoryId!, difficultyId!, 5)
      .then(setRows)
      .catch((e) => {
        console.error(e);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [categoryId, difficultyId, ready]);

  return (
    <section>
      <h2 className="text-xl sm:text-2xl font-semibold mb-1">
        Global leaderboard
      </h2>
      <p className="mb-3 text-sm opacity-70">
        {categoryLabel && difficultyLabel
          ? `${categoryLabel} — ${difficultyLabel}`
          : "Pick a category and level to see top scores"}
      </p>

      {!ready ? (
        <p className="opacity-75 text-sm">Select both category and level.</p>
      ) : loading ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="opacity-75 text-sm">Be the first to set a score!</p>
      ) : (
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="border-b border-gray-600">
            <tr>
              <th className="py-1 px-2">#</th>
              <th className="py-1 px-2">Nickname</th>
              <th className="py-1 px-2">Score</th>
              <th className="py-1 px-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.nickname}-${i}`}>
                <td className="py-1 px-2">{i + 1}</td>
                <td className="py-1 px-2">{r.nickname || "Anonymous"}</td>
                <td className="py-1 px-2">{r.best_score}</td>
                <td className="py-1 px-2">{fmt(r.best_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
