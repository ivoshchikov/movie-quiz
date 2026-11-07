# Cloudflare staging deployment

Prepared 8 November 2026 (Asia/Nicosia) on `feat/cloudflare-staging`, based on
`88a840ca5ae703f99f3b9a5090bd0658428bfe4a`. This document describes roadmap task 3.
No custom domain, DNS change, paid plan or production cutover is included.

## Deployment status

- Configuration and local validation are prepared in this branch.
- The owner created `hard-quiz-staging` and connected this GitHub repository.
- The initial build failed with `Missing script: build:cloudflare`, using source
  without the staging scripts. On 8 November the owner confirmed the selected
  branch is now `feat/cloudflare-staging`, root `/frontend`, with the intended
  build/deploy commands and builds enabled.
- All seven GitHub Actions workflows for implementation commit
  `b7354dd0fb2ece956933b88575da27267e6c93f4` passed, including both full browser
  runs on Node 22. This follow-up records the setup and triggers a fresh branch build.
- Workers Builds completed successfully for `f45628214d14b5909912fcabaa0fa5150157cd5f`.
  The published site is https://hard-quiz-staging.i-voschikov.workers.dev/.
  Its public `seo-release.json` identifies that exact revision and the production
  canonical origin, and the HTTP noindex header is present. The homepage was also
  opened in Chrome: categories and difficulty settings loaded and the play button
  became available without starting a game. Roadmap task 3 is complete; full
  acceptance of gameplay, authentication and mobile performance remains task 4.
- The branch is not merged. Production continues to use Vercel.
- Supabase, game rules, RPC contracts and Daily's America/Chicago date are unchanged.

## Runtime and routing

`frontend/wrangler.jsonc` defines `hard-quiz-staging`, a Worker with Static Assets.
Existing files, including prerendered HTML, scripts, styles and images, use the
asset service directly. The Worker handles legacy social-image endpoints and
unmatched/error paths. `run_worker_first` is restricted to API and error paths;
it is deliberately not enabled for every request.

HTML handling drops trailing slashes. The build generates 301 redirects for all
33 existing `.html` entry URLs, retaining query parameters. Slash variants use
Cloudflare's native 307 normalization before serving the clean canonical URL.
Unknown paths return actual 404 responses: article-not-found HTML under `/blog/`
and the ordinary not-found page elsewhere. There is no catch-all index.html
response. `not_found_handling: none` leaves this distinction to the fallback
Worker; known assets still bypass it.

Game, profile and admin entry documents retain noindex/no-store. Login and profile
setup receive explicit noindex/no-store headers as well. These headers do not
replace Supabase authorization; existing authorization checks remain in place.
All static responses from this staging build carry `X-Robots-Tag: noindex,
nofollow`, including worker/version URLs. Worker-generated images and error
responses also carry noindex. This staging configuration must not be attached to
the production domain. A separately reviewed production configuration and workers.dev
exclusions are required at task 6.

**Host redirect is a cutover dependency:** `_redirects` does not support
domain-level matching. Before the domain switches, task 5 must prepare a Cloudflare
Redirect Rule for `www.hard-quiz.com` to `https://hard-quiz.com`, retaining path and
query, with status 308. Do not point www to this asset service without that rule.

## Social images and build identity

The normal npm postbuild still generates HTML, RSS and sitemap, then generates
five 1200×630 PNG cards using the existing `@vercel/og` renderer at build time:
three legacy article cards, a site card and a generic Daily card. Eight existing
article WebP covers remain intact. Browser and prerendered article metadata use
the same static URLs.

The lightweight `/api/og/post` handler maps published article titles to their
prebuilt image; unknown/custom parameters receive the general site card.
`/api/og/daily` serves a generic Daily card, without rendering arbitrary dates.
The current Daily page already uses the static Seo fallback. The existing Vercel
API source files remain available for rollback and the build-time renderer.

`WORKERS_CI_COMMIT_SHA` is recognized by the SEO generator, so `seo-release.json`
and public HTML identify the deployed commit. Source maps are excluded from the
Cloudflare upload. No Supabase server key or Cloudflare API token belongs in the
frontend bundle or repository.

## One-time owner setup

Use the ordinary browser where the Cloudflare session already works.

