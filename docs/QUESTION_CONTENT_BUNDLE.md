# Question content bundles

Contract: **`hardquiz.question-content-bundle/1.0`**. Verified against the prepared
`HQA-20261102-v1` Actresses package (50 records). Implementation is delivered through
`feat/question-content-bundles`; actual release evidence belongs in the pull request.

The primary import file is a **ZIP**. An XLSX is an optional human review copy, not
an input to the importer. Its answers, temporary IDs and images must match the ZIP.
No Excel conversion, production filename assignment or manual JSON rewrite is needed.

## Import and review

Open **Administration → Question bank → Add questions** (`/admin/questions/new`).
Choose **Question package ZIP**, wait for validation, select available records,
then choose **Create N local drafts**. Existing recoverable drafts are counted and
kept; a successful package import also brings them into the visible queue.

The usual cards show the image, four options, correct radio, category and difficulty.
Imported cards start **unselected for publication**. Edit them, use **Add this
question**, or select cards and use **Add N ready questions**. Select all, clear
selection, individual removal and confirmed removal of selected drafts are available.
Only **Added** with the server's committed receipt means the question is in the bank.
Opening, validating and creating local drafts never reserve production filenames,
upload to Storage or create game questions.

The existing encrypted IndexedDB store (`hq_private_question_drafts_v1`) is used,
with the same verified account and server-supplied AES-GCM key. Recovery is explicit
after reload and lasts up to **7 days**, in the **same browser and account**. The
queue holds **50 cards** and encrypted draft storage is bounded to **50 MiB**,
including base64-encoded image data and metadata. Browser quota may be smaller.
Clearing browser data removes local recovery. Avoid editing a card in two tabs.

If a selection will not fit alongside visible or recoverable work, no records are
silently trimmed or deleted. Select fewer, or restore and explicitly remove drafts
to free space. A failed IndexedDB write preserves the previous saved transaction.
Keep the tab open when the UI reports a storage failure.

## ZIP layout and resource limits

```text
manifest.json
images/question-one.webp
images/question-two.webp
ATTRIBUTION.md                         optional
ATTRIBUTION.html                       optional; never rendered as imported HTML
README.md                             optional
sources/verification.json             optional
sources/photograph_source_snapshots.json optional
```

`manifest.json` must be at the root, encoded as UTF-8 JSON. Image paths must be
relative, below `images/`, and match the referenced files exactly. Forward slashes,
ASCII image filenames, no absolute paths, drive letters, backslashes, `.`/`..`
segments, percent escapes, empty path segments, symlinks or duplicate normalized
paths. Archive paths are limited to 240 characters. Do not include OS metadata files.

| Resource | Limit |
|---|---|
| Compressed ZIP | 50 MiB |
| Actual total unpacked data, including companions | 64 MiB |
| Archive entries, including directories | 500 |
| Individual companion file | 20 MiB |
| `manifest.json` | 2 MiB |
| Questions per package / local queue | 50 |
| Prepared image | 1 MiB, static WebP, no EXIF/ICC/XMP or other chunks outside the current uploader's accepted set |
| Actors / Actresses longest image side | 1600 px |
| Movies / TV Series longest image side | 1920 px |
| Metadata per approved record | 32,000 JSON characters; request also bounded in bytes |

ZIP Store and Deflate methods are supported. ZIP64, multi-volume and encrypted
archives are rejected. Central/local headers, declared and actual lengths and CRCs
are checked. Deflate is fed in bounded chunks and actual output is capped even
when headers lie. Files are not extracted to a filesystem. Companion extensions
are `.json`, `.md`, `.txt`, `.html`, `.xlsx`; image entries must be `.webp` and
referenced by the manifest. Companion HTML is retained only as unexecuted data.

Both UI and CLI check image SHA-256, byte length, headers, category dimensions,
animation/metadata restrictions and full decoding. Correct prepared WebPs are used
byte-for-byte. The ordinary JPEG/PNG/WebP manual upload path still processes its
sources as before. Changing a category only reprocesses an imported image if the
new size limit requires it; original provenance is retained and credit changes,
dimensions and hash are updated for the newly encoded bytes.

## Manifest fields

The machine-readable source of structural rules is
[`question-content-bundle.schema.json`](question-content-bundle.schema.json).
Additional editorial/source properties are allowed and retained as record metadata,
subject to the size cap. They are not executable instructions or game settings.

