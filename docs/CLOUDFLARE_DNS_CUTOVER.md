# Hard Quiz DNS cutover and rollback

Updated 8 November 2026 (Asia/Nicosia). **The production cutover and owner login
are accepted.** The apex is attached to production Worker `hard-quiz`; www is
proxied and redirects to the HTTPS apex. Vercel has been paused after the owner
confirmed task 7's fresh login/profile/admin/reload check. It is retained for
deliberate recovery and must be resumed and tested before a Vercel DNS rollback.
Supabase and paid-plan settings were not changed. The executed-cutover table
below records the historical source/state at task 6; later release identifiers
and final acceptance are recorded in the retirement PR and roadmap.

## Recovery after Vercel retirement

Prefer a known-good Cloudflare Worker version while keeping the active Custom
Domain and DNS. Do not assume the former Vercel host is still publicly serving.
If Vercel recovery is explicitly required:

1. Select only project `prj_QcOLD9LBfw6KIiIbjJKERx2G0ZxF` in team
   `ivans-projects-a806f387`. Its retained pre-retirement production artifact is
   `dpl_2gueX1g51GEgQZUakvuH7Et5VTMw`, source
   `758388a8e96d5a7ffe8d3bf9d5372c15248a55de`.
2. Resume the paused project through Vercel, then verify the intended artifact,
   real responses and domain associations on its direct production alias before
   touching the canonical domain. Standard Protection for old/preview URLs stays.
3. Existing-artifact recovery does not require Git auto-deployment. Re-enable
   `git.deploymentEnabled` and previews only if intentionally returning to that
   workflow; review/rebuild/test any new artifact before switching traffic.
4. Only after Vercel is verified ready, follow the existing narrowly scoped
   DNS/Custom-Domain/rule restoration steps. Preserve Google TXT, nameservers
   and DNSSEC. A paused 503 or an auth wall is not a successful rollback target.

No rollback or production DNS restoration was simulated during retirement.

## Executed cutover — 8 November 2026

The owner connected the Cloudflare plugin and explicitly instructed execution.
Authenticated preflight found no Page Rules, configured Bulk Redirects or Worker
Routes that conflict with the change. The saved Single Redirect was reused.
The private pre-cutover export SHA-256 is
`e5769fab441247ce52536501b20d735f25afc20fddc57eaa332ebcc3ebe90e6f`;
its verification TXT is intentionally absent from this repository.

| Object | Verified state |
| --- | --- |
| Production revision | `ecd124edabfb955bae4922932a2d51ac54a92fd4` |
| Worker version | `a4cacd63-b07c-4935-8c62-ffe2ad7a98b3`, 100%, production profile |
| Apex Custom Domain | `445bed337745a1df046c828bf6feb3114dbbeca6`; hard-quiz; production; enabled; attached 12:01:05 UTC |
| Managed apex DNS | AAAA `100::`, Proxied/Auto; record `1febc8f992cad456cfbad48f02111940`, provider-managed/read-only |
| www DNS | A `192.0.2.1`, Proxied/Auto; record `cab73eceb320badb49673e87f9b817b1`; changed 12:12:14 UTC |
| Canonical rule | Enabled; ruleset `47a0c52fc6d84e16a2e38c575266d889`, rule `82e415f53f5f48e2bf000dcc6183c8db`; 308; original path/query retained |
| TLS | Custom Domain certificate `8e329e98-40bf-4df3-a244-654c2ef640e9` and Universal SSL active; www covered |
| Recovery deployment | Vercel `dpl_C2zwGP984WRysZqqg4syquA2wrKD`, READY; same revision; both domain associations retained |
| Preserved records | TXT content/TTL and nameservers unchanged; DNSSEC active and publicly validated |
| Alternate Worker hosts | workers.dev and preview URLs remain disabled |

