# Whalefall book-to-film guide — editorial record

Prepared on 2026-10-15 for the owner's explicit instruction to write and publish this article. This record covers the article only. A prepared branch is not a confirmed publication: the pull request must record successful CI, merge, Vercel production status and live HTTP/browser verification before the release is reported as complete.

## Reader task and search intent

- URL: https://hard-quiz.com/blog/is-whalefall-based-on-a-book
- Headline: Is Whalefall Based on a Book? A Spoiler-Free Guide to the Movie
- Search title: Is Whalefall Based on a Book? Movie & Novel Guide | Hard Quiz
- Primary query: `is whalefall based on a book`. Related questions: `whalefall book`, `whalefall movie based on`, `should I read whalefall before the movie`, `is whalefall a true story`.
- These are editorial query targets, not verified search-volume or ranking estimates. No guaranteed traffic is assumed.
- Reader benefit: an immediate answer, unambiguous original-edition information, the novelist's involvement in the screenplay, attributed adaptation insight, reading-order advice and explicitly US release information without ending spoilers.
- This complements the 2026 horror watchlist; it does not compete with that page's broad recommendations intent. The yearless URL can remain useful after theatrical release.
- No screening or full-book reading is claimed. The article identifies its source-based method and AI assistance. No fictional human author, rating or review schema is introduced.

## Fact checks

| Claim | Primary evidence | Editorial handling |
|---|---|---|
| Original novel by Daniel Kraus; MTV Books, August 8, 2023; US hardcover 336 pages, ISBN 9781665918169 | [Publisher's original hardcover](https://www.simonandschuster.com/books/Whalefall/Daniel-Kraus/9781665918169) and [author's book page](https://www.danielkraus.com/books/whalefall/) | Identify the original edition; a movie tie-in cover does not make the source novel a novelization. Publisher's reading guide contains spoilers. |
| Novel's short chapters, oxygen-pressure headings and shifts between the dive and family memories | [NPR interview, August 13, 2023, carried by Connecticut Public](https://www.ctpublic.org/2023-08-13/author-daniel-kraus-on-his-new-thriller-whalefall) | Paraphrase and attribute. Research with scientists is not presented as proof of a real survival case. |
| Brian Duffield directs; Duffield and Kraus co-write; Austin Abrams as Jay and Josh Brolin as Mitt; cast; October 16, 2026 US theatrical release; PG-13 | [20th Century Studios film page and official photo captions](https://www.20thcenturystudios.com/movies/whalefall) | Confirm only advertised premise and credits. No runtime, unannounced streaming date or worldwide release claim. |
| Flashbacks condensed for the screenplay | [Daniel Kraus interview by Emma Robertson, The Talks, October 14, 2026](https://the-talks.com/interview/daniel-kraus/) | Attribute to the co-writer. Avoid scene comparisons and exact counts based on an approximate interview remark. |
| Whale fall: a dead whale reaching the seabed and supporting other organisms | [NOAA](https://oceanservice.noaa.gov/facts/whale-fall.html) | Give the ecological definition without interpreting the ending. |

The article uses original wording and no direct interview quotations. Reading-order advice is editorial advice, not an official prerequisite. Conflicting interviews about the author's personal family experience are not used to label the story autobiographical.

## Images

The cover is an original code-drawn vector illustration of a book, filmstrip and abstract ocean. It is not a movie still, book-cover reproduction or synthetic portrayal of a real performer. Its visible caption identifies it as an illustration. The article also includes the owner-supplied film frame documented below.

- Editable source: `frontend/public/blog-assets/whalefall-book-to-film-cover.svg`.
- Article/list cover: `whalefall-book-to-film-cover.webp`, 1200 × 675, 29,922 bytes.
- OG/Twitter image: `whalefall-book-to-film-social.webp`, 1200 × 630, 30,210 bytes.
- The cover reserves its dimensions, loads eagerly and decodes asynchronously. Alt text describes the illustration rather than claiming it is a film still.
- Inline frame: `whalefall-coast-still.webp`, 1200 × 572, 41,092 bytes, preserving the uploaded frame's full composition. The image loads lazily and decodes asynchronously, with declared dimensions and descriptive alt text.
- Provenance: the owner supplied `image(6).png` and explicitly stated on 2026-10-15 that they made the frame and it may be used on the site. This statement and publication authorization are recorded in `docs/blog/whalefall-still.json`; no third-party license, photographer identity or independently verified authorship is invented.
- The frame sits in the movie-details section. Its caption describes a diver on the coast without naming a person from appearance or asserting when the scene occurs. No escape or ending detail is added.

### Image addition — 2026-10-15

The owner explicitly requested adding the supplied frame to the published article. Original PNG: 1600 × 763, 1,859,584 bytes. Prepared WebP: 1200 × 572, 41,092 bytes (97.8% smaller). The existing `FilmStill` component reserves the aspect ratio and limits the displayed height. This is a same-day image addition: the original publication date remains October 15, and no duplicate same-day update label is added. Film facts and the source-check date are unaffected.

The original article release is confirmed in [PR #28](https://github.com/ivoshchikov/movie-quiz/pull/28). Publication of this image addition must be confirmed separately by its own publishing PR, successful checks, merge, Vercel production status and live HTTP/browser checks.

Image-addition local validation passed: production build and SEO generation, both TypeScript projects, zero-warning ESLint, 66 existing blog/article browser scenarios, and direct checks of the new figure in generated HTML and at 1440/390/320 px. The frame decodes at its declared 1200 × 572 dimensions, keeps the full composition, loads lazily and does not cause horizontal overflow or page errors. Desktop and mobile screenshots were visually inspected.

## Publication decisions and checks

- Use the existing typed post registry, topic system and generated BlogPosting schema; no new publishing dependency or database change.
- Add the exact slug to both existing Vercel article allowlists, retaining unknown-article HTTP 404 behavior.
- Include the complete article in generated HTML, the five-item blog collection, sitemap and RSS. Feature it on the homepage. Shared tags also create an inbound related-article link from the horror watchlist.
- Link contextually to the horror watchlist, framing explainer, regular quiz and Daily Challenge. Preserve honest guest/account requirements.
- Update the blog's collection description to cover current guides rather than only the 2025 archive.
- Adapt existing collection, related-navigation, image-fallback and homepage expectations for the fifth article; do not add tests that duplicate static prose.
- Local validation: production build/SEO generation, both TypeScript projects, zero-warning ESLint, 104 existing targeted browser scenarios, including cross-site navigation, and direct checks of the new article's generated HTML, image dimensions, internal links and layouts at 1440/390/320 px. Release evidence belongs in the publishing PR once those checks and production verification finish.

## Maintenance

Recheck viewing availability when an official home-release announcement appears; record the region and source rather than predicting a subscription date. Keep the original publication date; use `modified` only for a substantive update. The book/adaptation answer needs little maintenance. Changes in cinema availability do not require rewriting the evergreen sections. No recurring job or automatic publication schedule is enabled by this release.
