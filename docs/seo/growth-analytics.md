# Growth measurement: SEO roadmap stage 3

Introduced 22 October 2026. This extends [the analytics v2 contract](../ANALYTICS.md); it does not change scores, qualification criteria, authentication permissions or database records.

## Collection correction

The application now sends `ignore_referrer: true` only for Google authentication and the configured Supabase auth host (`/auth/v1/` or an origin-only referrer). Ordinary search/referral/direct documents omit the field entirely. Google states that supplying **any value**, including false, ignores a referrer. Keeping `page_referrer` sanitized preserves search/referral identification without sending query text or callback secrets.

This corrects future collection; it cannot repair historical acquisition sources or prove that every Direct session was a genuine visitor. Version 2 and its existing qualified-play definitions remain in use. Treat the release date as a transition day and start the first full post-correction cohort on 23 October in the property's reporting timezone.

## This or That coverage

- `comparison_start`: the explicit start obtains a usable, newly opened pair. Passive landing pages and restoration of existing comparisons do not create new starts.
- `comparison_choice`: the server confirms the pending left/right/equal preference. Failed/unknown responses, skipped/unknown/withdrawn pairs and passive receipt restoration do not create preferences.
- `comparison_first_choice`: the first observed confirmed preference in that analytical comparison. Repeated requests and reloads reuse the local record when available.

These events use `game_mode=this_or_that`, the existing article CTA association and a separate random analytical run ID. Server comparison/round capabilities remain local inputs only. They do not generate `quiz_answer` or `qualified_play`; a comparison's first preference is reported separately from quiz qualification. Browser/storage/network loss can still lose events; no cross-device exactly-once claim is made.

## Repeating the report

Use the connected Windsor.ai read tools. Discover accounts, fields and connector options before requesting data; the exact supported custom field IDs may change. The saved query plan is a reproducibility aid, not a replacement for live field discovery.

```bash
cd frontend
npm run growth:report -- --queries
npm run growth:report -- --input /private/completed-sources.json --output /private/growth-report.md
npm run test:growth
```

The offline generator performs no API calls, reads no credentials and modifies no analytics settings. Actual account data and generated reports should stay in private deliverables, outside this public Git repository. Only synthetic reporting fixtures are committed.

The input is a schemaVersion=1 object with propertyId, propertyTimezone, retrievedAt, optional exact authenticationHosts, a public article catalog (`slug`, `publishedOn`) and five sources named by the query plan. Each source contains `from`, `to`, `status: done` and `data` from its completed response. Use `dist/seo-release.json` for the article catalog after a build. Empty completed data is valid; pending, failed, malformed, missing-field and mismatched-window inputs fail. The report embeds its source aggregates so it can be reproduced later.

Use a broad context window and a separate post-v2 measurement window. Events and landing-session data must use the same dates; historical acquisition and historical organic landings must also agree. Search Console can have a different finalized cutoff, explicitly shown. GA4's property timezone was read as **America/Los_Angeles** on 22 October, matching Search Console's Pacific calendar. Exclude the most recent processing days and label incomplete periods; Google processing can take 24–48 hours.

The GA4 event query uses nine explicit dimensions including date and hostname, plus event_count. Event-scoped/key-event attribution fields are intentionally not mixed into the page/landing/custom-dimension query; incompatible GA4 requests must be split. A completed connector response does not expose every Google sampling/thresholding limitation.

## Interpretation and exclusions

- Only hard-quiz.com and www.hard-quiz.com are eligible production hosts in reports. Preview/unknown hosts, source qa or medium internal, and exact authentication hosts are shown as excluded categories.
- Owner exclusion, administrative routes and persistent `?analytics=off` continue to operate in collection. Historical anonymous owner activity cannot be retroactively identified; Direct and missing sources remain a separate category.
- Only analytics_version=2 events enter the measured funnel. Counts of sessions, pageviews, clicks and attempts are distinct. The generator does not calculate a conversion percentage from incompatible aggregates or sum distinct-user rows.
- Pageviews use the actual page_path. Starts and participation use the explicit article_slug carried from the footer CTA. A session landing on an article never substitutes for missing CTA association. Unknown remains unknown.
- New starts include quiz_start, daily_start and comparison_start. Daily resumes remain separate. Qualified play retains the established Classic/Time Attack/Daily criteria; comparison participation stays separate.
- Articles published after the measured cutoff are marked unavailable in that window. GSC click/session/attempt data are not joined as individual journeys. Aggregate attribution and CTA association do not prove causality or human identity.

No scheduled export or notification is created by this stage. OAuth verification must use an existing account, preserve the intended destination and campaign, and stop before starting a production game. When owner/QA exclusion is active, absence of GA events is expected and is not proof of failed authentication.

Primary references: [Google unwanted referrals](https://support.google.com/analytics/answer/10327750), [traffic-source processing](https://support.google.com/analytics/answer/11242841), [data freshness](https://support.google.com/analytics/answer/12233314), [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google).
