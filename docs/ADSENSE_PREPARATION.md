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

## Account checks and remaining gates

Record account-specific onboarding, verification, policy and settings observations
in the private owner report. Payment-recipient, postal, identity, tax and bank
information do not belong in public source, policy pages or screenshots. Any
required personal or payment decision remains with the owner.

Keep advertising off during preparation. Before activation, verify the persisted
Auto ads and auto-optimization settings against the agreed launch plan and obtain
specific authorization for any required account change. An unsaved preview
control does not prove that a dashboard setting changed.

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
