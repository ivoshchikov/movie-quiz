import { buildNewReleasesPost } from "../kits/new-release";
const CDN = "https://vgjfbcihppxbtrjcxoci.supabase.co/storage/v1/object/public/blog/new_releases/september-2025";
const poster = (name: string) => CDN + "/" + name + ".webp";

const post = buildNewReleasesPost({
  slug: "september-2025-new-movies-guide",
  title: "September 2025 Movie Releases: 9 Picks (US)",
  excerpt: "Nine September 2025 US theatrical picks, including The Conjuring: Last Rites, Demon Slayer: Infinity Castle, HIM and Gabby's Dollhouse, with dates and spoiler-free summaries.",
  date: "2025-09-01", modified: "2026-10-09", archiveYear: 2025,
  monthLabel: "September 2025",
  tags: ["New Releases", "In Theaters", "Movie Guide", "Streaming & New Releases"],
  coverUrl: poster("the-conjuring-last-rites"), listingCoverUrl: poster("the-conjuring-last-rites"),
  intro: "September 2025's US theatrical lineup included franchise finales, a rock mockumentary reunion, an anime continuation and original horror. These nine selected releases span the month. The overview below makes it easy to find a film, then read its spoiler-free setup and principal credits.",
  sources: [
    { label: "Warner Bros. — The Conjuring: Last Rites", url: "https://www.warnerbros.com/movies/conjuring-last-rites" },
    { label: "Crunchyroll — Infinity Castle international release dates", url: "https://www.crunchyroll.com/news/announcements/2025/3/5/demon-slayer-kimetsu-no-yaiba-infinity-castle-first-movie-international-release-dates" },
    { label: "Sony Pictures — Infinity Castle cast and synopsis", url: "https://www.sonypictures.ca/movies/demon-slayer-kimetsu-no-yaiba-infinity-castle" },
    { label: "Focus Features — Downton Abbey: The Grand Finale", url: "https://www.focusfeatures.com/downton-abbey-the-grand-finale" },
    { label: "Bleecker Street — Spinal Tap II: The End Continues", url: "https://bleeckerstreetmedia.com/spinal-tap-ii" },
    { label: "Media Capital Technologies — The Long Walk", url: "https://mediacap.io/movies/the-long-walk/" },
    { label: "Sony Pictures — A Big Bold Beautiful Journey", url: "https://www.sonypictures.com/movies/abigboldbeautifuljourney" },
    { label: "Universal Pictures — HIM", url: "https://www.universalpicturesathome.com/movies/him" },
    { label: "The Strangers: Chapter 2 — official film site", url: "https://www.thestrangerschapter2movie.com/synopsis/" },
    { label: "DreamWorks — Gabby's Dollhouse: The Movie", url: "https://www.dreamworks.com/movies/gabbys-dollhouse-the-movie" },
  ],
  films: [
    {
      id: "the-conjuring-last-rites", title: "The Conjuring: Last Rites", posterUrl: poster("the-conjuring-last-rites"),
      releaseDate: "2025-09-05", genre: "Supernatural horror", director: "Michael Chaves",
      cast: ["Vera Farmiga", "Patrick Wilson"],
      body: <><p>Ed and Lorraine Warren return for another paranormal investigation, with Vera Farmiga and Patrick Wilson reprising their roles. Michael Chaves directs this concluding chapter of the main Conjuring film series.</p><p><strong>Consider it for:</strong> the Warren storyline and supernatural horror. The earlier Conjuring films provide the characters' shared history.</p></>,
    },
    {
      id: "demon-slayer-infinity-castle", title: "Demon Slayer: Infinity Castle", posterUrl: poster("demon-slayer-infinity-castle"),
      releaseDate: "2025-09-12", genre: "Anime action", director: "Haruo Sotozaki",
      castLabel: "Japanese voices", cast: ["Natsuki Hanae", "Akari Kito", "Hiro Shimono", "Yoshitsugu Matsuoka"],
      body: <><p>Tanjiro and the Demon Slayer Corps enter the demons' stronghold as the anime's ongoing conflict moves into the Infinity Castle. This film begins the cinematic adaptation of that arc.</p><p><strong>Consider it for:</strong> following the established anime story. This is a continuation, not an introduction to the world; catching up through the Hashira Training arc gives you the relevant context.</p></>,
    },
    {
      id: "downton-abbey-the-grand-finale", title: "Downton Abbey: The Grand Finale", posterUrl: poster("downton-abbey-the-grand-finale"),
      releaseDate: "2025-09-12", genre: "Period drama", director: "Simon Curtis",
      cast: ["Hugh Bonneville", "Michelle Dockery", "Elizabeth McGovern"],
      body: <><p>The Crawley household enters the 1930s facing financial pressure and a scandal surrounding Mary. Simon Curtis returns to direct the film, with Julian Fellowes continuing the family's story.</p><p><strong>Consider it for:</strong> returning to Downton's characters and social world. Familiarity with the television series and previous films adds context to this farewell.</p></>,
    },
    {
      id: "spinal-tap-ii", title: "Spinal Tap II: The End Continues", posterUrl: poster("spinal-tap-ii"),
      releaseDate: "2025-09-12", genre: "Mockumentary comedy", director: "Rob Reiner",
      cast: ["Christopher Guest", "Michael McKean", "Harry Shearer", "Rob Reiner"],
      body: <><p>The fictional rock band reunites for a final concert, with documentarian Marty Di Bergi following along again. Christopher Guest, Michael McKean and Harry Shearer return as the band members, and Rob Reiner directs.</p><p><strong>Consider it for:</strong> mockumentary humor and the band's long-running mishaps. This Is Spinal Tap (1984) is the original film.</p></>,
    },
    {
      id: "the-long-walk", title: "The Long Walk", posterUrl: poster("the-long-walk"),
      releaseDate: "2025-09-12", genre: "Dystopian thriller", director: "Francis Lawrence",
      cast: ["Cooper Hoffman", "David Jonsson", "Mark Hamill"],
      body: <><p>Young participants enter a walking contest with lethal consequences for falling behind. Francis Lawrence directs this adaptation of Stephen King's novel, with Cooper Hoffman and David Jonsson among its leads.</p><p><strong>Consider it for:</strong> a standalone dystopian story about endurance and coercion. Reading the novel is optional, and its plot is best left unspoiled.</p></>,
    },
    {
      id: "a-big-bold-beautiful-journey", title: "A Big Bold Beautiful Journey", posterUrl: poster("a-big-bold-beautiful-journey"),
      releaseDate: "2025-09-19", genre: "Fantasy romance", director: "Kogonada",
      cast: ["Margot Robbie", "Colin Farrell"],
      body: <><p>Two strangers meet at a wedding and find themselves revisiting significant moments from their lives. Margot Robbie and Colin Farrell lead Kogonada's film, which uses a fantastical premise to explore memory and connection.</p><p><strong>Consider it for:</strong> a standalone romance with a speculative element.</p></>,
    },
    {
      id: "him", title: "HIM", posterUrl: poster("him-2025"),
      releaseDate: "2025-09-19", genre: "Sports horror", director: "Justin Tipping",
      cast: ["Marlon Wayans", "Tyriq Withers", "Julia Fox"],
      body: <><p>A young quarterback accepts an opportunity to train with his football idol, only to discover a disturbing side to the mentorship. Justin Tipping directs this horror film from Jordan Peele and Monkeypaw Productions.</p><p><strong>Consider it for:</strong> a standalone horror premise built around athletic ambition and idol worship.</p></>,
    },
    {
      id: "the-strangers-chapter-2", title: "The Strangers: Chapter 2", posterUrl: poster("the-strangers-chapter-2"),
      releaseDate: "2025-09-26", genre: "Slasher horror", director: "Renny Harlin",
      cast: ["Madelaine Petsch"],
      body: <><p>Madelaine Petsch returns as Maya in the second chapter of Renny Harlin's trilogy. The masked killers remain a threat as her ordeal continues beyond the first film.</p><p><strong>Consider it for:</strong> continuing the story from The Strangers: Chapter 1 (2024). That film begins this newer trilogy.</p></>,
    },
    {
      id: "gabbys-dollhouse", title: "Gabby's Dollhouse: The Movie", posterUrl: poster("gabbys-dollhouse-the-movie"),
      releaseDate: "2025-09-26", genre: "Family adventure", director: "Ryan Crego",
      cast: ["Laila Lockhart Kraner", "Kristen Wiig", "Gloria Estefan"],
      body: <><p>Gabby travels with her grandmother Gigi, then must recover her dollhouse after it falls into the hands of a cat enthusiast named Vera. Ryan Crego directs the film, which combines Gabby's real-world adventure with her animated friends.</p><p><strong>Consider it for:</strong> families familiar with the preschool series. Laila Lockhart Kraner plays Gabby; Kristen Wiig and Gloria Estefan join the cast in live-action roles.</p></>,
    },
  ],
  faq: [
    { question: "Which title is aimed at younger children?", answer: <>Gabby's Dollhouse: The Movie is the preschool-series adaptation in this selection. The animated Demon Slayer film serves a different audience and contains combat; check ratings and content guidance rather than judging suitability by animation alone.</> },
    { question: "Do I need to catch up before Infinity Castle?", answer: <>Yes, it continues Demon Slayer's existing story. The series through the Hashira Training arc supplies the character relationships and the setup for the Infinity Castle conflict.</> },
    { question: "Which films can I approach without earlier installments?", answer: <>HIM, The Long Walk and A Big Bold Beautiful Journey are standalone stories. The Strangers: Chapter 2, Downton Abbey: The Grand Finale and the other franchise entries benefit from earlier context.</> },
    { question: "Which horror premise should I look at?", answer: <>The Conjuring: Last Rites centers on a paranormal investigation; HIM connects horror with football ambition; The Strangers: Chapter 2 continues a masked-killer pursuit. Choose the setup that interests you, and check content guidance before watching.</> },
    { question: "Are these current cinema or streaming listings?", answer: <>No. This is a September 2025 US theatrical archive. Availability now depends on your country and provider; use the linked official film pages to continue your search.</> },
  ],
});
export default post;
