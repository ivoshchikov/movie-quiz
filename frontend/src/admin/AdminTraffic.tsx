import { useCallback, useEffect } from "react";
import { useReadRequest } from "../hooks/useReadRequest";
import { loadVisitorStats } from "./visitorStats";
import AdminPageViews from "./AdminPageViews";
import "./admin-traffic.css";

const format = new Intl.NumberFormat("en-US");
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago",
}).format(new Date(value));
const timeLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/Chicago", timeZoneName: "short",
}).format(new Date(value));

export default function AdminTraffic({ owner }: { owner: string }) {
  const load = useCallback((signal: AbortSignal) => loadVisitorStats(owner, signal), [owner]);
  const stats = useReadRequest(`${owner}:visitors`, load);
  const { retry } = stats;
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine) retry();
    };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [retry]);
  const data = stats.value;
  return (
    <><section className="hq-admin-traffic" aria-label="Visitor activity">
      <div className="hq-traffic-heading">
        <div><h2>Visitor activity</h2><p>Unique visitors · excludes you</p></div>
        <button type="button" className="hq-inline-action" onClick={retry} disabled={stats.loading}>
          {stats.loading && data ? "Refreshing…" : "Refresh stats"}
        </button>
      </div>
      {stats.error && <p role="alert" className="hq-traffic-error">
        {data ? "Update failed. Showing the last confirmed counts." : "Visitor statistics are unavailable."}{" "}
        <button type="button" className="hq-inline-action" onClick={retry} disabled={stats.loading}>Retry stats</button>
      </p>}
      <dl className="hq-traffic-cards" aria-busy={stats.loading}>
        {([['online', 'Online now'], ['today', 'Today'], ['week', 'Last 7 days'], ['month', 'Last 30 days']] as const).map(([key, label]) => (
          <div key={key} className={key === "online" ? "hq-traffic-online" : undefined}>
            <dt>{label}</dt><dd>{data ? format.format(data[key]) : <span aria-label={stats.error ? "Unavailable" : "Loading"}>—</span>}</dd>
          </div>
        ))}
      </dl>
      <div className="hq-traffic-footnote">
        <span>{data ? <>Collecting since {dateLabel(data.since)} · updated {timeLabel(data.updated_at)}</> : stats.error ? "Counts could not be checked." : <span role="status">Loading visitor statistics…</span>}</span>
        <details><summary>How counts work</summary><p>
          Online means a visible tab reported activity within the last 2 minutes. Counts include guests and signed-in players;
          multiple tabs in one browser count once. Different browsers or cleared storage can count separately.
          Today and the 7- and 30-day windows use America/Chicago, including today. Each visitor counts once per window.
          Collection starts on the date shown, so earlier visits are not included. Owner and administrative visits,
          previews and opted-out browsers are excluded. Counts may differ from Google Analytics.
        </p></details>
      </div>
    </section><AdminPageViews owner={owner} /></>
  );
}
