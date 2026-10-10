# Daily administration (UI-11)

The frontend requires `20261010173000_admin_daily_guard.sql`. Apply it through Supabase SQL Editor as `postgres` **before merging the frontend release**. The current production admin's legacy save RPC will be unavailable between migration and frontend deployment. The migration retains existing assignments, attempts and results, and is transactional and rerunnable. A lock timeout rolls the transaction back; retry after the blocking transaction ends.

The migration was prepared from the owner's 2026-10-10 export of the Daily tables, RLS and RPC definitions. It adds `daily_challenge.admin_revision`, exact-date read RPC `get_daily_assignment_admin`, guarded writer `set_daily_question_admin`, and three triggers. It preserves the signatures and bodies of `start_daily_session`, `submit_daily_result`, and automatic question selection.

The writer verifies the authenticated admin, expected account, question ID, assignment revision and the source fields captured in the preview. It validates the image path, correct answer and four distinct options, rejects past dates and dates with any started attempt, then returns the recorded assignment. Revision increments prevent a stale A→B→A edit from bypassing conflict detection.

The same transaction advisory lock covers assignments, sessions and results, including direct RLS-permitted session/result writes and the submit RPC's fallback start. Queries after waiting use a fresh READ COMMITTED snapshot. Non-compatible isolation levels fail closed. The blind legacy writer and direct client writes to assignments/admin membership lose their privileges. Existing gameplay RPCs retain their grants and RLS. History uses a left join so a missing source question does not hide its assignment.

PostgreSQL references: [transaction advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS) and [volatile snapshots](https://www.postgresql.org/docs/current/xfunc-volatility.html). The lock namespace is `721104`, with the date's day offset from 2000-01-01 as its second key.

Run `supabase/UI11-verify.sql` after applying the migration and return its `ui11_status` value. It only reads metadata and contains no player data. `ready: true` establishes the required columns, trigger wiring and effective client privileges. Release confirmation also requires GitHub/Vercel checks and live HTTP/UI verification. The production migration has not been applied from this workspace; no database administrator connection is available here.

Local SQL verification uses an isolated PostgreSQL WASM instance with fictional data and no network connection:

```sh
# Install the test-only runtime outside the application/repository.
npm install --prefix /tmp/hq-sql-test --no-save --no-package-lock @electric-sql/pglite@0.3.14
HQ_PGLITE_MODULE=/tmp/hq-sql-test/node_modules/@electric-sql/pglite/dist/index.js node --test supabase/tests/admin_daily.test.mjs
```

These tests validate migration execution, privileges and sequential behavior. The embedded runtime has one connection, so it skips the three real concurrency cases. The Daily SQL guards GitHub workflow runs all 15 cases against an isolated PostgreSQL 16 service, with two real connections waiting on the date lock. Its localhost-only fixture adapter refuses an existing database; production data is never cleared or used. In a separate staging PostgreSQL database, verify both orders: start a session while holding the date lock, then attempt replacement from a second connection; reverse the order and confirm session start waits until the assignment transaction commits. Do not create production Daily attempts for testing.

UI-11 does not close GAME-DATA-01/02. Score authority, elapsed-time authority, ranking and immutable nickname enforcement remain separate tasks. A question fetched before session start can also become stale before the start RPC; its signature does not accept an expected question ID. That game contract is recorded for the later game-data work.