API attachment returned 409 while the original externally managed apex A existed.
After rechecking the exact backed-up A, the assistant deleted only that record
and immediately attached the Custom Domain. The code included restoration of the
original A if attachment failed; no recovery was needed. The resulting managed
AAAA value is Cloudflare's output, not a manually chosen origin. The included
Custom Domain flow provisioned its certificate automatically; no ACM purchase
or paid plan was requested.

Acceptance evidence completed at 12:26 UTC: **17 HTTP checks from Cloudflare and
14 DNS checks across Google and Cloudflare resolvers passed**. Revision,
production profile without fixtures, public canonicals/indexing, private
noindex/no-store, true root/blog 404, HSTS, JS/image assets, robots, sitemap and
RSS were verified. www article redirects finish in one hop; a legacy HTML URL
finishes in two hops after its existing normalization. Encoded `a%2Bb` is
preserved. Each selected HTTP response has a Cloudflare marker; retries and
earlier cached Vercel responses do not establish that every client DNS cache
has converged.

Chrome rendered the homepage with four categories/difficulties and the article.
A later browser-service timeout prevented visual www confirmation; HTTP verified
that redirect and its final page. No synthetic games were started. Real owner
sign-in, analytics delivery, performance and release-workflow acceptance remain
task 7 work. [Sanitized evidence](verification/cloudflare-cutover-2026-11-08.json).

## Historical task-5 baseline

The owner's complete zone export, dated `2026-11-07 22:00:36 UTC`, contains three
editable records. Its SHA-256 is
`c94ca0d84ca68778f76f469e4eceb84955947e81b13e314a7e0224a4785477bf`.
Retain that private original; this document does not publish its verification TXT.

Google Public DNS and Cloudflare DNS-over-HTTPS returned matching website
records on 8 November. All 28 requested DNS queries succeeded. Root A, NS, TXT,
DS and DNSKEY answers validate with AD=true at both resolvers; the www CNAME
answer also validates. Verisign's parent RDAP reports a signed delegation with
the same DS. The complete www A-chain includes an external Vercel hostname;
its AD=false does not establish a broken signature on the signed www CNAME.

| Record | Current value | Proxy / configured TTL | Public observation |
| --- | --- | --- | --- |
| A `hard-quiz.com` | `76.76.21.21` | DNS only / Auto | 300 seconds at both resolvers |
| CNAME `www` | `movie-quiz-navy.vercel.app` | DNS only / Auto | 300 seconds at both resolvers |
| TXT `hard-quiz.com` | Existing `google-site-verification` value | DNS only / 3600 | Exact value matches the owner export |

- Authoritative nameservers: `lou.ns.cloudflare.com`, `nina.ns.cloudflare.com`.
  The cutover does not transfer the zone, registrar or nameservers.
- There is no root AAAA, MX or CAA record in the checked answers/export. Preserve
  any additional records found in a fresh pre-cutover export; public DNS queries
  cannot enumerate every possible hostname.
- SOA/NS/DNSSEC records are provider-managed. Differences in SOA serial/TTL from
  the archived export are not instructions to restore those service records.
- Vercel reports both domains verified and the current A configuration valid
  (`misconfigured=false`). Its newer recommended IP addresses are optional;
  they are not this migration's rollback target.
- Pinned Vercel production: `dpl_FPYzrTukJGk9w8ncUBiNDpas19bm`, READY, main
  `88a840ca5ae703f99f3b9a5090bd0658428bfe4a`. Its public production alias
  `https://movie-quiz-navy.vercel.app/` returns 200. Refresh this baseline if main
  or the live deployment changes before task 6.
- `https://hard-quiz.com/` returns 200, its production canonical, no HTTP noindex,
  and `Strict-Transport-Security: max-age=63072000`. Its release manifest matches
  the pinned revision. An article returns 200 and an unknown page returns 404.
- HTTPS www requests return 308 to the apex, preserving path and query, including
  an encoded `a%2Bb` value. This redirect is currently served by Vercel's first
  host rule in `frontend/vercel.json`, not an observed Cloudflare rule.
