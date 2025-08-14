// src/blog/entries/august-2025-new-movies.tsx
import React from "react";
import { buildNewReleasesPost } from "../kits/new-release";
import type { BlogPost } from "../types";

const CDN_BASE =
  "https://vgjfbcihppxbtrjcxoci.supabase.co/storage/v1/object/public/blog/new_releases/august-2025";

const urls = {
  cover:     `${CDN_BASE}/cover.webp`,
  badGuys2:  `${CDN_BASE}/bad-guys-2.webp`,
  nakedGun:  `${CDN_BASE}/naked-gun-2025.webp`,
  freaky2:   `${CDN_BASE}/freaky-friday-2.webp`,
  weapons:   `${CDN_BASE}/weapons-2025.webp`,
  nobody2:   `${CDN_BASE}/nobody-2.webp`,
  honeyDont: `${CDN_BASE}/honey-dont.webp`,
  neZha2:    `${CDN_BASE}/ne-zha-2.webp`,
};

const Post: BlogPost = buildNewReleasesPost({
  slug: "august-2025-new-movies-guide",
  title: "New Movies in August 2025: The Only Guide You Need",
  excerpt:
    "From a big animated sequel to a nostalgic comedy comeback, a nerve-shredding thriller, and kinetic action — here are the must-see theatrical releases in August 2025 (US), spoiler-free.",
  date: "2025-08-13",
  monthLabel: "August 2025",
  tags: ["Streaming & New Releases"],
  readingMinutes: 8,

  // Если cover.webp не загрузите — в посте и на листинге отрисуется коллаж из gallery.
  coverUrl: urls.cover,

  // Можно не указывать: соберётся из films.*posterUrl; оставляем для явной фиксации порядка.
  gallery: [
    urls.badGuys2,
    urls.nakedGun,
    urls.freaky2,
    urls.weapons,
    urls.nobody2,
    urls.honeyDont,
    urls.neZha2,
  ],

  films: [
    {
      title: "The Bad Guys 2",
      posterUrl: urls.badGuys2,
      release: "August 1, 2025 (US)",
      director: "Pierre Perifel",
      cast: ["Sam Rockwell", "Marc Maron", "Awkwafina"],
      body: (
        <>
          <p>
            DreamWorks’ slick animal-heist crew returns with brighter set pieces,
            sharper timing, and a tone between caper and cartoon chaos. Expect brisk
            pacing and punchline-dense dialogue engineered for a crowd.
          </p>
          <p>
            <strong>Why it matters:</strong> animated August openers can dominate
            family moviegoing; this brand already proved strong four-quadrant legs.
          </p>
          <p>
            <strong>Who it’s for:</strong> families, animation fans, and anyone who
            likes kinetic action that stays kid-friendly.
          </p>
        </>
      ),
    },
    {
      title: "The Naked Gun",
      posterUrl: urls.nakedGun,
      release: "August 1, 2025 (US)",
      director: "Akiva Schaffer",
      cast: ["Liam Neeson", "Pamela Anderson"],
      body: (
        <>
          <p>
            A reboot that revives the anything-for-a-gag police spoof: rapid-fire
            sight jokes, deadpan deliveries, and gleeful set-piece escalation —
            aimed squarely at Friday-night laughers.
          </p>
          <p>
            <strong>Why it matters:</strong> theatrical slapstick is rare; a
            crowd-pleasing entry can travel on word of mouth.
          </p>
          <p>
            <strong>Who it’s for:</strong> fans of high-density joke machines and
            legacy comedy brands.
          </p>
        </>
      ),
    },
    {
      title: 'Freaky Friday 2 ("Freakier Friday")',
      posterUrl: urls.freaky2,
      release: "August 8, 2025 (US)",
      director: "Nisha Ganatra",
      cast: ["Jamie Lee Curtis", "Lindsay Lohan"],
      body: (
        <>
          <p>
            Disney’s body-swap comedy returns, updated for the messiness of
            adulthood — calendars, careers, and the awkward empathy of literally
            living in someone else’s shoes.
          </p>
          <p>
            <strong>Why it matters:</strong> the 2003 film became a sleepover-era
            classic; the sequel plays to families and nostalgia fans without
            alienating newcomers.
          </p>
          <p>
            <strong>Who it’s for:</strong> family outings, feel-good-comedy seekers,
            and anyone who grew up quoting the original.
          </p>
        </>
      ),
    },
    {
      title: "Weapons",
      posterUrl: urls.weapons,
      release: "August 8, 2025 (US)",
      director: "Zach Cregger",
      cast: ["Josh Brolin", "Julia Garner"],
      body: (
        <>
          <p>
            An original thriller that leans into grounded dread, sharp turns, and
            theater-grade sound that ratchets tension without cheap jump scares.
          </p>
          <p>
            <strong>Why it matters:</strong> August rarely gets prestige-leaning
            horror at scale; expect this to be the month’s conversation piece.
          </p>
          <p>
            <strong>Who it’s for:</strong> horror fans and date-night thrill-seekers
            who enjoy puzzle-box narratives.
          </p>
        </>
      ),
    },
    {
      title: "Nobody 2",
      posterUrl: urls.nobody2,
      release: "August 15, 2025 (US)",
      director: "Ilya Naishuller",
      cast: ["Bob Odenkirk"],
      body: (
        <>
          <p>
            The lean, bruising action saga returns with readable choreography,
            crunchy impacts, Hong Kong–inflected fight craft, and a streak of black
            humor intact.
          </p>
          <p>
            <strong>Why it matters:</strong> the first film became a word-of-mouth
            favorite on home release; the sequel arrives to a hungrier fanbase.
          </p>
          <p>
            <strong>Who it’s for:</strong> action die-hards and anyone who wants
            practical-forward, stunt-driven set pieces.
          </p>
        </>
      ),
    },
    {
      title: "Honey Don’t!",
      posterUrl: urls.honeyDont,
      release: "August 22, 2025 (US)",
      director: "Ethan Coen",
      cast: ["Margaret Qualley", "Geraldine Viswanathan", "Aubrey Plaza"],
      body: (
        <>
          <p>
            A crime-tinged caper with neon-noir snap: quick reversals, tight scenes,
            and performances that play comedy and danger in equal measure.
          </p>
          <p>
            <strong>Why it matters:</strong> late-summer originals can surprise if
            they’re pacey and fun — this aims to be a fizzy crowd-pleaser.
          </p>
          <p>
            <strong>Who it’s for:</strong> fans of stylish capers and twisty
            relationship dynamics.
          </p>
        </>
      ),
    },
    {
      title: "Ne Zha II",
      posterUrl: urls.neZha2,
      release: "August 22, 2025 (US)",
      director: "Yu Yang (Jiaozi)",
      cast: ["(Animation, voice cast)"],
      body: (
        <>
          <p>
            The mythic fantasy sequel returns with large-scale set pieces and bold
            color design, now with accessible English-language release for US
            audiences.
          </p>
          <p>
            <strong>Why it matters:</strong> late-summer animation for older
            kids/teens is under-served; this bridges the gap with spectacle and
            folklore.
          </p>
          <p>
            <strong>Who it’s for:</strong> animation fans, families with tweens/teens,
            and anyone who loves operatic fantasy.
          </p>
        </>
      ),
    },
  ],
});

export default Post;
