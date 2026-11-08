# Hard Quiz DNS cutover and rollback

Prepared 8 November 2026 (Asia/Nicosia), roadmap task 5; production preparation
continued in task 6. **DNS preparation is complete; the cutover is pending.** DNS, certificates, rules, domain
bindings, billing and Supabase were not changed. Production is still on Vercel.

## Verified baseline

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
An existing CNAME on the exact hostname prevents Custom Domain creation; the
current apex has an A record. Review Cloudflare's proposed replacement of that
web record during the actual cutover, preserving unrelated records.

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

[Rule object](cloudflare-www-redirect-rule.json) is a **disabled draft**. It has
not been submitted to Cloudflare or validated by its account-side rule parser.
Its documented syntax is prepared for the zone's Single Redirects phase
`http_request_dynamic_redirect`; it is one rule, not a replacement ruleset.

| Dashboard field | Value |
| --- | --- |
| Name | `Hard Quiz: canonical host and HTTPS` |
| Match | Custom filter expression |
| Filter | `(http.host eq "www.hard-quiz.com") or ((http.host eq "hard-quiz.com") and (http.request.scheme eq "http"))` |
| Action | Dynamic URL redirect |
| Target expression | `concat("https://hard-quiz.com", http.request.uri.path)` |
| Status | `308` |
| Preserve query string | Enabled |
| Order | Before conflicting broader host redirects; preserve unrelated rules |
| Activation | At task 6, after account review, before the www proxy change |

Task 6 extends the task-5 www draft to also cover HTTP apex in the same rule.
It matches www on both protocols and apex only on HTTP, so the HTTPS apex target
does not redirect back to itself. The encoded path and query must be checked
after deployment; this is a prepared rule, not an account-validated claim. Preserve query string must be
selected explicitly. Keep `.html` and trailing-slash normalization in the asset
configuration already tested at task 4.

## Required preflight immediately before cutover

The cloud dashboard still shows its sign-in error; no usable Cloudflare
connector was found. Private current zone settings, rules, rule-slot usage and
edge-certificate status were **not read**. The owner-supplied full export and
fresh public checks establish the baseline, not an authenticated account audit.
The following task-6 checks are therefore mandatory before applying the plan:

1. In the owner's ordinary Cloudflare browser, open **hard-quiz.com → DNS →
   Records → Export**. Retain a fresh complete export. Compare the three records
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

Task 5's snapshot, live checks, exact intended changes, redirect draft and
recovery procedure are prepared. The zone and Vercel service are untouched.
Private account preflight and every actual switch are task 6 work. No additional
owner upload is required to record this preparation; a fresh account-side check
is required before executing it. Task 5 cost is $0. The intended Custom Domain,
native redirect and Free hosting use no paid add-on within the selected limits.

Official sources checked 8 November 2026:

- [Workers Custom Domains, certificates and hostname matching](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Single Redirect settings and API shape](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/)
- [Originless redirect DNS](https://developers.cloudflare.com/fundamentals/manage-domains/redirect-domain/)
- [Dynamic redirect retaining the URI path](https://developers.cloudflare.com/rules/url-forwarding/examples/perform-mobile-redirects/)
- [DNS TTL and cache behavior](https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/)
- [Cloudflare DNSSEC](https://developers.cloudflare.com/dns/dnssec/)
