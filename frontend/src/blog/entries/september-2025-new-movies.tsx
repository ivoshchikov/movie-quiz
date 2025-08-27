// src/blog/entries/september-2025-new-movies.tsx
import React from "react";
import { buildNewReleasesPost } from "../kits/new-release";
import type { BlogPost } from "../types";

const CDN_BASE =
  "https://vgjfbcihppxbtrjcxoci.supabase.co/storage/v1/object/public/blog/new_releases/september-2025";

const urls = {
  cover:        `${CDN_BASE}/cover.webp`,
  conjuring4:   `${CDN_BASE}/the-conjuring-last-rites.webp`,
  longWalk:     `${CDN_BASE}/the-long-walk.webp`,
  spinalTap2:   `${CDN_BASE}/spinal-tap-ii.webp`,
  demonSlayer:  `${CDN_BASE}/demon-slayer-infinity-castle.webp`,
  downtonFinal: `${CDN_BASE}/downton-abbey-the-grand-finale.webp`,
  bigBold:      `${CDN_BASE}/a-big-bold-beautiful-journey.webp`,
  him:          `${CDN_BASE}/him-2025.webp`,
  strangers2:   `${CDN_BASE}/the-strangers-chapter-2.webp`,
  gabbys:       `${CDN_BASE}/gabbys-dollhouse-the-movie.webp`,
};

