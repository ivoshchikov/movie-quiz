# Publication verification

SEO roadmap stage 2, introduced 22 October 2026. This process verifies the deployed HTML and assets. Google indexing remains a separate, dated observation.

This scoped record supplements the historical SEO-01 notes in the project context and decisions. It implements publication verification only; analytics attribution, landing-page changes, editorial pages and scheduled AI monitoring remain later roadmap stages.

## Sources and persistent records

- Article source of truth: `frontend/src/blog/index.ts` and its entries. Existing validation and prerendering remain in use.
- `docs/seo/publication-registry.json`: the versioned catalog and dated HTTP/Google evidence. Source publication dates are not HTTP verification dates.
- `dist/seo-release.json`: generated catalog and build revision, served publicly. Only public route metadata and a Git SHA are exposed.
- Each public HTML document carries the same `hardquiz:revision` marker. A stale manifest or individual stale page fails the production check.
- `google.status`, `checkedOn`, `source`, `lastCrawlOn`, `lastRequestOn` and `requestStatus` are based on actual inspection. HTTP success never changes them. Unknown observations remain unknown.

The initial Google observations come from the owner's Search Console audit and five accepted indexing requests on 22 October. They are historical evidence, not a claim that Google was inspected on every later deployment.

## Preparing a publication

Run from `frontend/` after editing the article and its existing Vercel route:

```bash
npm run build
npm run seo:sync
npm run seo:check
npm run test:publication
```

Commit the synchronized registry with the article. Synchronization adds new URLs with unknown index status, preserves existing observations and is idempotent. Duplicate records and removed URLs fail: review redirects and history explicitly before removing an existing address.

The local check reads generated HTML and decodes local images. It does not contact production or verify external images/dynamic OG functions; these are marked as requiring a live check. Existing browser tests still verify interactive/mobile behavior.

## After deployment

`.github/workflows/seo-publication.yml` runs when Vercel reports a successful **Production** deployment, and can be rerun using **Run workflow** on main. Preview and intermediate status events do not acquire its production concurrency group.

The actual Vercel events for this repository use an environment label of Production, a SHA as the ref, and `production_environment: false`. The workflow therefore checks the environment and Vercel bot, checks out trusted main first, verifies that the deployed SHA is an ancestor of main, and only then builds that exact revision.

No production credentials are used. Fixture build variables are sufficient because application JavaScript is not executed by the check. The revision uses `SEO_BUILD_REVISION` in CI and `VERCEL_GIT_COMMIT_SHA` in the deployed build.

The check waits up to 120 seconds for the matching release, then verifies:

- all public canonical URLs return real HTML 200 with the expected revision;
- English H1, complete rendered text, title/description/canonical/robots and OG/Twitter agree with the build;
- structured data parses, BlogPosting URLs/dates agree with the catalog, and the blog lists every article;
- sitemap/RSS contain exactly the expected URLs, with valid RSS GUIDs/dates/excerpts;
- robots.txt agrees with the reviewed build and allows crawling;
- rendered internal links and anchors resolve, linked account/game pages remain noindex, and unknown URLs return actual noindex 404s;
- content image alt/dimensions are present, every declared image/social image returns an image and its bytes decode.

For local project images, the live bytes must also match the checked build's SHA-256; a valid but stale cover fails. External images and dynamic OG functions are checked for successful delivery and decoding. Preview URLs cannot be recorded as production verification.

The image decoder runs only on data URLs in a separate blank context with all network requests blocked. Site HTML is parsed with JavaScript disabled. Checks never sign in, start games, submit results, send model API requests or request Google indexing.

Fetches have timeouts, bounded transient retries, a per-resource 8 MiB limit and a 150-image limit. The job has a 12-minute timeout. A newer production run cancels an older running check. A release mismatch is reported as unverified; an older/different deploy cannot be used as proof of the requested release.

## Results, history and reruns

The Actions job summary reports the outcome. The artifact `seo-publication-<run id>-<attempt>` contains JSON results and a derived registry, including failures. Reports are checkpointed during execution: an interrupted run remains incomplete, never verified. Artifact retention is **90 days**, not indefinite.

The committed catalog and manually confirmed Google observations remain in Git. To preserve a completed live release checkpoint in Git, the publication maintainer/assistant can run:

```bash
npm run seo:check -- --url https://hard-quiz.com --revision <full-deployed-sha> --record-registry
```

Build the same revision first. Commit the resulting registry checkpoint in the publication's release record/update. It records the verified revision and time; a later evidence-only commit naturally has another SHA. CI itself has **contents: read**, never commits back to main and cannot create an update loop. The latest automatic result is in its run artifact; the Git file is the last explicitly saved checkpoint.

Failed checks exit nonzero, retain prior successful evidence and mark the derived publication status as needing review. Rerun the failed job after a transient problem is resolved. For a content/routing problem, fix it in a separate branch and release again. Repeated checks do not create duplicate URL records or repeat indexing submissions.

## Validation boundaries

The checks prove delivery and consistency of this release, not Google inclusion, rankings, editorial accuracy, image licenses or AI citations. They do not replace the existing mobile/interactive suite or Core Web Vitals measurement. At roadmap stage 9, a long-term reporting destination and scheduled index inspection can be added with explicit access and retention limits.

Primary references: [GitHub deployment events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#deployment_status), [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables), [Google recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