- Plain HTTP currently returns 308 to HTTPS. HTTP www then uses the HTTPS www
  redirect, so two hops are normal in that baseline. An initial Playwright HTTP
  proxy reset was resolved by read-only curl requests using the inherited proxy.

[Recorded observations](verification/cloudflare-dns-baseline-2026-11-08.json)
distinguish the archive, live DNS, HTTP, Vercel metadata and access limits.

## Task 6: intended changes

The separate production configuration, build/deploy commands, artifact guard and
owner setup are prepared in [CLOUDFLARE_PRODUCTION.md](CLOUDFLARE_PRODUCTION.md).
The source config has no domain routes; first deployment does not replace DNS.

Use a **production Worker with Static Assets**, proposed name `hard-quiz`, with
an exact Custom Domain `hard-quiz.com`. This production Worker is not created by
task 5. Keep the existing `hard-quiz-staging` Worker separate and noindex.

Custom Domains are appropriate because the Worker serves the site itself.
Cloudflare creates the domain's DNS record and certificate. Do not manually
CNAME the apex to a `workers.dev` URL or invent the managed record's value.
The attachment API rejects an externally managed web record on the exact
hostname, including the original apex A. The executed sequence above removed
only that backed-up A immediately before attachment and kept a guarded recovery
path. Preserve unrelated records during any future change.

| Record / setting | Intended operation at cutover | Restore value / behavior |
| --- | --- | --- |
| Apex A to Vercel | Replace through the production Worker's **Add Custom Domain → hard-quiz.com** flow; accept only the intended web-record change | A `76.76.21.21`, DNS only, Auto |
| www CNAME to Vercel | After the redirect and certificate are ready, replace with A `192.0.2.1`, **Proxied**, Auto | CNAME `movie-quiz-navy.vercel.app`, DNS only, Auto |
| Google TXT | Keep the exact existing value and TTL 3600 | Preserve unchanged |
| Other records discovered in the fresh export | Retain; reconcile any conflict before proceeding | Restore only a specifically changed record |
| NS, DS, DNSKEY, DNSSEC and registrar | Leave the current delegation and DNSSEC management in place | No registrar or DNSSEC rollback operation |
| www redirect | Enable the reviewed single redirect before proxying www | Keep it available while www may still reach Cloudflare; see rollback order |
| HTTPS / HSTS | Serve a valid certificate for apex and www; retain the current HSTS behavior | Vercel HTTPS must remain usable |

`192.0.2.1` is an originless placeholder, **not a web server**. The proxied www
record brings requests to Cloudflare, where the redirect must terminate them.
It must never depend on a request succeeding at that address. An apex Custom
Domain does not automatically handle www.

The known TTL is already 300 seconds; no preliminary TTL edit is needed. DNS/client caches can retain data beyond that interval. Do not promise a fixed
cutover or recovery duration based on TTL alone.

## Prepared canonical-host and HTTPS redirect

[Rule object](cloudflare-www-redirect-rule.json) remains a **disabled import
template**. The corresponding live rule was validated, saved and enabled for
this cutover, as recorded above. It belongs to
`http_request_dynamic_redirect`; do not overwrite the zone's unrelated rules.

| Dashboard field | Value |
| --- | --- |
| Name | `Hard Quiz: canonical host and HTTPS` |
| Match | Custom filter expression |
| Filter | `(http.host eq "www.hard-quiz.com") or ((http.host eq "hard-quiz.com") and (not ssl))` |
| Action | Dynamic URL redirect |
| Target expression | `concat("https://hard-quiz.com", http.request.uri.path)` |
| Status | `308` |
| Preserve query string | Enabled |
| Order | Before conflicting broader host redirects; preserve unrelated rules |
| Activation | At task 6, after account review, before the www proxy change |

