import { useCallback, useEffect } from "react";
import { useReadRequest } from "../hooks/useReadRequest";
import { loadPageViewStats } from "./pageViewStats";

const format = new Intl.NumberFormat("en-US");
const dateLabel = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago",
});
const timeLabel = new Intl.DateTimeFormat("en-US", {
  hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/Chicago", timeZoneName: "short",
});

export default function AdminPageViews({ owner }: { owner: string }) {
  const load = useCallback((signal: AbortSignal) => loadPageViewStats(owner, signal), [owner]);
  const stats = useReadRequest(`${owner}:page-views`, load);
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
  return <section className="hq-admin-traffic hq-page-views" aria-label="Page views">
    <div className="hq-traffic-heading">
      <div><h2>Page views</h2><p>Public pages · excludes you</p></div>
      <button type="button" className="hq-inline-action" onClick={retry} disabled={stats.loading}>
        {stats.loading && data ? "Refreshing…" : "Refresh page views"}
      </button>
    </div>
    {stats.error && <p role="alert" className="hq-traffic-error">
      {data ? "Update failed. Showing the last confirmed counts." : "Page view statistics are unavailable."}{" "}
      <button type="button" className="hq-inline-action" onClick={retry} disabled={stats.loading}>Retry page views</button>
    </p>}
    <dl className="hq-traffic-cards" aria-busy={stats.loading}>
      {([['hours24', 'Last 24 hours'], ['days7', 'Last 7 days'], ['days30', 'Last 30 days']] as const).map(([key, label]) =>
        <div key={key}><dt>{label}</dt><dd>{data ? format.format(data[key]) :
          <span aria-label={stats.error ? "Unavailable" : "Loading"}>—</span>}</dd></div>)}
    </dl>
    <div className="hq-traffic-footnote">
      <span>{data ? <>Collecting since {dateLabel.format(new Date(data.since))} · updated {timeLabel.format(new Date(data.updated_at))}</> :
        stats.error ? "Counts could not be checked." : <span role="status">Loading page view statistics…</span>}</span>
      <details><summary>How page views work</summary><p>
        A page load or a move to a different page counts as one view, including repeat visits.
        Filters, scrolling and activity checks do not add views. Windows cover the preceding 24, 168 and 720 hours.
        Owner and administrative visits, previews and opted-out browsers are excluded.
        Collection starts on the date shown; earlier GA4 history is not included. Network failures and blocked
        collection can reduce counts. These are page views, not ad impressions, and may differ from Google Analytics.
      </p></details>
    </div>
  </section>;
}
