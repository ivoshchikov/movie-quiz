import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { dailyStatus } from "../game/server";
import { dailyDate, dailyDateLabel, nextDailyReset } from "../daily/time";
import { useReadRequest } from "../hooks/useReadRequest";
import SiteIcon from "./SiteIcon";

/** A passive summary. Only /daily's explicit Start action can begin an attempt. */
export default function DailySetup() {
  const { user, loading, error, retrySession } = useAuth();
  const [date, setDate] = useState(dailyDate);
  const load = useCallback((signal: AbortSignal) => dailyStatus(signal), []);
  const status = useReadRequest(`${user?.id ?? "guest"}:${date}`, load, !loading && !error);
  const retry = status.retry;
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible") { setDate(dailyDate()); retry(); } };
    const timer = window.setTimeout(() => { setDate(dailyDate()); retry(); }, Math.max(1, nextDailyReset() - Date.now()));
    document.addEventListener("visibilitychange", update);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", update); };
  }, [date, retry]);
  const value = status.value;
  return <div className="hq-mode-daily-setup">
    <p><time dateTime={value?.date ?? date}>{dailyDateLabel(value?.date ?? date)}</time> · US Central</p>
    {loading ? <p role="status">Checking account…</p> : error ? <p role="alert">Your account could not be checked. <button className="hq-inline-action" onClick={retrySession}>Retry sign-in check</button></p>
      : status.error ? <p role="alert">Daily status could not load. <button className="hq-inline-action" onClick={retry}>Retry Daily status</button></p>
      : status.loading ? <p role="status">Checking today’s Daily…</p>
      : <p>{value?.cancelled ? "Today’s Daily is cancelled. Your streak is protected." : value?.result ? "You’ve completed today’s Daily." : value?.started_at ? "Your attempt is waiting. The timer keeps running." : user ? "Ready when you are. Opening Daily won’t use your attempt." : "Sign in to play. Opening Daily won’t use your attempt."}</p>}
    <Link className="hq-primary" to="/daily">{value?.cancelled || value?.result ? "View Daily" : value?.started_at ? "Continue Daily" : "Play Daily"} <SiteIcon name="arrow" /></Link>
    <Link className="hq-text-action" to="/how-to-play#daily">How it works <SiteIcon name="arrow" /></Link>
  </div>;
}
