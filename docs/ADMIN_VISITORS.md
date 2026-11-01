# Admin visitor activity

UI-15, 1 November 2026 (Asia/Nicosia). Owner requested consistent filter chevrons and a private audience summary. Dashboard status: prepared in [PR #55](https://github.com/ivoshchikov/movie-quiz/pull/55), not deployed; the Supabase migration connector returns an expired confirmation even with Allow all actions. No new database objects or collection are active. Filter chevrons were released separately in [PR #56](https://github.com/ivoshchikov/movie-quiz/pull/56). CI and rollout evidence are recorded in those PRs.

## Interface

The existing Question bank, Add questions and Daily workspaces share a compact Visitor activity panel below Administration navigation. Four cards show Online now, Today, Last 7 days and Last 30 days. It refreshes every 30 seconds in a visible, online tab and offers a manual refresh. Failed refreshes retain the last confirmed snapshot with a stale-data notice; initial failure is unavailable, never a fabricated zero. Reads are account-scoped, time out after 10 seconds and ignore late responses after navigation or logout.

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

Migration: `20261101163345_admin_visitor_stats.sql`. New RLS-protected tables live only in the existing unexposed `hq_private` schema. All table access is revoked from PUBLIC, anon, authenticated and service_role. No exposed-schema setting changes.

`site_visit_heartbeat(uuid)` is intentionally callable by guests/players. It returns void and cannot read counts, choose a date, submit another user's identity or change gameplay data. Per-identifier transaction locks serialize concurrent tabs against owner exclusion. `admin_visitor_stats(p_expected_owner uuid)` requires matching `auth.uid()` plus the existing `is_admin()` membership/pinned-owner guard. It returns only four counts, collection start and server date/time. Every privileged RPC has a fixed search path and explicit execute grants. No service key, new external analytics credential or Edge deployment is needed. Existing game tables, answers, rules and Daily timezone are unchanged.

## Verification

SQL contracts cover guest/player/owner grants, removed membership, stale expected-account IDs, deduplication, throttling, owner exclusion, 7/30-day boundaries, online expiry, Chicago midnight, both DST changes, invalid identifiers and retention. The native PostgreSQL workflow additionally verifies real concurrent connections. Browser checks cover access gating, initial and stale errors, retry, malformed data, polling, logout/late reads, all three palettes at 320 px, keyboard selects, heartbeat timeouts, visibility/offline recovery, opt-out, owner logout, denied storage and simultaneous tabs. All mutation tests use isolated data; production verification must not create synthetic public visits or game attempts.