The HTTP condition uses `(not ssl)`. Cloudflare documents `ssl` as the Boolean
field for an encrypted client connection. The dashboard rejected the previous
`http.request.scheme` identifier; the corrected filter still requires the
account-side validation before activation; that validation and activation are now complete.

Task 6 extends the task-5 www draft to also cover HTTP apex in the same rule.
It matches www on both protocols and apex only on HTTP, so the HTTPS apex target
does not redirect back to itself. The encoded path and query must be checked
after deployment; those live checks passed for this cutover. Preserve query string must be
selected explicitly. Keep `.html` and trailing-slash normalization in the asset
configuration already tested at task 4.

## Required preflight immediately before cutover

This checklist was completed through the owner's connected Cloudflare plugin
before the executed cutover. Recheck current authenticated account state before
a future switch; historical public DNS observations alone are insufficient:

1. Export DNS through the connected API, or **DNS → Records → Export** in the
   dashboard. Retain the private complete export. Compare the three records
   above and preserve any additions. If anything differs, update the change and
   rollback list first. Do not import the old export wholesale.
2. In **Workers & Pages**, prepare the production Worker and its Git publication
   path. Check **Domains & Routes** and the zone's **Workers Routes** for existing
   matching routes. Resolve any route that would intercept the intended app.
3. Prepare and test the production artifact: public production pages must allow
   indexing, private/error pages must retain their exclusions, and alternate
   `workers.dev`/preview URLs must not become indexable copies. The staging
   artifact has global noindex; the separate production artifact is prepared and
   locally tested, but its actual service/domain binding must still be checked.
4. In **SSL/TLS → Edge Certificates**, inspect certificate coverage and status.
   The www redirect needs an **Active** certificate covering `www.hard-quiz.com`,
   usually the zone's Universal SSL certificate. Before the apex change, require
   an existing active edge certificate covering `hard-quiz.com` too. Creating the
   Custom Domain provisions its certificate; inspect that binding/certificate
   after attachment, before proceeding to www. Use the included certificate
   facilities; do not buy Advanced Certificate Manager for this plan. Inspect
   the existing HTTPS/HSTS settings. The prepared native rule explicitly upgrades
   HTTP apex as well as redirecting www; avoid conflicting HTTPS/host rules.
   Workers Custom Domains do not need a separate Vercel origin TLS connection.
5. In **Rules → Redirect Rules**, inspect Single/Bulk Redirects and relevant
   legacy Page Rules. Check the free rule slot and conflicts. Add this single
   rule without replacing existing unrelated rules, validate it in the dashboard,
   then enable it while www is still DNS only. It becomes effective when www
   uses the proxy. If an existing rule already performs exactly this operation,
   reuse the reviewed rule instead of making a duplicate.
6. Reconfirm the Vercel production deployment and both domain associations are
   retained. Keep Vercel available until task 7 acceptance. Supabase, Google Auth,
   the production Site URL, analytics identity and existing URLs stay in place.
7. Attach the apex only after the production configuration and pre-existing
   edge-certificate/rule checks are ready. Immediately verify valid HTTPS,
   content, indexing headers and a healthy binding. If provisioning or serving
   fails, restore the original apex A before proceeding. Change www only after
   apex acceptance succeeds. Snapshot Cloudflare's resulting managed-record/
   binding identifiers for a precise reversal.

The existing GitHub integration publishes staging automatically. Its build token
is not evidence that the assistant can read or edit zone settings. No new token
or password needs to be pasted into chat for this preparation.

## Acceptance after the task-6 switch

