# Cloudflare staging acceptance

Checked 8 November 2026 (Asia/Nicosia). Roadmap task 4 is **in progress**:
the automated frontend checks passed; a real Google/email sign-in round trip
still needs the owner. No production cutover is authorized by this document.

## Scope and isolation

- Hosted build: https://hard-quiz-staging.i-voschikov.workers.dev/,
  revision `498d665b635790494b345fcea838f09f6858216e`.
- Production comparison: https://hard-quiz.com/ on Vercel, main
  `88a840ca5ae703f99f3b9a5090bd0658428bfe4a`.
- The hosted application uses the existing Supabase project. Browser game tests
  replace Auth, REST/RPC, game images and the comparison ranking function with
  in-memory fixtures. A context-wide network guard aborts unhandled API calls
  and non-GET requests before network, including secondary tabs. Its negative
  control confirms an unmocked synthetic POST is stopped locally. Public
  frontend assets and GETs for this project's public Storage images may load.
- Fixture sign-ins use fake sessions only. The storage-key override is confined
  to Node-side test helpers; there is no application authentication bypass.
- Google Analytics requests are intercepted. No synthetic game attempt, answer,
  result, vote, email or production analytics event was sent by these tests.
- TLS validation remained enabled. The managed runtime's existing proxy CA was
  added to the test browser's trust store. This is an environment setup detail,
  not a change to site certificates or visitor security.

## Results

| Area | Observed result | Limit |
| --- | --- | --- |
| Home and discovery | Home, Movies, Actors, Actresses, TV Series, rules and blog load; visiting them does not start a game | Catalog/API responses are fixtures in interactive tests |
| Classic | Answer/retry, one accepted answer, timer/life expiry, explicit exit, reload and server result pass | Reload deliberately ends Classic under the existing rules; it must not resume it |
| Daily | Guest cannot see/start a question; a signed-in fixture starts explicitly; failed save, retry and reload preserve one result | Real account callback remains open; America/Chicago rules are unchanged |
| Time Attack | Correct answer, failed action/retry, skip, one-run restoration, image failure, deadline and result pass | Server behavior is simulated using the existing RPC contracts |
| This or That | Failed choice/reload/retry saves once; automatic progression completes exactly ten pairs | Votes and personal preferences exist only in memory |
| Result privacy | Classic/Time Attack results omit answer-image credits and credited-image galleries | This or That retains its public portrait credits |
| Rankings/profile/admin | Query-selected category/difficulty, responsive category select, ranking and profile render; non-admin cannot enter question administration | A fake signed-in account is used; no real profile is edited |
| Login | Email success/rate limit, correct staging return URL, OAuth cancellation and recovery pass | Does not prove email delivery, Google consent or the Supabase redirect allowlist |
| React navigation | Article open, reload, Back/Forward, game result navigation and query filters pass | www redirect belongs to the custom-domain cutover |
| Mobile | 390×844 game/start/result screens, 320×568 and 844×390 public screens show no horizontal overflow; screenshots inspected | Chromium emulation, not a physical iOS/Android device |
| HTML without JavaScript | All 22 published pages return readable English HTML, one H1/title/description/canonical, OG metadata, valid JSON-LD and the expected release marker | Staging intentionally carries HTTP noindex |
| Articles/assets | All 11 article bodies are present without JavaScript; public images requested during this check return no HTTP errors | Does not certify every offscreen/lazy image or commercial usage rights |
| Sitemap/RSS | Valid XML; production URLs retained; no workers.dev URLs | Staging must remain excluded from indexing |
| Routing/headers/social cards | Eight local workerd integration groups pass: published entries, all 33 legacy HTML redirects, private headers, true 404s, static/legacy social cards and worker execution rules | Hosted 22-public/11-private/33-redirect/5-error/6-image HTTP matrix was verified at task 3; this task rechecks hosted public HTML and interactive error routes |

The hosted functional suite passed **34/34** desktop/mobile cases, plus **2/2**
JavaScript-disabled public-HTML cases. Two focused mobile game cases also passed
after adding separate game/result screenshots. Full ESLint, application TypeScript,
eight Cloudflare integration groups and two existing Daily fixture regression
tests passed locally. Tests use the existing lockfile and Playwright installation.

One plain Python HTTP client received Cloudflare 403 / error 1010 on the staging
manifest while the unchanged standard Chromium test client loaded it successfully.
No user-agent spoofing, challenge bypass, WAF change or TLS bypass was used.
This observation does not establish how Googlebot or AdSense crawlers will be
treated on the later custom domain. Check that separately at cutover.

## Performance comparison

