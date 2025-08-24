// src/blog/entries/why-2-39-feels-more-cinematic.tsx
import React from "react";
import type { BlogPost } from "../types";

/**
 * Images live in the public Supabase bucket:
 *   https://vgjfbcihppxbtrjcxoci.supabase.co/storage/v1/object/public/blog/Trivia/239
 *
 * For a proper hero collage, upload at least these four:
 *   composition-staging.webp, composition-negative.webp, anamorphic-flare.webp, oval-bokeh.webp
 *
 * Bonus comparison at the end:
 *   flat-vs-scope.webp
 */
const CDN_BASE =
  "https://vgjfbcihppxbtrjcxoci.supabase.co/storage/v1/object/public/blog/Trivia/239";

const urls = {
  // hero/gallery
  compStaging:   `${CDN_BASE}/composition-staging.webp`,
  compNegative:  `${CDN_BASE}/composition-negative.webp`,
  flare:         `${CDN_BASE}/anamorphic-flare.webp`,
  bokeh:         `${CDN_BASE}/oval-bokeh.webp`,

  // bonus comparison
  flatVsScope:   `${CDN_BASE}/flat-vs-scope.webp`,
};

// utility for full-bleed images inside the article body
const FULL_BLEED =
  "w-screen max-w-none ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]";

const Post: BlogPost = {
  slug: "why-2-39-1-feels-more-cinematic",
  title: "Why 2.39:1 Feels More Cinematic",
  excerpt:
    "Wider frames change how we stage action, balance negative space, and feel scale. Here’s why 2.39:1 (aka “Scope”) reads as instantly cinematic — and when not to use it.",
  date: "2025-08-15",
  // First tag should match TopicLabels so /blog filter works
  tags: ["Explainers & Trivia", "Aspect Ratio"],
  readingMinutes: 9,

  /**
   * coverUrl is used for OG/Twitter preview (static meta image).
   * We'll keep flat-vs-scope as a reliable fallback.
   * On the page itself, the hero will render a collage from `gallery`.
   */
  coverUrl: urls.flatVsScope,

  /**
   * IMPORTANT: to render a collage in the hero, this array must have ≥3–4 images.
   * BlogPost.tsx picks: collage (if gallery.length > 0) → else coverUrl → else gradient.
   */
  gallery: [urls.compStaging, urls.compNegative, urls.flare, urls.bokeh],

  content: () => (
    <>
      <p>
        2.39:1 — the classic “wide cinema” frame often rounded to 2.40:1 and
        nicknamed <em>Scope</em>. It doesn’t magically improve images, but it
        changes the language: how we stage action, use empty space, and convey
        scale. Below is the practical “why” behind its cinematic feel, what
        anamorphic look really means, and when you should skip 2.39.
      </p>

      <h2>A very short history</h2>
      <p>
        In the 1950s, studios looked for ways to distinguish cinema from TV —
        cue the rise of widescreen formats and anamorphic lenses. Early
        “CinemaScope” settled around 2.35:1; later projection standards nudged
        the effective image to 2.39:1 (often spoken as 2.40:1).
      </p>

      <h2>Why wider often “reads” as cinema</h2>

      <h3>1) Staging and parallel action</h3>
      <p>
        The horizontal spread of 2.39:1 holds multiple characters and context
        without immediate cutting. It’s easier to “read” space left-to-right
        and play longer beats of blocking before the next edit.
      </p>
      <figure>
        <img
          src={urls.compStaging}
          alt="Wide staging across a 2.39:1 frame"
          className={FULL_BLEED}
          loading="lazy"
          decoding="async"
        />
        <figcaption>
          Wide frames support several lines of action at once — clean geography, fewer cuts.
        </figcaption>
      </figure>

      <h3>2) Negative space and scale</h3>
      <p>
        Emptiness hits harder in scope: the “air” around a character instantly
        suggests isolation, danger, or grandness of place. A small push or pan
        can shift mood without dialogue.
      </p>
      <figure>
        <img
          src={urls.compNegative}
          alt="Negative space in a scope frame"
          className={FULL_BLEED}
          loading="lazy"
          decoding="async"
        />
        <figcaption>
          Negative space sets tone — unease, loneliness, scale.
        </figcaption>
      </figure>

      <h3>3) The anamorphic look: flares and bokeh</h3>
      <p>
        With 2× anamorphic lenses you’ll often get the tell-tale streak flares,
        geometry quirks, and oval bokeh (city lights become vertical ovals rather
        than round discs). Not required for 2.39:1, but widely associated with the
        “big-screen” feel.
      </p>
    <figure className="my-6">
    <img
        src={urls.flare}
        alt="Horizontal anamorphic flare"
        className={`${FULL_BLEED} block`}
        loading="lazy"
        decoding="async"
    />
    <figcaption className="mt-2 text-sm opacity-80">
        Horizontal streak flares under bright point sources.
    </figcaption>
    </figure>

    <figure className="my-6">
    <img
        src={urls.bokeh}
        alt="Oval bokeh example"
        className={`${FULL_BLEED} block`}
        loading="lazy"
        decoding="async"
    />
    <figcaption className="mt-2 text-sm opacity-80">
        Oval bokeh is another quick “anamorphic” tell.
    </figcaption>
    </figure>


      <h3>4) On 16:9 TVs it still signals “theatrical”</h3>
      <p>
        On a 16:9 screen, 2.39:1 shows thin letterbox bars. Not a quality
        boost by itself — but the look is culturally associated with theatrical
        presentation and gets read that way by audiences.
      </p>

      <h2>When 2.39:1 is not your best friend</h2>
      <ul>
        <li>
          Strongly vertical environments (tall interiors, shafts, stairwells) —
          1.85:1 or 16:9 can read more clearly.
        </li>
        <li>
          Content consumed vertically on phones — edge information in 2.39:1 is
          often lost under auto-crops.
        </li>
        <li>
          Dialogue-heavy scenes full of close-ups — facial nuance can read
          better in less wide aspect ratios.
        </li>
      </ul>

      <h2>Ways to get “scope” today</h2>
      <ul>
        <li>
          <strong>2× anamorphic + 4:3 sensor</strong>: the classic path — de-squeeze
          yields ≈2.39:1 while using full sensor height.
        </li>
        <li>
          <strong>Spherical + crop to 2.39</strong>: practical and cheaper;
          you won’t get anamorphic artifacts, but compositionally it’s the same width.
        </li>
        <li>
          <strong>1.3× anamorphic on 16:9</strong>: a softer compromise —
          a touch of the “anamorphic” vibe without strict sensor requirements.
        </li>
      </ul>

      <h2>Bonus: 2.39 vs 16:9 — side by side</h2>
      <p>
        Below is the same frame: left is the original 2.39:1, right is a centered
        16:9 crop (side trims). Notice how rhythm and spatial relationships shrink
        when the frame is narrowed for “TV”.
      </p>
      <figure>
        <img
          src={urls.flatVsScope}
          alt="Left: original 2.39:1. Right: centered 16:9 crop of the same frame."
          className={FULL_BLEED}
          loading="lazy"
          decoding="async"
        />
        <figcaption>Left: original 2.39:1. Right: centered 16:9 crop.</figcaption>
      </figure>

      <h2>Takeaway</h2>
      <p>
        2.39:1 isn’t a “cinema filter” — it’s a set of expressive tools:
        horizontal staging, potent negative space, and (if you want it)
        the character of anamorphic glass. If your scenes benefit from broad
        geometry — go scope; if not, pick the aspect to serve the story.
      </p>
    </>
  ),
};

export default Post;