| Field | Required | Meaning |
|---|---|---|
| `schema_version` | yes | Exact string `hardquiz.question-content-bundle/1.0` |
| `package_id` | yes | Stable, case-sensitive package identity |
| `question_count` | yes | Actual length of `questions`, 1–50 |
| `questions` | yes | Question records below |
| `language` | optional | `en` when supplied |
| `correct_index_convention` | optional | `zero_based` when supplied |
| `category` | optional | `{id, name}` snapshot; records must agree if supplied |
| `difficulty_levels` | optional | Catalog snapshot; ID/name/key must agree with current settings |
| `prepared_on`, `status`, notes, sources, attribution-file references | optional | Review information, not publication commands |
| `supported_by_current_admin_importer` | optional | Historical boolean assessment; `false` does **not** block this importer |

Each question requires:

| Field | Rule |
|---|---|
| `temp_id` | Unique within the package; never a database question ID |
| `options` | Exactly four nonempty, distinct English strings, 1–200 characters each; no control/replacement characters. Distinctness uses NFC, trim and case folding |
| `correct_index` | Integer 0–3 |
| `correct_answer` | Exactly `options[correct_index]` |
| `correct_option_label` | Optional `A`–`D`, agreeing with the index. Other answer-designation fields are not supported |
| `category_id`, `difficulty_level_id` | Current catalog IDs; optional names and difficulty key must also agree |
| `image` | Relative file, actual MIME, width, height, bytes, lower-case SHA-256 and provenance below |
| `identity` | Recommended: stable Wikidata ID, professional name/title, aliases and verification sources. Preserved privately |
| `option_entities` | Optional four names aligned with options; entity IDs must be distinct and agree with the correct identity when supplied |
| `prompt`, editorial reasoning, review notes | Optional, retained privately; do not change gameplay prompts or rules |
| `question_id`, `production_image_path`, `published` | Omit production IDs/paths or use null; `published`, if supplied, must be false |

`package_id` and `temp_id` match `^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$`. Do not
generate random new IDs when reopening a package. Make IDs independent of mutable
answer text and production filenames.

### Current catalog

Verified on 2026-11-02. The UI re-reads current category/difficulty settings and the
server checks supported categories and existing difficulty IDs during approval.
The package snapshot never changes the catalog, timers, lives or game settings.
Historical lives/time fields in a snapshot are informational; ID/name/key identify
the difficulty, not a request to change its rules.

| Content category | ID | Database name |
|---|---|---|
| Movies / Movie Stills | 1 | All movies |
| Actors | 2 | Actors |
| Actresses | 3 | Actresses |
| TV Series | 4 | TV series |

| Difficulty | ID | Key |
|---|---|---|
| Easy | 1 | easy |
| Medium | 2 | normal |
| Hard | 3 | hard |

## Image provenance and credits

The image object requires `source_page_url`, `photographer`, `license`,
`license_url`, `attribution_required`, `attribution_text` and
`processing.changes`, as well as its technical fields. Use an accurate institution
or rights-holder credit when there is no individual photographer.

Preserve optional `preferred_credit`, `creator_urls`, source title/original URL,
revision and download information, `share_alike_required`, `derivative_license`,
processing/crop details, personality-rights notices and any extra attribution terms.
ShareAlike records require a derivative license. All URL fields use safe HTTP(S),
without embedded credentials. Supply plain-text credit even if `attribution_html`
is included. The importer never renders supplied HTML; React escapes text and builds
links only after URL validation.

The draft holds full image metadata, identity/editorial data and a manifest hash.
The immutable reservation fingerprint covers the image bytes, question settings,
bundle identity and full metadata. The server stores them in the existing private
import operation, and a transaction trigger attaches credits to the final immutable
image path when `admin_import_finish` creates/updates the question. Private
`question_media` keeps historical credits for issued game snapshots. Existing
questions with no metadata remain valid.

In Administration, credits are visible in drafts and question detail. Classic,
Time Attack and Daily results show the player's outcome and score. Their result
screens have no photo/credit gallery, and `question_image_credits` rejects these
modes even for an owned, completed session or a saved Daily answer. Source text,
titles and links can contain the correct answer and stay out of guessing-game
responses.

