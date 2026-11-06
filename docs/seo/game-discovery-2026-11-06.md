# Game category discovery — 6 November 2026

## Problem and resulting behaviour

Classic offered Movies, Actors, Actresses and TV Series only through a client-loaded selector. Public HTML explained the modes, but did not offer category-specific destinations. Search visitors could not land directly on a named category with useful instructions and the matching setup.

Four public, playable category pages now use the existing Classic flow:

| URL | Live catalog name | Main task |
| --- | --- | --- |
| `/movie-quiz` | `All movies` | Identify a film from a still |
| `/actor-quiz` | `Actors` | Identify an actor from a photo |
| `/actress-quiz` | `Actresses` | Identify an actress from a photo |
| `/tv-series-quiz` | `TV series` | Identify a show from a still |

Each page has a distinct title, description, H1, recognition guide and questions based on the actual rules. Its setup resolves the category by name from the live catalog, rather than assuming database IDs. A conflicting query string or navigation state cannot switch the Play button to another category. Missing categories, unavailable question counts and empty pools cannot enable Play.

## Delivery and navigation

- One category definition supplies React routes, category metadata, readable prerendered HTML and sitemap entries. The server response includes the guide and ordinary category links before JavaScript loads.
- The shared Classic setup still checks the catalog and question count in the browser. Reading a page never starts a game. The Play button explicitly enters the existing `/play` flow.
- Category pages include WebPage and BreadcrumbList structured data, clean canonical URLs and social metadata. Vercel serves each generated HTML document and redirects its technical `.html` alias.
- The home page introduces all four categories and links to their pages. How to Play and related-category links expose the same hierarchy. Article footer links lead directly to movie, actor and TV quizzes and preserve the existing article-to-game attribution.
- The initial Time Attack description now names all four supported categories. Public game pages remain indexable; active sessions, results, accounts and administration retain their existing noindex policy.
- Four new entries join the publication registry. Their Google status starts as `unknown`. HTTP delivery checks, inclusion in a sitemap and availability without JavaScript do not establish Google indexing or ranking.

## Verification

Run the existing typecheck, lint, build and publication checks in `frontend/`. `tests/game-category-pages.spec.ts` checks all four launches with nonstandard catalog IDs and conflicting parameters, no automatic game creation, unavailable categories, HTML without JavaScript, canonical metadata, breadcrumbs, routes and mobile navigation. `tests/analytics.spec.ts` covers a direct article → category → three-answer qualified game alongside the existing article → game hub flow.

The release must pass all required PR checks and be verified against the exact production revision using `npm run seo:check -- --url https://hard-quiz.com --revision <full-sha>`. Local checks use the isolated fixture origin; production checks read HTTP and image responses without executing gameplay. No database schema, game rules, scoring, analytics qualification or Daily reset timezone changes are part of this release.

## Measurement and next decisions

The private SEO report retains the dated Search Console and GA4 baseline. Named category queries are targeting hypotheses, not measured search-volume claims. After release, inspect the four URLs in Search Console when URL Inspection is available. Compare settled 28-day periods by landing URL and query intent, and assess organic sessions with qualified games separately from event counts. Do not infer non-indexing from absent query rows or promise a ranking position.

Check delivery after one day, early discovery after seven days and search performance after 28 days. These are review checkpoints, not new scheduled jobs. Existing editorial deadlines, the postponed project-information work and separately authorized external promotion retain their current status.

## Primary references

- [Google: JavaScript SEO, links and prerendering](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: helpful, reliable content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google: doorway abuse](https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse)

The pages are usable category destinations with an actual matching setup, rather than intermediate keyword pages that only forward to a generic game hub. No fabricated reviews, ratings, question-bank sizes or category-specific rich-result promises are added.
