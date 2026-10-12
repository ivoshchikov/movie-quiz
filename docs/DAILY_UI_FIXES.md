# Daily streak and interface corrections

Date: 12 October 2026. Status: implemented; publication verification follows release.

- `get_daily_user_streak` keeps a run ending yesterday while today's Chicago-date Daily is unanswered. A wrong answer today or a missed calendar day returns a current streak of zero. Correct answers extend the run; best streak, total correct answers and historical dates retain their meaning. The existing RPC signature and privileges are preserved, with a fixed `pg_catalog` search path.
- Page headings and fragment/skip targets retain programmatic focus without a control-style outline. Keyboard focus remains visible on buttons, links, form fields and other controls.
- The Daily result's Share on X link uses the site's secondary button style and an X icon. The shared text and destination remain unchanged and do not include a correct answer.
- The shared login form uses a fixed-size Google SVG centered with its text in both the page and dialog. Sign-in behavior is unchanged.

The SQL migration is `supabase/migrations/20261012181118_daily_streak_pending_day.sql`. No game attempts, question edits or user results are created by production verification. Automated checks use isolated data, including pending days, correct/wrong answers, missed days, Chicago midnight and both DST transitions.

Local validation: 14 isolated SQL checks, 157 affected browser scenarios, TypeScript, lint, production/SEO build and `git diff --check` passed. Visual checks at 1366, 390 and 320 px confirmed centered Google icons, readable share buttons, no heading outline and no horizontal overflow. A login regression assertion now waits for the existing asynchronous URL cleanup before checking it; sign-in logic is unchanged. CI and deployment verification are recorded in the release pull request.
