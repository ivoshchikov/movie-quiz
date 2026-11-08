# AdSense ownership preparation — stage 10

8 November 2026. Use the existing Hard Quiz AdSense account. The signed-in
account and its site verification screen confirm publisher
`pub-7817531684692124`; do not create a replacement account.

## Source and release

- `frontend/index.html` contains the account's exact passive verification tag:
  `<meta name="google-adsense-account" content="ca-pub-7817531684692124" />`.
  Vite and the existing prerender generator preserve it in the first-response
  HTML of the homepage, blog, articles and other generated pages.
- `frontend/public/ads.txt` is the account's direct-seller record at the root:
  `google.com, pub-7817531684692124, DIRECT, f08c47fec0942fa0`.
  It must serve HTTP 200 and `text/plain`, including crawler requests and browser
  navigation, instead of an application fallback.
- No advertising loader, ad slots, refresh logic, CMP or ad requests are added.
  A verification meta tag and seller record do not serve advertisements. Consent
  management remains stage 11; requesting review remains stage 12.
- Release through the existing PR/CI/main/Cloudflare path. The isolated staging
  and production workerd suites check the served HTML/tag and root file. Actual
  merge, deployment, live HTTP results and Google account results belong in the
  PR and owner roadmap; source preparation alone is not publication or approval.

## Observed account state and remaining gates

The initial live account check on 8 November shows `hard-quiz.com` requires
review and `ads.txt` is not found. Payment onboarding reports a completed
individual Cyprus profile. No identity/address verification is currently
requested; the verification page says that personal-data checks may be required
at the verification threshold. Policy Center currently lists no serving-related
violations; that does not establish site approval or image-rights clearance.
Recipient and postal details stay in the private payment
profile; do not copy them into source, policy pages, screenshots or reports.
Physical delivery to that address requires the owner's confirmation when
needed; reading a populated field cannot establish delivery.

Auto ads are off. Site-level auto-optimization is on, with automatic application
of winning experiments and 50% experiment traffic. A proposed change was not
saved; switching it off requires the owner's specific confirmation before
launch. Do not claim it is disabled based on an unsaved preview control. Keep
advertising off and check the persisted settings before any future activation.

Google's recognition of the file and ownership, site review status and account
tasks are separate from a successful HTTP fetch. Use the existing site entry;
do not remove/re-add it or request review to force a refresh. A crawler response
with a named Google user agent is a local accessibility probe, not evidence of
an actual Google crawl. Record the exact dashboard status after publication.

The owner's stage 8 image decision and stage 9 approved Sound Media/email
wording remain in effect. The open controller-identification question is not
resolved by AdSense technical preparation.

## Primary references checked 8 November 2026

- [Connect a site and use a meta tag](https://support.google.com/adsense/answer/12169212?hl=en).
- [Site and ads.txt statuses](https://support.google.com/adsense/answer/12170222?hl=en).
- [ads.txt guide and recheck](https://support.google.com/adsense/answer/12171612?hl=en).
- [Crawler access to ads.txt](https://support.google.com/adsense/answer/7679060?hl=en).
