// frontend/src/components/StreakLeaderboard.tsx
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
  /** какая вкладка по умолчанию */
  initialTab?: "active" | "all";
  /** сколько строк показывать в сжатом режиме */
  limit?: number;
  /** компактная верстка (уменьшаем отступы, делаем ряд в одну строку) */
  compact?: boolean;
}

export default function StreakLeaderboard({
  initialTab = "active",
  limit = 5,
  compact = true,
}: Props) {
  const [tab, setTab] = useState<"active" | "all">(initialTab);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchRows = async (active: boolean, lim: number) => {
    setLoading(true);
    try {
      const data = await getDailyStreakLeaderboard(active, lim);
      setRows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(tab === "active", expanded ? 20 : limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, expanded, limit]);

  const rowCls = compact
    ? "flex items-center gap-3 px-3 py-2"
    : "flex items-center gap-4 p-3";

  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <div className="text-lg font-semibold leading-none">
          Streak <span className="opacity-80">Leaderboard</span>
        </div>

        <div className="ml-auto inline-flex overflow-hidden rounded-md border border-white/10">
          <button
            className={`px-3 py-1 text-sm ${
              tab === "active" ? "bg-white/10" : "hover:bg-white/5"
            }`}
            onClick={() => setTab("active")}
            title='Shows streaks that end today (US Central).'
          >
            Active <span className="hidden sm:inline">today</span>
          </button>
          <button
            className={`px-3 py-1 text-sm ${
              tab === "all" ? "bg-white/10" : "hover:bg-white/5"
            }`}
            onClick={() => setTab("all")}
            title="Best streak per player over all time."
          >
            All-time <span className="hidden sm:inline">best</span>
          </button>
        </div>

        {/* Show all / Top-5 */}
        <button
          className="ml-2 text-xs opacity-80 underline-offset-2 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Top-5" : "Show all"}
        </button>
      </header>

      <p className="mb-2 text-xs opacity-70">
        Consecutive correct days. “Active today” uses US Central date.
      </p>

      {loading ? (
        <p className="text-sm opacity-80">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm opacity-80">
          No data yet for today. Play today’s Daily to start a streak.
        </p>
      ) : (
        <ol className="divide-y divide-white/10 rounded-md border border-white/10">
          {rows.map((r, i) => {
            const m = medal(i);
            return (
              <li
                key={`${r.user_id}-${r.end_d}`}
                className={rowCls}
                title={`${r.start_d} → ${r.end_d}`}
              >
                <div className="w-6 text-right tabular-nums opacity-70">
                  {m ? <span aria-hidden>{m}</span> : <span>{i + 1}.</span>}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <span className="truncate font-medium">
                    {r.nickname ?? "Anonymous"}
                  </span>
                </div>
                <div className="text-base font-semibold tabular-nums">
                  {r.streak}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
