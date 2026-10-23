# Mobile performance and responsive images — 23 October 2026

The owner deferred roadmap stage 5 (About, Contact and Editorial Policy) and requested stage 6. This change sizes existing illustrations for their actual display slots. Publication and the final production comparison are recorded in the pull request; this document does not assert an unverified deployment.

## Scope

- Sixteen existing posters in the August and September 2025 archives now have local WebP variants at 160, 320 and 640 pixels. The two archive listing covers also have 960-pixel variants.
- The existing public Classic/Time Attack preview still has 320, 640 and 960-pixel variants, replacing a 3324×1848 image in a small illustration. Game question images and database records are unchanged.
- `responsiveImages.json` maps the existing editorial URLs to these display assets. `ArticleImage`, `MovieBlock`, `ListingCover` and `ModePreview` supply `srcset`, display-specific `sizes` and actual intrinsic dimensions. Existing layout ratios, alt text, captions, sources, fallback behavior and original editorial URLs are retained.
- Article posters remain lazy. A first listing cover remains eager and receives a high fetch priority; subsequent listing covers remain lazy. The React 18-compatible lowercase attribute is intentional.
- Image resizing is a technical change: original publication and substantive editorial modification dates are retained. Canonicals, social previews, article copy and game rules are unchanged.

## Assets and quality

The sixteen original posters total **5,930,034 bytes**; their 320-pixel variants total **481,408 bytes**, a **91.9% reduction** for those selected files. The preview original is **211,344 bytes**. These figures describe image payloads, not a whole-page speed improvement.

The inventory records original URL, dimensions and SHA-256, plus bytes/dimensions/SHA-256 for every variant: [responsive-image-inventory.json](responsive-image-inventory.json). The 53 added files total **2,437,476 bytes**; browsers select one candidate for each displayed image. They do not download the full set. Variants preserve the existing full image, with Lanczos resizing and WebP quality 84/method 6. No source is upscaled. At the actual poster display sizes, a side-by-side visual check of bright, detailed and dark artwork found no material loss of readability or composition. Existing source/rights records are retained; optimization does not establish new image permissions.

## Measurement method

Lighthouse **13.5.0**, Chromium Headless Shell **139.0.7258.5**, mobile viewport **390×844**, DPR **2**, simulated mobile network (150 ms RTT, 1638.4 Kbit/s), CPU slowdown **4×**. Each page gets three runs in a fresh browser process/cache. Both phases use the published production URLs, `?analytics=off` and blocked Google Analytics/Tag Manager/advertising endpoints. No sign-in, game start or result submission is performed. Network routing through the execution environment is shared by both phases; these are laboratory observations, not physical-device or field results.

Raw run metrics and settings are preserved in [mobile-performance-2026-10-23.json](mobile-performance-2026-10-23.json). Baseline release: `91e461e61bb5ed51ad256a3140d434be38ace168`. Scores and timings are medians, not selected best runs.

| Production page | Before score | Before transferred bytes | Before FCP | Before LCP | Before Speed Index | Before TBT | Before CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 89 | 409,473 | 1.90 s | 1.90 s | 10.26 s | 23.5 ms | 0.0341 |
| September 2025 article | 89 | 3,427,746 | 1.83 s | 2.09 s | 9.11 s | 18.5 ms | 0 |

The after-release comparison remains pending until the matching production deploy is confirmed. Reduced file sizes alone are not evidence of a faster LCP or a higher Lighthouse score.

The PageSpeed Insights API field-data request returned **HTTP 429 / RESOURCE_EXHAUSTED** (daily API quota). No current field Core Web Vitals were returned. This is an access/quota limitation, not a failing speed score or proof that real-user data does not exist. Laboratory TBT does not establish real-user INP.

## Validation

Browser checks cover actual decoded WebPs and selected candidates at 320/390/768/1440 pixels with DPR 2, article/listing layouts, native lazy loading, HTTP content type/payload bounds, and passive mode previews. Existing failed-image tests intercept the new asset paths as well as storage paths. Existing build/publication validation checks prerendered HTML, all referenced `srcset` candidates, image decoding and delivery consistency.

The release PR records the final CI, production verification and after-release metrics. Stage 7 (content planning) remains a separate iteration.

References: [responsive images](https://web.dev/learn/images/responsive-images), [Lighthouse scoring and variability](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).
