# Time Attack — GAME-03

Owner approved implementation, tests and production publication on 19 October 2026 (Asia/Nicosia), following the fixed-time recommendation. This document describes the implementation; PR and deployment evidence are recorded separately before the release is called published.

## Rules

- Fixed-time race; Movie Stills (category 1) and Actors (category 2). TV series waits for a larger bank. No streak-bonus variant or extending Time Bank in this release.
- Easy 120 seconds, Medium 90, Hard 60. Level changes the total clock, not the question pool. Each full block contains 2 Easy / 2 Medium / 1 Hard questions in shuffled order while those strata remain. An exhausted stratum drops out; remaining questions continue. No question repeats in a run. Each stratum is a weighted permutation; existing selection weights, including #175 at 0.1, are preserved.
- Correct +2 points; wrong −1 point; scores may be negative. A random four-choice guess has expected score −0.25, before time spent answering. Skip deducts 3 seconds once and permanently consumes the question. With less than 3 seconds left, a skip ends the run at its actual acceptance time, without backdating the end.
- No lives and no separate question timer. The server starts the overall clock after admission and bank construction, when it issues the first question. Loading and network time count. The same 500 ms minimum feedback applies to answers and skips; it consumes overall time.
- A run ends at the exclusive server deadline, after the last bank question, or on explicit End run. An issued unanswered final question is recorded as abandoned, with no point penalty. An empty bank creates no personal best.
- Reload/closing/leaving does not end or pause Time Attack. The same browser can restore the run, including an unconfirmed action, while storage is available. Signed-in players can find their active run on another device through `time_attack_active`. A new signed-in normal or Time Attack run closes the previous active run across both formats.
- Guests can play. Signed-in records require the account and nickname before start; guest capability IDs never promote to account records.
- Time Attack bests are separate from normal and Daily, keyed by account/category/time pressure, for this fixed-time format. Score descending, then milliseconds from start to the **last accepted scored answer** that forms the final score (correct or wrong), ascending. A skip does not change score time. A run with no answers uses its actual duration. Exact ties use earlier record update, then stable player UUID order. Voluntary exit is allowed. Connection speed can affect time.
- The leaderboard ranks all actual players, exposes bounded top 10 plus caller's exact rank, and never returns session capability IDs. No seeded players.

## Server and data contracts

Migration: `supabase/migrations/20261019104507_time_attack.sql`.

Private tables hold sessions, immutable question/option/answer snapshots, and personal bests. RLS is enabled and direct client privileges revoked. Public RPCs explicitly grant only the intended roles and check ownership; guest sessions are random UUID capabilities. Private helpers are not executable by client roles. Every privileged function fixes its search path.

Owner and row locks serialize starts, answers, skips, next, exit and maintenance. Clocks are read after waiting for locks. A round accepts one action; conflicting later actions fail, matching retries return the existing receipt. `time_attack_next` includes the previous round ID, so duplicated or delayed requests cannot advance past a new question. Receipts contain a monotonic version; the client drops older responses. Future questions and correct answers are never returned.

Guest normal/Time Attack starts share the admission lock, per-network and global sliding quotas, rotating source pseudonyms and exact combined 25,000 snapshot budget from GAME-02. Account starts share existing 12/minute, 240/hour caps. Storage loss, changing session IDs or switching modes do not reset server quotas.

Existing minute maintenance closes expired Time Attack at the server deadline. Guest snapshots are removed after one day in bounded batches; signed-in snapshots after 30 days, while sessions, answer history, cohort aggregates and records remain. Public image URLs remain shared as previously agreed.

Accepted outcomes join the existing event/cohort system under `time_attack`. Skips have a separate counter and are excluded from accuracy/answer-time denominators. An unanswered final round is abandoned, not a wrong answer or timeout. Actual question difficulty is retained for metrics. Raw question correct/wrong counters continue to count actual submitted answers. Existing normal profile statistics explicitly filter `normal`, preserving their meaning. Admin metrics show the new mode and skip counts; profile shows separate Time Attack records.

## Interface and discovery

`/time-attack` contains category/time-pressure selection, rules, resume/last receipt and its own leaderboard. Home, regular leaderboard, How to play and profile link to it. `/time-attack/play` is a compact play/result view with keyboard answers, skip, image recovery and immutable action retries. It is noindex/no-store; the public introduction has initial HTML, canonical/OG metadata and sitemap entry. Analytics use mode `time_attack`, a fresh analytics run ID and existing deduplication; capability IDs never enter events or public URLs. Skips do not qualify as submitted answers.

## Validation and publication

Run the existing isolated SQL fixture with the new migration, including native PostgreSQL concurrent choices/skip/next, a blocked answer crossing its deadline, and mixed-mode admission races. Browser fixtures use the test Supabase origin and intercept analytics, covering score/clock/skip, loss/retry, reload, signed-in records, own rank, image errors and four viewport sizes. Production verification must use passive pages, metadata, catalog/ranking reads and schema/ACL checks; do not create test attempts or records in production.