| Check | Required outcome |
| --- | --- |
| `https://hard-quiz.com/` and a known article | 200, correct content/canonical, expected production release, no global noindex |
| `https://www.hard-quiz.com/` | 308 to `https://hard-quiz.com/` |
| HTTPS www article with `?utm_source=check&x=a%2Bb` | 308, same path and query, then the real article |
| HTTP apex and HTTP www | HTTPS destination, no loop; query retained |
| www legacy `/movie-quiz.html?category=1` | Host redirect followed by the existing clean-URL normalization; query retained |
| Unknown apex and blog paths | Real 404, not a successful SPA fallback |
| TLS/HSTS | Valid HTTPS on both hosts; current HSTS preserved |
| DNSSEC/TXT | Signed delegation still validates; verification TXT unchanged |
| Robots/sitemap/RSS and private routes | Public canonical URLs retained; staging/private exclusions still work |
| Real owner Google/email return and analytics | Same production origin and expected tracking configuration; no synthetic game attempts |

Certificate errors, redirect loops, sustained 5xx, a wrong release, global
noindex on public production pages or broken owner sign-in require recovery
before continuing to monetization. Check with ordinary, TLS-validating clients;
do not disable certificate checks to make acceptance pass.

## Recovery to the current Vercel site

This is a reviewed procedure, **not an executed production rollback drill**.
Use the recovery deployment and revision from the executed-cutover section,
not the older historical task-5 deployment.

1. Stop further cutover changes and check the pinned Vercel build is READY. If
   the project's production alias moved to a different/broken deployment, first
   restore the previously recorded good production deployment through Vercel's
   normal rollback/promote flow. No such action is needed now.
2. Detach only `hard-quiz.com` from the production Worker's Custom Domains. Inspect
   the resulting DNS record; remove only the Worker-managed apex record if it
   remains and conflicts. Restore A `hard-quiz.com` → `76.76.21.21`, **DNS only**,
   **Auto**. Do not delete the Worker, unrelated records, TXT, NS or DNSSEC keys.
3. Restore www: remove only its placeholder A, create CNAME `www` →
   `movie-quiz-navy.vercel.app`, **DNS only**, **Auto**. Keep the new www redirect
   available while requests may still reach Cloudflare; do not disable it while
   www still points at the originless placeholder. Restore its prior disabled/
   absent state later, once propagation and recovery checks are satisfactory.
4. Retain issued certificates during recovery. Removing a Custom Domain does
   not automatically remove its certificate; certificate cleanup can wait until
   the site is stable. Do not change NS, the registrar or the parent DS record.
5. Check both resolvers for the original A/CNAME and continuing DNSSEC validation.
   Check apex 200, www 308 with the query retained, the known article, real 404,
   the Vercel release marker and absence of public noindex. Cached Cloudflare
   addresses can outlive the nominal TTL; recovery is verified from observed
   responses, not declared complete after a five-minute timer.
6. Verify the owner's existing session/login and the original tracking setup.
   There is no Supabase data or schema rollback in a frontend-hosting reversal.

Never restore the archive's SOA/NS records, disable DNSSEC, or replace the entire
zone as a shortcut. Restore the two web records and only the rules/binding changed
by this cutover. This recovery target is the current ad-free Vercel build; review
the baseline again if application or monetization behavior changes later.

## Status and cost

Task 6's domain switch and targeted acceptance are complete; task 7 is next.
The two web records, one domain binding and the reviewed rule were changed.
Vercel remains READY as the fallback. TXT, NS/DNSSEC, Supabase, game behavior,
analytics identity and ads settings were preserved. No paid add-on or plan was
activated; Free hosting remains the selected configuration within its limits.

Official sources checked 8 November 2026:

- [Workers Custom Domains, certificates and hostname matching](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Single Redirect settings and API shape](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/)
- [Originless redirect DNS](https://developers.cloudflare.com/fundamentals/manage-domains/redirect-domain/)
- [Dynamic redirect retaining the URI path](https://developers.cloudflare.com/rules/url-forwarding/examples/perform-mobile-redirects/)
- [DNS TTL and cache behavior](https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/)
- [Cloudflare DNSSEC](https://developers.cloudflare.com/dns/dnssec/)

- [Client encryption Boolean field (`ssl`)](https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/ssl/)
