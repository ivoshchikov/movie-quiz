# Public information pages

Implemented 8 November 2026 for roadmap stage 9. The English `/about`, `/privacy` and `/contact` pages are delivered through PR #79; merge and actual production verification are recorded separately in that PR and the project roadmap.

## Owner details and release guard

The owner approved the public email `sound.media.ai@gmail.com` and explicitly selected this wording: “Hard Quiz is a Sound Media project. For general enquiries and privacy requests, contact sound.media.ai@gmail.com.” `frontend/src/publicSiteDetails.json` stores `projectBrand`, the exact email and `contactDetailsApproved: true`. Sound Media is presented as a project brand, without inventing a registered company or publishing a personal identity.

`npm run check:public-contact` validates approval of the project wording and email, a nonempty brand and an email without newline injection. Real production preparation and deployment retain those checks. CI may build against the exact isolated fixture origin; fixture artifacts remain forbidden for real deployments. Approval of public wording is distinct from legal identification: `controllerIdentityDisclosed` remains false in configuration and the prepared release manifest. The GDPR controller-identification question stays open; this release does not establish complete legal compliance. The owner's explicit choice supersedes the earlier internal requirement to wait for a personal or registered-company name before releasing these pages.

## Behaviour

All three pages work without sign-in and are linked in a reusable site footer alongside How to play. The sign-in form also links Privacy Policy in its existing 44-pixel action area. Active games retain their existing footer behaviour. English content includes an in-page contents list, keyboard focus and responsive Light, Dark and Christmas styles.

The same React content is prerendered into the first HTML response. Each page has one H1, canonical, title, description and structured data, plus its lazy stylesheet before JavaScript. Sitemap/release catalog entries and permanent `.html` redirects are generated through the existing Cloudflare pipeline. The publication registry records the new URLs as `not_checked`/Google `unknown`; a build does not imply publication or indexing. Vercel stays disabled.

## Facts behind the Privacy Policy

The audit used current client code, migrations and read-only Supabase project/schema, function-definition and scheduled-job inspection. No player answers were retrieved and no production account, game, result or traffic observation was created for QA.

| Area | Verified behaviour reflected in the copy |
| --- | --- |
| Accounts | Google or emailed sign-in links; Supabase email/account/session data; chosen nickname and optional stored avatar URL. Current player UI uses nickname/initial. No Hard Quiz password is requested. |
| Games | Guest/account sessions, rounds, answers/choices, timing and outcomes; signed-in history; device-local guest This or That favourites with explicit import. Public rankings show nickname and game metrics, not sign-in email. |
| First-party traffic | Random browser/event identifiers and server timestamps. Those counter tables do not store email, nickname, IP, URL or answers. Provider request/log processing is separate. |
| GA4 | Navigation, referral/campaign and game/article events. Custom fields omit email, nickname, authentication tokens and server game credentials. |
| Providers | Cloudflare delivery/security/logs; Supabase Auth/database/Storage; Google sign-in/Analytics; email services. Application database region is `eu-north-1`; this does not establish EU-only processing by every provider. |
| Storage | Auth session, game continuity, local favourites, theme/navigation, analytics choice and random visitor identity. Clearing a browser does not erase existing server records. |

Code evidence: `frontend/src/AuthContext.ts`, the Auth provider, Supabase client, profile/ranking and game contracts, `frontend/src/analytics/ga.ts`, `visits.ts`, `pageviews.ts`, `identity.ts`, `theme.ts`, and [ADMIN_VISITORS.md](ADMIN_VISITORS.md).

Current active scheduled jobs and their definitions establish the following retention targets:

- Gameplay maintenance runs every minute: Classic/Time Attack guest records after about one day; completed detailed round snapshots after 30 days, in batches. Summaries and signed-in answer history are separate.
- This or That maintenance runs every minute: guest profiles after about one day; old settled prior-cycle rounds after 30 days. Local favourites are independent.
- Traffic cleanup runs daily at `17 4 * * *`: observations outside the 35-day window are removed. Visitor days use America/Chicago; page views use elapsed hours.
- No automatic deletion solely for an inactive account was found. Account history, Daily, personal bests, signed-in preferences and aggregate statistics retain their service/integrity purposes; rights requests are assessed separately.
- Exact GA4 property retention, every provider log setting, backup expiry and correspondence retention were not established. The policy uses relevant settings/purpose criteria rather than invented fixed durations. Scheduled deletion is not an exact deadline per record.

## Analytics, ads and later work

Current optional measurement is opt-out after the existing account/owner check. The policy states this honestly; it does not claim an implemented consent banner or consent-before-analytics behaviour. Ordinary reload links apply the existing `analytics=off`/`on` choice because `ga.ts` reads it at module initialisation. The UI labels the saved preference, not guaranteed event delivery. Browser tests verify that refusal persists and stops GA and both first-party counters; owner/admin/bot exclusions remain independent.

Advertising is not active. Future AdSense wording describes preparation. Stage 11 must implement actual consent management and update this policy before advertising begins. This draft does not establish completed legal/consent compliance.

No separate Terms page is introduced: this change adds public information for existing free games and editorial content, without new payments, subscriptions or submission contracts. Reassess Terms if features or a specific requirement call for them. About/Contact/Terms are not represented as a universal mandatory AdSense bundle.

The owner's stage 8 decision is preserved: all existing images stay as they are. No universal licence/fair-use claim is added and open audit findings are not marked resolved. Contact includes instructions for rights enquiries without an unimplemented form or invented response deadline.

## Primary review sources

- [GDPR, particularly Article 13](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng).
- [Google publisher privacy disclosures](https://support.google.com/adsense/answer/10502938).
- [Google use of information from partner sites](https://policies.google.com/technologies/partner-sites).
- [Supabase privacy information](https://supabase.com/privacy), [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/) and [Google Privacy Policy](https://policies.google.com/privacy).
- [Cyprus supervisory authority complaint information](https://www.gov.cy/dataprotection/en/information-for-the-public/lodge-a-complaint/).

## Verification and completion

Local checks cover TypeScript, zero-warning ESLint, both fixture build profiles, ten HTTP scenarios per Cloudflare profile, first-response content, sitemap/metadata, publication failure detection and selected Chromium regressions. Fifteen new scenarios cover document access, navigation/focus, analytics choices and 320/390/1440 px in all three themes. The selected existing suites cover sign-in, guides, blog, navigation and analytics. An undersized Privacy link found in the login modal was moved into the existing action area; all 52 login and 15 document scenarios then passed.

Actual commit, CI, merge and production evidence belongs in the PR. The approved public-information implementation is delivered when checks pass, the change is merged through the existing workflow, and the three canonical production addresses are verified without sign-in. Keep the separate GDPR identification question, consent-management work and other legal findings open; publication does not resolve them.
