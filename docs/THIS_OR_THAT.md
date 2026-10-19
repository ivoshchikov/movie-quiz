# This or That

Status: implemented on `feat/this-or-that`; production release pending verification.

The first release compares actors from the current actor photo/name bank. Actresses have an independent board under the same server contract and appear only when at least two approved participants exist. Movies and TV series are outside this release.

## Player experience

- Ten random pairs per set, without a timer, lives or correct answers. Each accepted choice is saved immediately, including an unfinished set.
- Two named, uncropped photos. Decisive choices wait for both photos; a failed image can be retried or skipped.
- Choose either actor, like both equally, identify an unfamiliar side/both, or skip. Neutral choices consume a slot without casting half votes.
- A 1.2 second feedback pause, followed by an automatic next pair. Hidden tabs pause advancement. There is no Next pair button. After ten pairs, Another 10 is an explicit action.
- Uniform random unordered pairs and independent random sides. Every available pair is used before a new cycle; no ranking, difficulty, #175 quiz weight or shared starter list biases selection.
- Personal favourites appear privately on the mode page, set summary and account profile. They are preliminary and may contain equal places.
- Community favourites show a bounded top 20 and name search with each actor’s actual overall place. Early data has no invented rank. Pair percentages appear only after a choice and at least 20 other eligible decisive voters; self and excluded accounts are removed.

## Authoritative data and privacy

`hq_private.tt_people` is a stable person catalog, separate from question/photo identity. Duplicated names/photos do not create extra contestants. Edits, retirement or deletion of a source question withdraw its participant until an administrator explicitly approves it again. This does not reset votes or person IDs.

Profiles, issued pairs, immutable public ballots, current private preferences, voter eligibility holds and moderation audit records stay in the private schema with RLS and revoked client table/helper access. RPCs validate ownership, active Auth sessions, confirmed email, bans, current participants and action quotas. An account can cast only its first public decisive vote on an unordered pair, across dates, devices and photo revisions. Later cycles affect private favourites only. Public votes are counted when accepted, independent of set completion. An account is not proof of a unique physical person; verified multi-account coordination remains a moderation concern.

A guest uses a UUID capability, expires under bounded maintenance and never becomes a public voter by logging in. Device favourites can be explicitly imported to the expected account, in idempotent batches, without adding public ballots or replacing existing account preferences. Server records and limits are authoritative when local storage is changed or unavailable.

The rating calculator is deployed privately as `this-that-ranking`. Its numerical implementation and tests must not be committed to this public repository. It accounts for opponents and bounds each account’s influence. Rebuilds use a service-only leased cutoff and two passes over paged immutable ballots; stale or incomplete calculations cannot publish. Bans, deleted accounts, eligibility holds and participant changes invalidate affected published places. Public responses contain places and provisional labels, without raw scores, ballots or voter identities. Cron sends only a signed, single-use request valid for one minute; the durable signing secret never enters the pg_net request queue. Supabase owns pg_net grants, so its `net` schema must remain outside the exposed Data API schemas. A database cron refreshes periodically; reads can request the same bounded refresh. No formula is rendered in the UI.

## Operations

Migrations: `20261019200201_this_or_that.sql` and `20261019202710_this_that_net_privacy.sql`. Requires Supabase Auth, pg_net and the existing pg_cron installation. Adds `hq-this-that-maintenance` without replacing gameplay maintenance. Guest admission and storage budgets are shared with normal/Time Attack. Old guest snapshots and completed old cycles are pruned; immutable account votes and private preferences remain.

Administrator-only RPCs `admin_this_that_voter` and `admin_this_that_person` support audited voter holds and revision-checked participant approval. Service-only refresh RPCs cannot be called by anonymous or authenticated browser clients. The Edge entrypoint performs its own project API-key/cron authentication, validates origins and bounded request bodies, and never returns service credentials or internal errors.

The new routes are `/this-or-that` (indexable initial HTML and sitemap) and `/this-or-that/play` (noindex, no-store). Login returns to the passive landing page. Gameplay capabilities and choices are not sent to analytics. Existing normal, Daily and Time Attack scoring and question statistics remain unchanged. Daily retains America/Chicago.

## Verification

Local SQL fixtures mock only platform Auth/pg_net/pg_cron infrastructure; application migrations and RPCs run in PostgreSQL/PGlite. GitHub Actions runs both legacy gameplay and This or That contracts in separate fresh PostgreSQL 17 services, including concurrent transactions. Browser fixtures use an isolated API origin and cover retries, reloads, tabs, neutral choices, photos, ten-pair stopping, imports, rankings, SEO and responsive layouts. Production verification uses passive reads, without QA votes or competitive results.

Validation before UI rollout: 540 browser regression scenarios plus two additional visibility/multiple-guest-tab scenarios pass locally; 72 local SQL checks pass with ten native concurrency cases covered by PostgreSQL CI. The private calculator/handler has 22 passing checks and a separate one-million-ballot stress run. Production migration and publication are verified separately.
