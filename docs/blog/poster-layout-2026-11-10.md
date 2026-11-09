# Blog poster layout — 10 November 2026

The owner selected the Thanksgiving article as the reference for all film cards:
poster at left, complete description at right, with title and facts above.

All 53 currently published promotional posters use a consistent 190 px media
column and 24 px gap on wider screens. The archive cards use the same column
width. At 600 px and below, the layout becomes one column: a centered 180 px
poster with its caption and store badge, followed by full-width text. Descriptions
stay together in one column; later paragraphs do not wrap beneath the poster.
Cards without an approved image retain full-width text without an empty column.

The shared pure JSX `filmContent` helper preserves prerendering and the existing
reading-time calculation. The Thanksgiving reference now uses the same layout
classes. Image `sizes` matches the rendered widths; high-density archive views
can select the existing 600 px variant. No new image assets are introduced.
Wide title artwork and the aspect-ratio comparison retain their editorial formats.

The existing real images, captions, source attribution, exact purchase destinations
and approved store badges remain in place. The poster columns preserve the badge's
minimum height and clear space. Article text, original dates, canonicals and social
images are not editorially revised by a layout change.

Local validation: typecheck, lint, build and 50 publication tests passed. The
106 existing targeted browser cases passed; four final layout/Thanksgiving cases
also passed. The expanded media checks inspect every poster in all 12 articles
at 320 and 1440 px, including desktop column alignment, mobile stacking,
non-overflow, loaded images, matching store links and badge placement. Archive
responsive checks additionally cover 390 and 768 px at 2x density. Representative
Horror, Sci-Fi Mystery and Thanksgiving layouts were visually inspected.

CI, merge and live HTTP verification are distinct release checks recorded in the
implementation PR. This note covers presentation, not a new image-rights review.
