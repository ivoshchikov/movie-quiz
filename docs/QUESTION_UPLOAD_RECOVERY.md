# Question image upload recovery

Prepared 16 October 2026 (UTC). Production release is confirmed separately.

## Failure and correction

The importer checks whether its staging image exists before uploading it. The
pinned Supabase SDK wraps a missing download as `StorageUnknownError` whose
`originalError` is an HTTP Response. Storage can return HTTP 400 with a JSON
`Object not found` message. Checking only `error.statusCode` rejected this normal
first-upload response and returned 503 before the file or question was saved.

The shared Storage adapter recognizes positively identified missing objects in
this wrapped response and in direct SDK errors. Missing buckets, authorization
errors, malformed responses and outages still stop the operation. Dependencies,
permissions, compression settings and the import protocol are unchanged.

## Image destinations

Files go into the `movies` Storage bucket; `question.image_url` stores the
relative file path, rather than image bytes.

| Category | Folder and filename |
| --- | --- |
| Movies | `general/g_00001.webp` |
| Actors | `actors/act_00001.webp` |
| Actresses | `actresses/actr_00001.webp` |
| TV series | `series/tv_00001.webp` |

These examples describe the existing namespaces, not numbers to reuse. The
server reserves the next available number under a database lock, accounts for
existing question and Storage paths, and uploads with `upsert: false`. Gaps are
allowed. A folder appears automatically with its first uploaded object; no
manual folder creation is needed. Retries keep the operation ID and reserved
path unless an unrelated object has occupied that path.

## Admin recovery

Cards show the destination before saving and the reserved or saved path after
status verification. A failed attempt reads **Not confirmed**, with an alert and
**Retry this question** / **Retry unconfirmed questions**. **Added** requires both
a confirmed file and a committed question.

After reload, choose **Restore saved drafts**, then retry the unconfirmed card.
Restoring checks status without publishing automatically. Recovery needs the
same browser and owner account, retained browser data, and a draft within the
existing seven-day, 50-card and 50-MiB limits. Processed images and answers remain
encrypted in IndexedDB. If no draft remains, reattach the image as a new card.

## Verification

Tests exercise the actual pinned SDK against an isolated HTTP missing-object
response, the adapter through the complete importer, safe retries, collision
avoidance, lost replies, image validation and authorization before any I/O.
Browser coverage includes a reserved series upload restored after reload with
the same operation and path, explicit feedback and no automatic publication.
Existing SQL tests cover namespaces and concurrent reservations. QA does not
create production questions or gameplay attempts.