Public This or That portraits retain credits beside their pair, ranking and
favourites. That mode already displays names. Its lookup accepts only an active
public person and that person's current or historical image. Full provenance is
retained privately when a photo is replaced. Attribution obligations continue to
apply to licensed images. The current credited actor/actress photos also have
public comparison portraits. Future content needs a suitable attribution path.

The guessing endpoints protect gameplay responses. This or That uses some of the
same portraits, so cross-mode visual matching and identification through external
image sources remain possible.

Replacing a photograph clears its previous draft attribution. A manual replacement
in the bank resolves credits by its new path, never by the old question's author.
Changing only answers retains that photograph's credits. Historic image credits
remain in the private media records for editorial use.

## Repeat imports and duplicate review

The site derives an RFC UUIDv5 operation ID from JSON `[package_id, temp_id]`, using
namespace `6b2bff50-debb-5178-9b9b-9dbe5a8c467b`. Preparers supply only temporary IDs.
Database question IDs and numbered storage paths are allocated by the existing
server mechanism **after explicit approval**. A private unique key also protects the
package/record relationship. The original import lease, upload reconciliation,
duplicate confirmation and transactional finish remain authoritative.

Reopening an existing local record keeps its edits. Already committed records are
reported and excluded. An unchanged ZIP can restore an unconfirmed server operation
when its fingerprint matches; it checks status without submitting again. If the
operation contains edits absent from the ZIP, restore the original local draft.
Expired operations cannot be silently replaced with fresh production numbers.

These are distinct cases:

- Same package/temporary ID: same operation, no additional question.
- Identical image bytes: independent warning and existing explicit duplicate-image
  confirmation before a deliberate additional question.
- Possible same person/work: advisory match on correct answers, aliases and stored
  identity, without using distractor answers as bank duplicates. Diacritics and
  punctuation are folded for name review. Nothing is automatically merged; multiple
  frames of one movie or series may be intentional. Different spellings/aliases
  absent from the supplied identity can still need human review.

After the first upload reservation, changed content cannot reuse its fingerprint.
Use the saved original draft for retries and review completed questions in the bank.

## Validation, examples and versioning

From `frontend/`:

```bash
npm ci
npm run validate:question-bundle -- /absolute/path/questions.zip
npm run validate:question-bundle -- /absolute/path/questions.zip --catalog /absolute/path/current-catalog.json
npm run test:question-bundle
```

Optional catalog JSON has `categories: [{id,name}]` and
`levels: [{id,name,key}]`. The default CLI catalog is the documented repository
snapshot; use freshly verified project data during content preparation. The UI
always checks the live catalog before accepting records. The validator uses the
same schema, ZIP reader, semantic checks and image header validation as the UI;
the CLI additionally uses the complete production WebP decoder.

See the small [example manifest](examples/question-content-bundle/manifest.json)
and [example ZIP](examples/question-content-bundle.zip), covering all four categories
with clearly synthetic geometric placeholder content. They are for testing only.
The real Actresses acceptance ZIP is not committed to the repository or published
to the bank by tests.

Only exact version `1.0` is supported. A future incompatible major/minor contract
must be added explicitly to schema/validator/UI and documented; do not guess support.
Extra compatible editorial properties do not require a new version. For larger
collections, split into packages of at most 50 questions that also fit the unpacked
and local storage budgets, give each part a stable distinct `package_id`, and keep
record IDs stable within that part. Do not regenerate package IDs to bypass retry
or duplicate checks. Preparing content is governed by
[`QUESTION_CONTENT_PREPARATION.md`](QUESTION_CONTENT_PREPARATION.md).

## Deployment and verification

1. Run schema/archive/image tests, browser acceptance and existing manual-upload
   tests, typecheck, lint, build and native PostgreSQL contracts in CI.
2. Apply versioned migration `20261102122652_question_content_bundles.sql`.
3. Deploy compatible `admin-questions` Edge Function with unchanged pinned-admin
   authorization and JWT verification. Include the shared `content.mjs` and
   `webpHeader.mjs` alongside existing modules and vendored decoder.
4. Merge through the established PR/CI workflow, confirm Vercel production success
   and verify published assets/admin headers. Check read-only server permissions.

Steps 2–3 are additive and compatible with the old manual uploader. Deploying the
frontend first would let the old Edge handler ignore metadata; avoid that order.
Publication/retry tests run only against local browser fixtures and isolated SQL
databases. Do not approve the supplied Actresses selection in production for QA.
