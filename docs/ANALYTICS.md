# Growth analytics v2

GROW-02, 16 October 2026. This describes the branch implementation, not a confirmed production release or GA4 ingestion result. No database migration is required.

## Collection boundary

- Collection waits for the existing auth check. The pinned owner account and `/admin` paths are excluded.
- Only `hard-quiz.com` and `www.hard-quiz.com` collect normally. Development/preview hosts do not collect. Playwright explicitly enables the fake `G-QUIZFIXTURE` tag and intercepts the Google script, so tests do not transmit to Google.
- Open `https://hard-quiz.com/?analytics=off` once in each owner/QA browser profile, including guest testing. The local opt-out persists until a full load with `?analytics=on`. With denied storage it lasts only for the current document. This measurement control is not a new consent-management system.
- One synchronous loader guard prevents repeated scripts/configuration while the tag is still loading. The official Google `Arguments` queue format is preserved. Script failure allows a later retry without duplicate initialization.
- Repeated effects for the same router visit/public URL produce one manual pageview. Real later visits, including Back, can produce another. Callback credentials, fragments, return destinations, email parameters and arbitrary query text are excluded from explicit configuration/event URLs; campaign parameters and public filters remain.
- Virtual referrers use the previous sanitized page. `accounts.google.com` and the configured Supabase `/auth/v1/` referrer use `ignore_referrer`; Google Search and external UTM remain eligible. This affects future collection, not historical attribution.

## Event contract

All explicit events include `analytics_version=2`, sanitized `page_location` and debug status. A queued command is not a delivery acknowledgement.

| Event | Trigger and interpretation |
|---|---|
| `page_view` | Tracked router visit; public URL/path, title and previous public referrer |
| `quiz_start` | Successful, active, nonempty server session; `run_id`, `game_mode=normal`, category/difficulty IDs, `is_logged_in` |
| `quiz_answer` | Accepted server outcome; same attempt/settings, `question_id`, `question_number`, `outcome`, legacy `correct`, `answer_count`, `resolved_count` |
| `quiz_first_answer` | First accepted explicit choice in the attempt; timeouts excluded |
| `qualified_play` | Three accepted explicit normal answers or one confirmed Daily result; mode, attempt, count, `criterion=three_answers` or `daily_submitted` |
| `quiz_end` | Observed normal ending; same attempt/settings, reason, score, elapsed seconds, counts, `result_confirmed` |
| `daily_view` | Successfully loaded status; `d` in America/Chicago, mode and login state; retries of the same view/date/account do not add views |
| `daily_start` | Explicit Start receives a usable attempt which preceding status had not already started; attempt, date and login state |
| `daily_resume` | Explicit Continue receives the existing attempt; exclude from new-start counts |
| `daily_submit` | Existing read-after-write/retry flow confirms a saved result; attempt, date, legacy `ok`, server `elapsed`, login state |
| `article_to_quiz_click` | Article footer CTA; `article_slug`, `cta_position=footer`, random `cta_id`, destination mode |
| `login_view` | Login becomes available to a guest; `placement=page` or `modal` |
| `login_success` | Existing auth flow confirms a new sign-in/valid callback; excludes ordinary session restoration and email-link requests; not a signup |
| `share_click` | Existing Daily Share on X clicked; method, mode and Daily date; not a confirmed published post |

`answer_count` includes accepted explicit choices (`correct`/`wrong`); `resolved_count` also includes timeouts. Three timeouts never qualify a player. Short Hard games can end normally before three choices: segment difficulties and report these separately. Distinguish `completed`, `out-of-lives` and `exit`; all endings are not full-bank completions.

An exit with `result_confirmed=false` precedes the final server receipt: its counts/score/time are a snapshot. An accepted in-flight answer can arrive later and generate an answer event after exit; derive attempt totals from unique answers when needed. Do not treat the exit snapshot as a verified leaderboard receipt. Closing a document, network failure, consent behavior and browser blocking can still lose events. Database statistics serve a different purpose.

## IDs, attribution and deduplication

`run_id` is a separate random analytics UUID, never a server session/round capability. Local lookup keys, answer text, email, nickname and tokens are not emitted. Normal lookup uses the router play key/account scope; Daily uses local account/date/first start timestamp. A same-tab Daily continuation can recover its analytics ID after reload.

Per-tab state deduplicates normal start/end, accepted round numbers, first answer, qualified play and Daily submission. Persisted records expire after 24 hours, with approximately 40 recent records retained. With denied storage, memory deduplication lasts until reload. This is not an exactly-once guarantee across tabs/browsers/devices, and run IDs do not identify unique people.

The article CTA associates with the next matching-mode start/continue in the same tab within 30 minutes. Shared `cta_id` connects these without internal UTM. This is association, not causal proof; new tabs/devices and email links may lose it. A previously started Daily can acquire the association on Continue: distinguish resumes from new starts.

## Remaining GA4 configuration and release verification

The Windsor connection supplied report data, not verified GA4 Editor access. No property settings were changed.

1. Check Enhanced measurement → Page views → advanced history setting. The application sends manual SPA pageviews: disable automatic history pageviews for this implementation, then verify one view per navigation in DebugView/network. `send_page_view=false` alone does not prove the separate history setting is disabled. See [manual pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views) and [SPA verification](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).
2. Verify no extra Google tag/GTM is injected outside this repository, and confirm the production measurement ID.
3. Verify the actual OAuth callback retains external source/campaign and does not introduce an authentication acquisition source. Code uses Google's [`ignore_referrer`](https://developers.google.com/analytics/devguides/collection/ga4/reference/config#ignore_referrer); the historical referral cause is not proven and old reports remain unchanged.
4. Register only useful event dimensions: version, mode, category/difficulty, reason/outcome, article slug/CTA position, share method, criterion, login placement/state and result confirmation/date if needed. Numeric counts/durations require appropriate custom metrics or event-level analysis. Do not register high-cardinality `run_id`/`cta_id` as ordinary dashboard dimensions; event-level export/BigQuery for exact joins is separate work. Sending parameters does not configure custom definitions retroactively.
5. Mark `qualified_play` as a key event only after validating delivery/definition. Sending it does not automatically configure a key event. GA4 engaged sessions and qualified players are different metrics.
6. After an authorized release, confirm the published asset and actual collection. Any diagnostic session needs an isolated/labeled context and exclusion from growth cohorts. This task's browser checks use isolated RPC fixtures, not real game/Daily attempts.
7. Record the validated collection date and report `analytics_version=2` separately from the old definition. The property baseline uses America/Los_Angeles, while Daily remains America/Chicago. D1/D7 use exact next/seventh-day returns; R7 means any return in days 1–7. Only mature cohorts count. Current cohort retrieval returned only D0 and has not validated retention completeness.

## Later work

Normal-result Share/Copy, successful-copy events and player-share UTM belong to GROW-06. This change measures the existing Daily Share link. A dedicated article engagement criterion belongs to GROW-07; foreground time/scroll do not prove reading. Ad impressions/revenue require a real ad integration and GROW-11. Search Console report access is now confirmed; URL Inspection and the baseline GA4 aggregate/device discrepancy remain data follow-ups.

The browser suite covers delayed loading/pageviews, QA/preview/owner exclusion, OAuth versus search, article-to-game linkage, accepted/retried/late answers, timeouts, Daily continuation/confirmation/share, denied storage and sign-in semantics. Google and Supabase writes are intercepted. Final verification and CI belong in the PR; implementation, merge, deployment and GA4 ingestion remain separate statuses.
