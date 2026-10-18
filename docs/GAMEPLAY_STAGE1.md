# GAME-02 — Regular quiz and Daily hardening

Approved scope: the nine items in roadmap Stage 1. No new game modes. Implementation is on `feat/gameplay-stage1`; CI, production migration and deployment evidence are recorded in [PR #39](https://github.com/ivoshchikov/movie-quiz/pull/39).

## Guest resource controls

New guest sessions have server-enforced sliding limits: 12/minute and 120/hour per network source, 120/minute and 1,200/hour across all guests. Their retained round snapshots share a 25,000-row admission budget. The global advisory lock covers admission and snapshot creation, so simultaneous requests and changing session IDs cannot overshoot the budget. A retry of an existing session does not consume another start.

The source is a SHA-256 pseudonym of the normalized forwarded IP, a private random salt and the Chicago date. Raw addresses are not stored. Missing/invalid headers share an unknown-source bucket. Source identity is a resource-control hint, not proof of a person: shared networks can share limits and forged/changing headers do not bypass the global controls. Account limits remain 12/minute and 240/hour; guest games never become ranked account games.

## Outcomes and question statistics

Historical `question_stats` counters and `question_metrics` stay intact. New private `question_cohort_metrics` records guest outcomes, account outcomes and first account outcomes by question revision and normal/Daily mode. First account outcomes are a **subset**, not a third population to add to account totals. An immutable private ledger admits one first outcome per account/question/revision/mode. Existing detailed account events seed known earlier exposure without inventing historical split counters. Earlier visits that were never recorded cannot be reconstructed.

The administrator's question detail displays historical raw submissions separately from the new cohorts and their tracking start. Accuracy is correct/(correct+wrong+timeout); abandoned questions are separate. Mean response time uses submitted correct/wrong answers only. Guests may repeat; account repeats do not change the first-outcome cohort. Retries do not increment any aggregate twice. A cancelled Daily stays in raw/audit history but is excluded from new trusted Daily cohorts. Its first-exposure entry remains, so a later attempt at the known question cannot become a new first experience.

## Nicknames

New names use NFKC normalization, trimmed edges, collapsed ordinary spaces, a 3–20 Unicode-codepoint length and server-side control/invisible-character checks. The availability RPC and unique index share the same normalized case-folded key. Existing chosen spellings stay immutable, including avatar-only updates. The production preflight must find no normalized collisions before the index is installed.

## Inactive sessions and tabs

An owned RPC locks the session and checks inactivity before accepting more activity. At 15 minutes without server activity, the current issued question is settled exactly once; an expired question is a timeout. Last-life expiry ends at the question deadline. Otherwise the quiz ends at the inactivity cutoff with its accepted score, even if maintenance runs later. No unissued questions are counted. Starting a new ranked run still closes its predecessor.

`hq_private.maintain_gameplay()` runs every minute through the named pg_cron job `hq-gameplay-maintenance`. It uses bounded batches, nonblocking owner/row locks and the existing retention cleanup. It is not client-executable. `quiz_status` returns only the caller's owned receipt (guest sessions retain their unguessable UUID capability). Returning to a tab or receiving an account activity/result storage event reconciles the server receipt; a late stale response cannot overwrite a newer answer. Old tabs may need a page reload to load this interface code.

## Daily cancellation

Only the server-verified administrator may cancel an existing current/past assignment, with a public reason of 10–500 characters, an expected assignment version, an operation UUID and the expected account. The UI requires explicit confirmation. A lost response is checked read-only or retried using the identical operation. Cancellation is permanent; future dates use normal assignment editing instead.

The date lock serializes cancellation, starts, answers and assignment edits. A neutral date exposes no question or accepted result through the current Daily flow and accepts no further answer. Existing accepted rows are retained for audit. Cancelled assignments cannot be replaced/deleted. Correct-day streaks skip neutral dates without adding days; a previously missed active date still breaks a streak. The active leaderboard uses the last non-cancelled date on a neutral day. The personal calendar labels it cancelled and omits its old answer time.

Chicago midnight remains exclusive for both seeing and answering the previous day's question. Cancellation never grants an extension. Public shared images, existing ranking order, voluntary exit, historical real records and question #175's content/0.1 weight stay unchanged.

## Remaining Stage 1 items

- Automatic Daily selection includes eligible TV series, movies and actors; retirement, valid options, `daily_eligible` and recent-question exclusions still apply.
- Execution of all four obsolete Daily ranking aliases is revoked for PUBLIC/anon/authenticated, including overloads. Current rankings return bounded top plus the caller's exact rank across all real accounts.
- Personal labels define a correct streak across quizzes and unique questions with any recorded outcome. Cancelled Daily dates are neutral.

## Release checks

Run isolated SQL contracts (including native PostgreSQL concurrency in GitHub Actions), relevant browser flows in all supported themes/mobile sizes, TypeScript, ESLint and production build/SEO generation. No test game attempts, records, Daily assignments or cancellations are created in production.

Before applying the migration, read the current migration head, normalized nickname collisions and bank/record/result hashes. Apply the explicit migration before the compatible frontend. Verify private ACL/RLS, retired aliases, the scheduler and its successful runs; compare hashes using the same queries while accounting for real user activity. Confirm the exact merged commit's Vercel deployment and public HTTP/assets. Hosted Auth/platform advisor findings outside gameplay are retained separately; intentionally closed private tables and guarded public RPCs remain by design.