const Post: BlogPost = buildNewReleasesPost({
  slug: "september-2025-new-movies-guide",
  title: "New Movies in September 2025: 9 Biggest Theatrical Releases (US)",
  excerpt:
    "Horror heavy-hitters, a beloved period-drama farewell, an anime event, and a mockumentary legend — here are September’s most unmissable theatrical releases in the US.",
  date: "2025-09-01",
  monthLabel: "September 2025",
  tags: ["New Releases", "In Theaters", "Movie Guide", "Streaming & New Releases"],
  readingMinutes: 9,

  // обложка: можно заменить на коллаж или любой из постеров
  coverUrl: urls.cover,

  // порядок превью на листинге
  gallery: [
    urls.conjuring4,
    urls.demonSlayer,
    urls.downtonFinal,
    urls.spinalTap2,
    urls.bigBold,
    urls.him,
    urls.longWalk,
    urls.strangers2,
    urls.gabbys,
  ],

  films: [
    {
      title: "The Conjuring: Last Rites",
      posterUrl: urls.conjuring4,
      release: "September 5, 2025 (US)",
      director: "Michael Chaves",
      cast: ["Vera Farmiga", "Patrick Wilson"],
      body: (
        <>
          <p>
            The Warrens return for one last dance with the devil — a mainline chapter
            that aims bigger than a haunted-house reset. Expect courtroom chills,
            cold spots, and that slow, dreadful squeeze only this series nails.
          </p>
          <p>
            <strong>Why it matters:</strong> the Conjuring brand is still a
            crowd-starter; a clean, scary four-quadrant horror jumpstarts fall moviegoing.
          </p>
          <p>
            <strong>Who it’s for:</strong> Friday-night horror crews and anyone who
            wants a packed-theater scream-along.
          </p>
        </>
      ),
    },
    {
      title: "Demon Slayer: Infinity Castle",
      posterUrl: urls.demonSlayer,
      release: "September 12, 2025 (US)",
      director: "Haruo Sotozaki",
      cast: ["(Animation, Japanese voice cast)"],
      body: (
        <>
          <p>
            The anime juggernaut storms theaters with a feature-scale showdown —
            acrobatic swordplay, operatic emotion, and franchise-defining spectacle.
          </p>
          <p>
            <strong>Why it matters:</strong> event anime keeps punching above its
            weight at the US box office; this is the must-see chapter.
          </p>
          <p>
            <strong>Who it’s for:</strong> fans who want big-screen scale and newcomers
            chasing a maximal crowd experience.
          </p>
        </>
      ),
    },
    {
      title: "Downton Abbey: The Grand Finale",
      posterUrl: urls.downtonFinal,
      release: "September 12, 2025 (US)",
      director: "Simon Curtis",
      cast: ["Hugh Bonneville", "Michelle Dockery", "Elizabeth McGovern"],
      body: (
        <>
          <p>
            One last waltz with the Crawleys: polished drama, crisp one-liners,
            and enough tea to float a battleship. Expect closure without cheap sentiment.
          </p>
          <p>
            <strong>Why it matters:</strong> the TV-to-cinema success story sticks the
            landing; period romance + ensemble comfort is an evergreen theatrical play.
          </p>
          <p>
            <strong>Who it’s for:</strong> date-night traditionalists and fans who’ve
            been in since the very first bell.
          </p>
        </>
      ),
    },
    {
      title: "This Is Spinal Tap II: The End Continues",
      posterUrl: urls.spinalTap2,
      release: "September 12, 2025 (US)",
      director: "Rob Reiner",
      cast: ["Christopher Guest", "Michael McKean", "Harry Shearer", "Rob Reiner"],
      body: (
        <>
          <p>
            The amps still go to eleven. The band’s back for a reunion riff on aging
            rock, delusion, and unkillable hooks — a victory lap for deadpan.
          </p>
          <p>
            <strong>Why it matters:</strong> a cultural touchstone returns; expect
            cameo-fueled laughter and quotable chaos.
          </p>
          <p>
            <strong>Who it’s for:</strong> comedy nerds, music doc fans, and anyone who
            knows how to get lost backstage.
          </p>
        </>
      ),
    },
    {
      title: "The Long Walk",
      posterUrl: urls.longWalk,
      release: "September 12, 2025 (US)",
      director: "Francis Lawrence",
      cast: ["TBA"],
      body: (
        <>
          <p>
            Stephen King’s endurance nightmare gets the big-screen treatment: sparse,
            brutal, and weirdly hypnotic — a march you feel in your calves.
          </p>
          <p>
            <strong>Why it matters:</strong> prestige horror/thrillers are anchoring
            early fall; a King adaptation from a large-scale stylist is a real draw.
          </p>
          <p>
            <strong>Who it’s for:</strong> King completists and thriller fans who like
            their allegories sharp.
          </p>
        </>
      ),
    },
    {
      title: "A Big Bold Beautiful Journey",
      posterUrl: urls.bigBold,
      release: "September 19, 2025 (US)",
      director: "Kogonada",
      cast: ["Margot Robbie", "Colin Farrell", "Lily Rabe"],
      body: (
        <>
          <p>
            A lyrical, time-bending romance from a filmmaker obsessed with space,
            memory, and the way people look at each other — minimalist, but piercing.
          </p>
          <p>
            <strong>Why it matters:</strong> late-summer art-house crossovers can
            catch fire; star power + Kogonada’s precision is potent.
          </p>
          <p>
            <strong>Who it’s for:</strong> fans of quiet science fiction and aching,
            adult romance.
          </p>
        </>
      ),
    },
    {
      title: "HIM",
      posterUrl: urls.him,
      release: "September 19, 2025 (US)",
      director: "Justin Tipping",
      cast: ["Marlon Wayans", "Tyriq Withers", "Aliyah Camacho"],
      body: (
        <>
          <p>
            A suburban family’s “miracle” spirals into something hungrier —
            a Blumhouse chiller built on dread rather than cheap jolts.
          </p>
          <p>
            <strong>Why it matters:</strong> fresh original horror with a theatrical-first
            rollout — perfect for Saturday-night crowds.
          </p>
          <p>
            <strong>Who it’s for:</strong> horror fans who like slow-burn menace and
            big-audience tension.
          </p>
        </>
      ),
    },
    {
      title: "The Strangers: Chapter 2",
      posterUrl: urls.strangers2,
      release: "September 26, 2025 (US)",
      director: "Renny Harlin",
      cast: ["Madelaine Petsch"],
      body: (
        <>
          <p>
            The masked home-invaders saga continues with road-trip dread,
            cat-and-mouse geography, and nervy close-quarters terror.
          </p>
          <p>
            <strong>Why it matters:</strong> the 2024 revival found its crowd; a fall
            sequel could surge on communal screams.
          </p>
          <p>
            <strong>Who it’s for:</strong> genre loyalists and anyone who watches
            through their fingers.
          </p>
        </>
      ),
    },
    {
      title: "Gabby’s Dollhouse: The Movie",
      posterUrl: urls.gabbys,
      release: "September 26, 2025 (US)",
      director: "TBA",
      cast: ["Voice cast incl. Gloria Estefan, Kristen Wiig"],
      body: (
        <>
          <p>
            The preschool favorite goes big-screen with a bright, musical rescue
            adventure that plays to giggles and sing-alongs.
          </p>
          <p>
            <strong>Why it matters:</strong> a family anchor in late September — perfect
            for matinees and first movie outings.
          </p>
          <p>
            <strong>Who it’s for:</strong> parents with little ones and anyone who wants
            a cheerful, gentler theatrical trip.
          </p>
        </>
      ),
    },
  ],
});

export default Post;