1. Open the account-level **Workers & Pages** screen, then **Create application**
   and the option to import/connect a Git repository. Select Workers (not Pages).
2. Connect GitHub if prompted. Prefer access to **Only select repositories**, then
   select `ivoshchikov/movie-quiz`. Complete the GitHub authorization in that browser.
3. Select that repository and configure these values before deploying:

   | Setting | Value |
   | --- | --- |
   | Worker/project name | `hard-quiz-staging` |
   | Git branch / production branch of this staging Worker | `feat/cloudflare-staging` |
   | Root directory / Path | `/frontend` |
   | Build command | `npm run build:cloudflare` |
   | Deploy command | `npm run deploy:cloudflare` |
   | Install command, if offered | `npm ci` |
   | Preview builds for other branches | Disabled for this initial setup |

   Cloudflare calls the selected branch the Worker's "production branch". Here
   that means only the temporary staging Worker; it does not move hard-quiz.com.
   If branch controls appear only after creation, set **Settings → Build → Branch
   control** to this branch, then push an update to that branch for a fresh build.
   Retrying an old build can still use its old source commit. Do not merge this PR to make an
   initially selected main build pass. Existing wrangler.jsonc must be used;
   automatic framework migration or an automatically generated configuration PR
   is not needed.
4. In **Build variables and secrets** (not runtime Variables & Secrets), enter:

   | Variable | Source/value |
   | --- | --- |
   | `NODE_VERSION` | `22` |
   | `VITE_SITE_URL` | `https://hard-quiz.com` (production canonical stays unchanged) |
   | `VITE_SUPABASE_URL` | Existing production value from Vercel |
   | `VITE_SUPABASE_ANON_KEY` | Existing public/anon key from Vercel |
   | `VITE_SUPABASE_BUCKET` | Existing production value from Vercel |

   The current values can be copied from Vercel → `movie-quiz` → Settings →
   Environment Variables, using the Production target. Copy the values directly
   between the two service panels; do not post keys in chat. Do not copy a
   `service_role`, database password or private signing key. Leave `VITE_GA_ID`
   empty for staging and do not enable `VITE_ANALYTICS_TEST_MODE`. The existing
   hostname guard also excludes staging from first-party production visit counts.
   Workers Builds can create its deployment token inside Cloudflare; no token
   needs to be shared with the assistant.
5. Deploy this branch using the Free plan. Leave custom domains and routes empty;
   use the generated `workers.dev` URL. No DNS/proxy changes are needed.
6. Return that exact URL and the build's successful/failed status. If it failed,
   share the error section with secrets hidden. If the form differs, share its
   settings screen with environment values hidden before submitting a different
   configuration.

Task 3's deployed URL, build revision, noindex and basic page loading were verified
on 8 November. Later branch commits automatically deploy again; the current
deployment and verification revision are recorded in PR #73 and the roadmap.
Real email/Google sign-in on that URL may
require an exact Supabase redirect allowlist entry, which is checked separately
at task 4; do not add broad wildcard domains preemptively.

## Local checks

Use Node 22 and the committed npm lockfile in `frontend/`:

```sh
npm ci
npm run build:cloudflare
npm run test:cloudflare
npm run lint
npm run typecheck
npm run seo:check
```

Local builds need the usual VITE Supabase configuration. Isolated CI/browser
checks use the existing fixture origin and never write game results to production.
The checked build supports these additional commands:

```sh
npx wrangler deploy --dry-run
npm run preview:cloudflare
```

Validation on 8 November: build and Worker TypeScript passed; eight HTTP integration
groups in workerd passed; lint and application TypeScript passed; 54 selected
Playwright cases passed (blog metadata/layout, guest journey and SEO); 16 publication
regression tests passed. The publication checker passed for 22 pages and 215 images.
The upload dry run bundled a 2.74 KiB Worker. This is local evidence, not a confirmed
Cloudflare deployment, a full task-4 acceptance run or a production performance result.
Local execution used the available Node 24 runtime; CI and the Cloudflare settings
pin Node 22. CI results and actual deployment evidence are recorded separately in the PR.

References checked 8 November 2026:
[build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/),
[branch control](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/),
[asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/),
[redirect limitations](https://developers.cloudflare.com/workers/static-assets/redirects/).
