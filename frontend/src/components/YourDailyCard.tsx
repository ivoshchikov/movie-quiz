import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { getDailyUserStreak } from "../api";
import type { DailyUserStreak } from "../api";

export default function YourDailyCard({ date, refreshKey }: { date: string; refreshKey: number }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [view, setView] = useState<{ owner?: string; loading: boolean; error: boolean; streak: DailyUserStreak | null }>({ loading: true, error: false, streak: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 20000);
    setView({ owner: userId, loading: true, error: false, streak: null });
    getDailyUserStreak(userId, controller.signal).then(streak => {
      if (active) setView({ owner: userId, loading: false, error: false, streak: streak ?? { current_streak: 0, longest_streak: 0, total_correct: 0 } });
    }).catch(() => { if (active) setView({ owner: userId, loading: false, error: true, streak: null }); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [userId, date, refreshKey, retry]);
  if (!userId) return null;
  const ready = view.owner === userId && !view.loading && !view.error;
  return <section className="hq-daily-stats" aria-label="Your Daily stats"><h2>Your streak</h2>
    {view.error && view.owner === userId ? <div className="hq-daily-stats-error" role="alert"><span>Streak stats couldn’t load.</span><button className="hq-inline-action" onClick={() => setRetry(value => value + 1)}>Retry stats</button></div> : <>
      <dl><div><dt>Current streak</dt><dd>{ready ? view.streak?.current_streak : "—"}<small> days</small></dd></div><div><dt>Best streak</dt><dd>{ready ? view.streak?.longest_streak : "—"}<small> days</small></dd></div></dl>
      <p>{ready ? `${view.streak?.total_correct} correct Daily answers` : "Loading your streak…"}</p>
    </>}
  </section>;
}
