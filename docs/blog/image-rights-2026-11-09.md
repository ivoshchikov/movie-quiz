# Blog image provenance audit — 9 November 2026

Scope: all 12 blog entries, article images, collection fallbacks, covers, social
metadata and build output. The owner requested replacement and publication.
This task does not change game question media, game rules, ad settings or review
submission. Prepared source is distinct from CI, merge and published verification.

## Findings and replacement

73 distinct imported inline images and one external framing-guide cover lacked
independently documented commercial-use permission. Seven recent guides used 55
owner-supplied frames/posters. The two 2025 release archives used 16 imported
posters; the framing guide used two scene images and the external cover.
Some original insertion manifests explicitly record a null license, no creator,
or an IMDb/source statement. Permission to insert an upload is not a license
from its copyright holder. No film ownership claim or fair-use guarantee is inferred.

Ten articles receive 76 original geometric illustrations: 73 inline replacements
plus three original guide covers, including new August/September archive covers.
The complete visual source is `artwork/editorial-illustrations.py` and its JSON
brief; no external photos, film frames, official posters, logos or character
likenesses are used. The system DejaVu font is rendered into images; font files
are not distributed. Each figure is labeled as an editorial illustration.
The framing guide now demonstrates a real 2.39:1-to-16:9 crop on an original
station composition, and negative space on a separate original coastal drawing.

The replacement removes 179 imported files from the deployable public directory.
Article URLs and initial dates remain unchanged; modified dates become November 9.
Source/image hashes, exact retired paths and one-to-one replacements are recorded
in `image-rights-retirement-2026-11-09.json`, `original-artwork-manifest.json` and
`image-rights-ledger.json`. Historical insertion records remain as evidence of
what was replaced, not a current inventory of active images.

## Retained imagery

Existing original Hard Quiz cover artwork remains. Thanksgiving's seven posters
were not owner-supplied and retain their separately documented conditional Apple
iTunes Search API promotional use. Every poster is inside its corresponding film
card with its exact US store link and unmodified approved badge. The artwork is
not used as a cover, social image, gallery item or game promotion. This is a
conditional promotional basis, not a general commercial-stock license. The build
gate verifies the required placement and rejects reuse in generic metadata.

## Build and publication checks

`scripts/blog-image-rights.cjs` validates all article image URLs and responsive
variants, cover/listing/social metadata and fallback galleries against the ledger.
It requires reviewed local bytes, a declared editable source for original art,
truthful alt text, and the absence of retired public files. Conditional promotion
requires its matching film link and badge. This gate checks provenance and file
identity; it cannot adjudicate legal rights or guarantee monetization approval.
Ten negative/positive provenance tests join the existing publication checks.
The reviewed whole-site image budget increases from 247 to 293 for responsive
original artwork and new covers; the excessive-catalog regression remains active.

## Legacy origin storage

Read-only inspection found a separate public `blog` bucket with 21 legacy objects
(16 posters and five older framing/optics images). No game question uses that
bucket; the 1,173 current question records use other media paths. New blog source
does not depend on it. Making this now-unused bucket private would retire those
public origin URLs without deleting the files. The connected Supabase operations
do not expose bucket management, and no Storage service credential is configured.
Use the official Storage API or owner dashboard for that reversible change;
do not delete or edit Storage metadata through SQL to bypass the missing API.
Its execution and anonymous HTTP verification remain separate from frontend
publication until they are observed. The game-media bucket stays public and unchanged.

## Primary policy references

- Google Publisher Policies, Intellectual property abuse:
  https://support.google.com/publisherpolicies/answer/10402772?hl=en
- Apple iTunes Search API, conditional promotional-use terms:
  https://performance-partners.apple.com/search-api
- Supabase Storage schema guidance (records treated as read-only; use its API):
  https://supabase.com/docs/guides/storage/schema/design
- Supabase updateBucket reference:
  https://supabase.com/docs/reference/javascript/storage-updatebucket

Replacing unverified imagery reduces a concrete provenance gap. It does not
guarantee that Google or another partner will approve the site or that no claim
will ever be made. Search indexing and advertising review are separate outcomes.
