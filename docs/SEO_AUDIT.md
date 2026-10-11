# SEO-01 — technical audit and implementation

Date: 2026-10-11. Status: implemented; release verification pending.

## Confirmed findings and fixes

| Priority | Finding in the published site | Change |
| --- | --- | --- |
| High | `/play` and `/result` were in sitemap despite client-side noindex. These routes and `/profile` initially served indexable homepage metadata. | Dedicated generated HTML, noindex HTTP headers, no-store for session/account pages, exclusion from sitemap. |
| High | `/daily` and `/leaderboard` returned homepage metadata and an empty application root before JavaScript. Daily was absent from sitemap. | Shared route metadata, own canonical HTML, readable public content and navigation, Daily included in sitemap. No scores, identities, images or answers are baked into HTML. |
| High | `www.hard-quiz.com` returned HTTP 200 rather than redirecting to the canonical host. | Host-scoped 308 redirect preserving the path; verify query preservation on the published deployment. |
| Medium | Homepage and rules had no readable content before JavaScript. | Build-time rendering of existing homepage/rules components, including their native links. Difficulty settings remain live API data; no build-time database snapshot is introduced. |
| Medium | Ranking filter parameters entered canonical URLs. | Clean path-only canonical while filters remain in browser history and URL. |
| Medium | Every initial visit loaded game, article and administration code. | Lazy route modules; lightweight featured article metadata validated against its source. Daily and result initialization remain eager to preserve analytics and save behavior; the navigation guard stays before BrowserRouter. |
| Low | Favicon and Organization logo were the Vite mark. | Cinema icon using the existing visual vocabulary and matching Organization logo. Homepage WebSite markup added without unsupported search actions or invented ratings. |

## Already working

Blog listing and all three articles have readable generated content, canonical URLs, native links, article metadata, BlogPosting/BreadcrumbList markup and real publication/modification dates. Monthly 2025 guides are explicitly archived; their URLs and historical dates stay intact. Existing missing-page routes return HTTP 404 with noindex. Images reserve dimensions and use finite fallbacks; article/illustration descriptions and mobile reflow are already covered by regression tests. robots.txt permits crawling so bots can read noindex directives. RSS retains the existing article URLs. Hashed assets use Vercel caching.

## Verification and limits

Local verification: 459 Chromium scenarios passed without retries, including eight new SEO checks. Production build, TypeScript and lint passed. Initial compressed JavaScript is 158.55 kB versus 188.81 kB before this change (about 16% less); base CSS is 12.02 kB versus 20.07 kB (about 40% less). These are initial bundle sizes, not all-route download totals. Generated HTML with JavaScript disabled, browser navigation and regression scenarios are checked. Route CSS is included in generated HTML to style content before lazy JavaScript loads. Repeated SEO generation must retain one canonical and one main heading. Build rendering uses inert placeholder configuration and never requests production data or starts attempts.

Search Console data and URL inspections were reviewed privately; account reports are not copied to this public repository. Search Console performance is too sparse and recent to attribute changes to a release. Sitemap reports are not a complete current indexed-page inventory. Browser observations through the automation proxy are lab checks, not field Core Web Vitals or evidence of improved rankings. No valid production INP distribution is claimed.

Follow-up: monitor recrawling and Search Console performance after deployment, assess field performance when sufficient data is available, and develop new film/series articles in the separate blog workflow. New content and traffic growth are ongoing work; this technical release does not promise indexing or ranking gains.

## References

- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/core-web-vitals
- https://vercel.com/docs/project-configuration/vercel-json
