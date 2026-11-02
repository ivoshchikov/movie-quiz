# Preparing Hard Quiz question content

Use this instruction for future **Actors, Actresses, Movies and TV Series** selections.
Communicate with the owner in Russian. Questions, names/titles and options are English.

1. Read the current [`QUESTION_CONTENT_BUNDLE.md`](QUESTION_CONTENT_BUNDLE.md),
   [JSON Schema](question-content-bundle.schema.json), shared validator and current
   project instructions. Check current category/difficulty settings and the live
   question bank through authorized read access. Report unavailable access honestly.
2. Exclude existing people/works as requested for the selection, matching professional
   names, aliases, diacritics and stable identities. Appearance as a distractor is
   not a bank duplicate. Do not collapse intentional different film/TV frames.
3. Prepare real, verified images and four distinct English answers. Keep the correct
   text/index/optional A–D marker aligned. Record a recommended current difficulty
   and why that image warrants it. Avoid invented identities or generative face edits.
4. Preserve source pages and original links, photographer/creator, license and its
   link, required plain-text credit, creator URLs, ShareAlike derivative license and
   actual changes. The source title/URL may contain the answer; do not propose
   exposing those fields in active guessing payloads. Do not assume one license
   applies to every image in a package.
5. Export static WebPs without metadata under the category's size/dimension limits.
   Record actual width/height/bytes and SHA-256. Keep stable `package_id` + `temp_id`
   values and relative `images/` paths. Never assign database question IDs, numbered
   production paths or upload reservations during preparation.
6. Deliver a ZIP with root `manifest.json`, referenced images and useful source/
   attribution documents. XLSX is optional for human review and must agree with
   the ZIP. Do not require the owner to rename photos or convert Excel.
7. Run `npm run validate:question-bundle -- /absolute/path/package.zip --catalog
   /absolute/path/current-catalog.json` from `frontend/` using freshly verified
   catalog data. Resolve structural/image errors, review warnings, and split large
   collections into stable parts within the importer/storage budgets. Do not claim
   importer compatibility from a remembered schema or an old assessment flag.
8. Mark the result **prepared for review**. Delivering a file does not create admin
   drafts, and creating local drafts does not add bank questions. Only the owner's
   explicit approval in the interface publishes the selected questions. Do not test
   publication of a real prepared selection against the production bank.

Use natural editorial language in notes and accompanying explanations. Preserve
specific evidence and uncertainties; avoid generic AI phrasing and invented claims.
