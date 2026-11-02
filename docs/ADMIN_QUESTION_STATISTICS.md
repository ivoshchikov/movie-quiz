# Admin question statistics

Requested 2 November 2026 (Asia/Nicosia). `/admin/question-statistics` is the third Administration destination after Question bank and Daily. It uses the existing pinned-Isildur access mechanism and shared Visitor activity / Page views panels. Client preparation, installed database version and confirmed production publication are recorded separately in the implementation PR.

## Interface and definitions

The server-paginated list shows the current Question bank image, ID, correct answer, category and difficulty, followed by Shown, Correct and Correct %. A question link opens its existing bank detail; browser Back restores the statistics URL and filters. Search matches answers, options, ID and image path. Category, difficulty, mode, versions, ordering and page live in the URL. Default mode is all guessing games; default version scope includes all revisions. Current version separates results after content edits. Sorting includes counts, percentages and either ID order. Unknown percentage for an unseen question is a dash, not an invented zero. The summary uses the filtered set, not just the current 25 rows.

- **Shown:** a server-issued question in a started Classic, Daily or Time Attack round. A prepared snapshot with no issue time is not a show. Re-fetching/reconciling an already issued round is not another show. Each new accepted game/round counts again, including guests and the owner. Issuance can precede successful image loading; these counters are not proof of image rendering or ad impressions.
- **Correct:** accepted correct outcomes from `hq_private.question_metrics`, without summing the overlapping guest/account/first-account cohort tables.
- **Correct %:** Correct / Shown × 100, rounded to one decimal place. An unanswered, wrong, timed-out, abandoned or skipped issued round remains in the denominator. Scores and time penalties do not affect these raw counts.
- **Scope:** Classic (`normal`), Daily and Time Attack (`time_attack`). This or That expresses preferences without a correct answer and contributes no rows/counters. Other passive previews, bank/detail/statistics views and Daily assignments do not issue guessing rounds.

These are **raw question activity counts**, including earlier activity on cancelled Daily dates; cancellation does not undo an exposure or accepted response. Existing trusted cohorts, Daily scoring/streak neutralization and the detailed bank metrics endpoint remain unchanged. The collection date is the existing authoritative gameplay `tracking_since` (15 October 2026 in production). Older public legacy answer counters cannot establish reliable exposure totals and are not combined with these figures.

Initial failure is unavailable, never a fabricated zero. Refresh failures retain clearly marked confirmed data; invalid/mismatched API data is rejected. Requests use the existing bounded, account/query-scoped read helper, abort old reads and ignore late responses after filters, navigation or logout. Search is debounced. Catalog failures have independent retry. Mobile uses three equal navigation destinations and per-question cards with labelled numeric cells; desktop uses a table. Controls have native keyboard semantics, reserved chevrons, readable theme tokens and 44 px targets.

## Server implementation

Installed migration `20261101230911_admin_question_statistics.sql` introduces `hq_private.question_shown_counts(question_id, revision, mode, shown)` with a primary key, RLS and all direct client-role privileges revoked. It stores no accounts or browsing data. Private invoker trigger functions increment it atomically on the first non-null `issued_at` for Classic/Time Attack and a valid first Daily start. Existing public Daily session writes remain revoked. Trigger functions are not client-executable. No game RPC body, answer validation, score, timer, assignment, cancellation, ranking or timezone is changed.

Backfill combines persistent completed outcome totals (which survive pruned guest sessions) with currently issued, unsettled rounds and valid, unsubmitted Daily starts in the tracking period. Settled retained rounds are not added twice. A short lock timeout and table locks make installation/backfill atomic with gameplay writers; a blocked installation rolls back. Future cleanup of sessions or snapshots does not delete the permanent show aggregates. A separate show table avoids coupling exposure writes to the existing outcome/cohort update rows.

`admin_question_statistics(p_expected_owner, p_search, p_category_id, p_difficulty_id, p_mode, p_versions, p_sort, p_page)` requires matching verified `auth.uid()` and the existing pinned-owner/admin-membership guard. Only authenticated clients have execute permission; a matching nonowner account is still denied. It has a fixed `pg_catalog` search path and bounded statement time. Filters/order values are validated; LIKE metacharacters are escaped. Counts, deterministic sorting, 25-row pagination and totals are computed on the server. Retired/deleted source questions are omitted consistently with the active Question bank; their stored historical aggregates are not erased.

The private route has noindex/no-store HTTP headers, noindex metadata, a passive login-return allowlist entry and no sitemap entry. Application credentials and public ingestion rules are unchanged.

## Verification

Isolated SQL tests cover historical backfill after snapshot removal, pending-versus-prepared rounds, idempotent issuance/answers, guest repeats, Daily start/status/cancellation, Time Attack skips, version/mode isolation, preference-game exclusion, legacy-counter separation, sorting/search/pagination, owner/membership/grants and retention. Native PostgreSQL adds concurrent issue/answer checks alongside the existing gameplay concurrency suite.

Browser checks cover three-tab navigation, owner/guest/player gating, percentages, all filters, reset during debounce, URL persistence, question-detail return, initial/stale/invalid errors, late responses, logout, pagination, sign-in return and 320/1440 px across Light/Dark/Christmas. Existing visitor and page-view checks also run. Types, lint, production/SEO build, full CI and the exact merge deployment must pass. Production verification uses schema/grant checks, read-only owner aggregates and anonymous denial; no synthetic game attempts or public view observations are created.

## Compact bank detail

The existing Question bank detail now displays just Shown, Correct answers and Correct %. Its `admin_question_metrics(p_question_id)` response adds an `activity` object with `shown`, `correct`, and nullable `accuracy`, using the same all-mode/all-version raw counters and one-decimal correct/shown calculation as this page. The prior `since`, `legacy` and `cohorts` fields remain compatible with older clients, but are not displayed in the compact panel. Owner checks and grants remain restricted. Editing only difficulty advances the question revision; default all-version statistics still include the earlier activity.