Three cold loads per host and viewport use the same mocked API, 150 ms emulated
latency, 1.6 Mbit/s down, 0.75 Mbit/s up and 4× CPU slowdown. Runs alternate host
order, disable cache and use fresh browser contexts. This is a frontend lab
comparison through the managed network proxy, not field Core Web Vitals or a
measurement of real Supabase latency. It does not produce an INP or Lighthouse score.

The initial desktop series contained two slow Cloudflare HTML responses. A
second desktop series investigated that variance; all original samples are
retained. The table uses six samples per host on desktop and three on mobile.

| Median | Vercel desktop | Cloudflare desktop | Vercel mobile | Cloudflare mobile |
| --- | ---: | ---: | ---: | ---: |
| HTML TTFB | 4.57 s | 4.85 s | 4.85 s | 4.57 s |
| FCP | 5.25 s | 5.42 s | 5.38 s | 5.13 s |
| LCP | 5.61 s | 5.77 s | 5.38 s | 5.13 s |
| CLS | 0.041 | 0.040 | 0.017 | 0.017 |
| Transferred bytes | 246,427 | 246,966 | 222,099 | 222,638 |

Cloudflare's median LCP differs by +0.17 s on desktop and −0.25 s on mobile.
Payload differs by about 0.5 KiB. No consistent substantial frontend regression
was demonstrated in this sample. Desktop LCP ranges still overlap broadly:
Cloudflare 5.08–8.21 s, Vercel 5.14–6.28 s. Long network/proxy waits dominate
these absolute timings; this is not evidence that either host meets field CWV
targets. Recheck the actual custom domain from an ordinary network at cutover.

[Raw samples and method](verification/cloudflare-staging-performance-2026-11-08.json)
contain all 18 page loads. Three performance test executions passed, each with
the same no-real-API/no-analytics guard.

## Remaining owner check

The connector has no Auth redirect-configuration getter and the Supabase dashboard
opened at its ordinary sign-in screen. The current allowlist was therefore **not
inspected**, and a real account round trip is **not yet verified**. Do not mark
task 4 complete solely because the login form and fixture session work.

1. Open the existing Supabase project's **Authentication → URL Configuration**.
   Keep **Site URL** at `https://hard-quiz.com`. Keep existing redirect entries.
2. Inspect **Redirect URLs**. If absent, add only these controlled staging URLs:

   ```text
   https://hard-quiz-staging.i-voschikov.workers.dev/
   https://hard-quiz-staging.i-voschikov.workers.dev/profile
   https://hard-quiz-staging.i-voschikov.workers.dev/daily
   ```

   Save. Do not allow arbitrary `workers.dev` subdomains. Google provider
   credentials and its existing Supabase callback should not be changed for a
   frontend hostname change. Remove temporary entries when staging is retired.
3. In a private browser window, open the staging homepage, choose **Log in** and
   **Continue with Google**, then use the existing account. Confirm the return
   stays on this exact staging hostname, the account menu/profile appears and
   a profile reload retains the session. Log out.
4. On staging `/login`, enter the existing account's email and choose
   **Send sign-in link**. Open the received link in that browser. Confirm the same
   staging host and authenticated profile after reload. Do not share the email's
   sign-in link, URL fragment, code or token.
5. Open staging `/daily`: **Start Daily** should be available after login, with no
   question displayed before starting. **Do not click Start Daily**: this is the
   real production database and would consume today's attempt. Log out when done.
6. Report whether Google and email each succeeded and which hostname they
   returned to. If something fails, report the ordinary error message and host,
   excluding sign-in secrets. If an email returns to production despite the
   allowlist, inspect the existing email template's RedirectTo/SiteURL behavior.

These checks create ordinary owner authentication sessions, not synthetic game
data. They do not require Cloudflare dashboard access or another manual deploy.
After both paths pass, record the result, close task 4 and begin the DNS/rollback
preparation of task 5. DNS and the production noindex change remain later tasks.

## Reproduce

From `frontend/`, after `npm ci` and the normal Playwright Chromium installation:

```sh
npm run test:acceptance
QUIZ_PERFORMANCE=1 npm run test:acceptance
npm run test:cloudflare
npm run lint
npm run typecheck
```

Run browser commands sequentially to avoid output cleanup and CPU contention.
The acceptance origin is restricted to this staging host or `http://localhost:8787`.
`QUIZ_TEST_SUPABASE_URL` only selects the fixture storage key. A local fixture
build can set it to `https://quiz-fixture.supabase.co` instead. Never add a real
service-role key or bypass the network guard to make an acceptance test pass.

Official references checked 8 November 2026:

- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Playwright network interception](https://playwright.dev/docs/network)
- [Google's LCP guidance](https://web.dev/articles/lcp)
