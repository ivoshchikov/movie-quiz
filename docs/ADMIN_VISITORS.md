# Admin visitor activity

UI-15, 1 November 2026 (Asia/Nicosia). Owner requested consistent filter chevrons and a private audience summary. Dashboard implementation: [PR #55](https://github.com/ivoshchikov/movie-quiz/pull/55). The earlier connector confirmation failure is resolved; migration `20261101174455` is installed and server permissions verified. Client publication is confirmed separately in the PR. Collection begins when that production client is published. Filter chevrons were released separately in [PR #56](https://github.com/ivoshchikov/movie-quiz/pull/56). CI and rollout evidence are recorded in those PRs.

## Interface

The existing Question bank, Add questions and Daily workspaces share a compact Visitor activity panel below Administration navigation. Four cards show Online now, Today, Last 7 days and Last 30 days. It refreshes every 30 seconds in a visible, online tab and offers a manual refresh. The last-updated clock explicitly labels CST/CDT. Failed refreshes retain the last confirmed snapshot with a stale-data notice; initial failure is unavailable, never a fabricated zero. Reads are account-scoped, time out after 10 seconds and ignore late responses after navigation or logout.

`AdminSelect` retains native select semantics, platform pickers and keyboard behavior. A shared, non-interactive SVG chevron has a reserved text area and consistent inset/vertical alignment in all three themes. Forced-colors mode restores the native arrow. Bank filters, import defaults and individual question cards use the same control.

## Meaning of the counts

| Card | Definition |
|---|---|
| Online now | Distinct observed browser identifiers with a foreground heartbeat in the preceding two minutes. Closing or hiding the last visible tab expires within two minutes, rather than immediately. |
| Today | Distinct browser identifiers on the current America/Chicago date. |
| Last 7 days | Distinct browser identifiers across today and the six preceding Chicago dates. |
| Last 30 days | Distinct browser identifiers across today and the 29 preceding Chicago dates. |

Guests and signed-in players are included. These are browser-based visitor estimates, not identified people, account totals or GA4 activeUsers. Tabs and reloads share an identifier; different devices/browsers, clearing storage and memory-only fallback after denied storage can count separately. Weekly/monthly uniques are not a sum of daily counts. The visible collection-start date and disclosure explain that visits before this release are unavailable. No GA4 history is imported or silently backfilled. Browser automation or forged ingestion requests are not certified human visits; these observational counts are not competitive/security records.

## Collection and privacy boundary

- Collection starts only after the existing account check, on production hostnames. `/admin`, preview/development hosts and the existing persistent `?analytics=off` control are excluded. Fixture mode uses only the isolated API origin.
- A visible, online document reports at most once per minute; reloads/tabs share a 45-second local throttle. The server also throttles writes per identifier. Failed/timed-out telemetry never blocks games and can recover on the next interval. Background/offline tabs pause collection.
- The client creates an independent random UUID using Web Crypto, sharing first creation with Web Locks when supported. It is never a game session/token, Supabase user ID or GA4 run ID. Local storage denial falls back to this document's memory.
- Ingestion accepts only that identifier. Dates and last-seen times come from the server. No nickname, email, answer, page URL, search query or IP address is stored in these tables. Google analytics and this private panel remain separate measurements and can differ.
- The pinned owner account is excluded by verified `auth.uid()` in SQL, irrespective of client flags or mutable nickname/metadata. If that browser was previously a guest, its observations are removed and an exclusion marker prevents a late or signed-out heartbeat from reintroducing them. The owner browser is also excluded locally after logout. Anonymous use of a different/cleared browser cannot identify its owner: use the existing analytics opt-out there.
- Daily visitor rows and owner-browser exclusion markers are retained for up to 35 days by `hq-traffic-retention`; the collection-start setting remains. No visit-level history is exposed in the admin UI.

## Server contract

Migration: `20261101174455_admin_visitor_stats.sql`. New RLS-protected tables live only in the existing unexposed `hq_private` schema. All table access is revoked from PUBLIC, anon, authenticated and service_role. No exposed-schema setting changes.

`site_visit_heartbeat(uuid)` is intentionally callable by guests/players. It returns void and cannot read counts, choose a date, submit another user's identity or change gameplay data. Per-identifier transaction locks serialize concurrent tabs against owner exclusion. `admin_visitor_stats(p_expected_owner uuid)` requires matching `auth.uid()` plus the existing `is_admin()` membership/pinned-owner guard. It returns only four counts, collection start and server date/time. Every privileged RPC has a fixed search path and explicit execute grants. No service key, new external analytics credential or Edge deployment is needed. Existing game tables, answers, rules and Daily timezone are unchanged.

## Verification

SQL contracts cover guest/player/owner grants, removed membership, stale expected-account IDs, deduplication, throttling, owner exclusion, 7/30-day boundaries, online expiry, Chicago midnight, both DST changes, invalid identifiers and retention. The native PostgreSQL workflow additionally verifies real concurrent connections. Browser checks cover access gating, initial and stale errors, retry, malformed data, polling, logout/late reads, all three palettes at 320 px, keyboard selects, heartbeat timeouts, visibility/offline recovery, opt-out, owner logout, denied storage and simultaneous tabs. All mutation tests use isolated data; production verification must not create synthetic public visits or game attempts.

## Page views — UI-15 extension, 1 November 2026

A separate panel sits immediately below Visitor activity in all three admin workspaces. Last 24 hours, Last 7 days and Last 30 days count observations in the preceding **24, 168 and 720 hours**, using the server clock and excluding future timestamps. These are rolling windows, unlike the Chicago calendar-date windows for unique visitors. Both panels poll every 30 seconds while visible/online, support refresh/retry, retain marked confirmed data on refresh failure and clear private state after logout. Three cards form a desktop row and compact stacked rows on phones.

A visible, online public document records its initial load and each change of normalized pathname. Reloads and Back/Forward to a different pathname count again. Query-only filters, hashes, scrolling, theme changes, heartbeat intervals and admin refreshes do not create views. Both streams share the existing browser UUID, production-host/opt-out/auth boundary and owner-browser exclusion. A separate random UUID identifies each view. Effect replay and retries after lost responses reuse that token; the server inserts it once and never moves the original timestamp. Concurrent tabs share the browser identifier but create independent view tokens.

Failed observations retry every 15 seconds in the same visible, online document. An in-memory queue retains at most 32 pending views for 10 minutes, survives SPA navigation and is cleared for the owner. Each request times out after 10 seconds. Closing/reloading the document, blocked collection, long outages or queue expiry can lose unconfirmed observations; there is no durable browsing history or delivery guarantee. Receipt time is authoritative. Counts can differ from GA4 because measurement rules and collection start differ. **Page views are not actual ad impressions**; no ad-rendering, viewability or revenue data is inferred. No GA4 history is imported.

Installed migration `20261101212340_admin_page_views.sql` adds a separate collection-start timestamp and `hq_private.site_page_views(view_id, visitor_id, viewed_at)`. No page path, query/hash, referrer, IP, nickname or account ID is stored. The table is unexposed, RLS-enabled and direct client-role access is revoked. `site_record_page_view(p_visitor uuid, p_view uuid)` intentionally accepts guest/player observations and returns void. Its nested heartbeat shares the visitor transaction lock, validation and exclusion logic. An owner heartbeat also removes earlier guest views from that browser; concurrent/late observations cannot restore them. A token used by another browser is rejected without readback. These observations are not a human-traffic or advertising-fraud certificate.

`admin_page_view_stats(p_expected_owner uuid)` requires verified `auth.uid()`, the matching expected account and the existing pinned-Isildur/membership `is_admin()` guard. Only authenticated clients can invoke it; other accounts fail the guard. It returns only three counts, collection start and server update time. New definer RPCs have fixed `pg_catalog` search paths, bounded timeouts and explicit execute grants. Existing visitor contracts remain compatible. The existing private cleanup/cron also deletes page events older than 840 hours on its daily run; rows can remain until cleanup. Gameplay and Daily assignments are unaffected.

SQL and browser checks cover rolling boundaries across DST/session timezones, idempotent retries, token conflicts, guest/player denial, owner purge and native concurrent connections, raw-table permissions, retention, route/reload/filter behavior, timeout recovery with queued routes, visibility/offline pause, opt-out/preview exclusion, logout/late reads, malformed counts, independent errors and all three themes on desktop/mobile. Production verification reads schema/grants and owner aggregates and checks anonymous denial without synthetic public events. Installed migration version and final CI/merge/production evidence are recorded in the implementation PR.
