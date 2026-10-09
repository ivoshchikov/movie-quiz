import { buildNewReleasesPost } from "../kits/new-release";
const CDN = "https://vgjfbcihppxbtrjcxoci.supabase.co/storage/v1/object/public/blog/new_releases/august-2025";
const poster = (name: string) => CDN + "/" + name + ".webp";

const post = buildNewReleasesPost({
  slug: "august-2025-new-movies-guide",
  title: "August 2025 Movie Releases: 7 Picks (US)",
  excerpt: "Seven August 2025 US theatrical picks, from The Bad Guys 2 and Freakier Friday to Weapons and Nobody 2, with release dates and spoiler-free summaries.",
  date: "2025-08-13", modified: "2026-10-09", archiveYear: 2025,
  monthLabel: "August 2025",
  tags: ["New Releases", "Movie Guide", "In Theaters", "Streaming & New Releases"],
  coverUrl: poster("bad-guys-2"), listingCoverUrl: poster("bad-guys-2"),
  intro: "August 2025 brought animated adventures, two very different comedy revivals and several darker alternatives to US theaters. This selection covers seven releases, including the English-language version of Ne Zha II. Use the dates below to explore the lineup; the summaries avoid major plot reveals.",
  sources: [
    { label: "Universal Pictures — The Bad Guys 2", url: "https://www.universalpictures.com/movies/the-bad-guys-2" },
    { label: "Paramount Pictures — The Naked Gun", url: "https://www.paramountpictures.com/movies/the-naked-gun" },
    { label: "Disney — Freakier Friday", url: "https://movies.disney.com/freakier-friday" },
    { label: "Warner Bros. Discovery — Weapons", url: "https://press.wbd.com/na/media-release/weapons-begins-streaming-exclusively-hbo-max-october-24?language_content_entity=en" },
    { label: "Universal Pictures — Nobody 2 production credits", url: "https://www.universalpicturesathome.com/press-release/nobody-2-press-release" },
    { label: "Focus Features — Honey Don't!", url: "https://www.focusfeatures.com/honey-dont" },
    { label: "A24 — Ne Zha II", url: "https://a24films.com/films/ne-zha-2" },
    { label: "A24 — Ne Zha II English-language release trailer", url: "https://www.youtube.com/watch?v=ETlOSBR92Fs" },
  ],
  films: [
    {
      id: "the-bad-guys-2", title: "The Bad Guys 2", posterUrl: poster("bad-guys-2"),
      releaseDate: "2025-08-01", genre: "Animated adventure", director: "Pierre Perifel",
      castLabel: "Voices", cast: ["Sam Rockwell", "Marc Maron", "Awkwafina"],
      body: <><p>Wolf and his former criminal crew are trying to make an honest living when a new group of thieves draws them into another heist. The sequel continues DreamWorks' animated adaptation of Aaron Blabey's books.</p><p><strong>Consider it for:</strong> an animated caper with an ensemble of animal characters. The first film introduces the crew and their change of heart.</p></>,
    },
    {
      id: "the-naked-gun", title: "The Naked Gun", posterUrl: poster("naked-gun-2025"),
      releaseDate: "2025-08-01", genre: "Comedy", director: "Akiva Schaffer",
      cast: ["Liam Neeson", "Pamela Anderson"],
      body: <><p>Liam Neeson plays Frank Drebin Jr., the next generation of Police Squad's remarkably accident-prone law enforcement. Akiva Schaffer's revival brings the franchise's police spoof premise to a new lead, alongside Pamela Anderson.</p><p><strong>Consider it for:</strong> absurd detective comedy and visual gags. It follows the original Police Squad stories with Frank Drebin's son.</p></>,
    },
    {
      id: "freakier-friday", title: "Freakier Friday", posterUrl: poster("freaky-friday-2"),
      releaseDate: "2025-08-08", genre: "Comedy", director: "Nisha Ganatra",
      cast: ["Jamie Lee Curtis", "Lindsay Lohan", "Julia Butters", "Sophia Hammons"],
      body: <><p>Tess and Anna Coleman return years after their original body swap. Anna now has a daughter and a soon-to-be stepdaughter, bringing another generation into the family's identity mix-ups.</p><p><strong>Consider it for:</strong> family comedy and a return to the characters of Disney's 2003 Freaky Friday.</p></>,
    },
    {
      id: "weapons", title: "Weapons", posterUrl: poster("weapons-2025"),
      releaseDate: "2025-08-08", genre: "Horror", director: "Zach Cregger",
      cast: ["Josh Brolin", "Julia Garner"],
      body: <><p>When almost an entire class of children disappears on the same night, the people left behind struggle to understand what happened. Zach Cregger's original horror story approaches that mystery through the surrounding community.</p><p><strong>Consider it for:</strong> a standalone horror mystery. There is no earlier installment to catch up on, and the less you know about its reveals, the better.</p></>,
    },
    {
      id: "nobody-2", title: "Nobody 2", posterUrl: poster("nobody-2"),
      releaseDate: "2025-08-15", genre: "Action comedy", director: "Timo Tjahjanto",
      cast: ["Bob Odenkirk", "Connie Nielsen", "Sharon Stone"],
      body: <><p>Hutch takes his family on vacation, but an encounter with local troublemakers puts them in the path of a crime boss. Bob Odenkirk returns to the role, with Timo Tjahjanto directing this sequel.</p><p><strong>Consider it for:</strong> action with a darkly comic premise. Nobody (2021) introduces Hutch and his family.</p></>,
    },
    {
      id: "honey-dont", title: "Honey Don't!", posterUrl: poster("honey-dont"),
      releaseDate: "2025-08-22", genre: "Dark comedy", director: "Ethan Coen",
      cast: ["Margaret Qualley", "Aubrey Plaza", "Chris Evans", "Charlie Day"],
      body: <><p>Private investigator Honey O'Donahue investigates unusual deaths connected to a church. Ethan Coen and Tricia Cooke's dark comedy stars Margaret Qualley as Honey, with Aubrey Plaza and Chris Evans among the supporting leads.</p><p><strong>Consider it for:</strong> a standalone crime story with a comic angle.</p></>,
    },
    {
      id: "ne-zha-ii", title: "Ne Zha II", posterUrl: poster("ne-zha-2"),
      releaseDate: "2025-08-22", releaseNote: "English-language version",
      genre: "Animated fantasy", director: "Jiao Zi",
      castLabel: "English voices", cast: ["Michelle Yeoh", "Crystal Lee", "Vincent Rodriguez III", "Aleks Le"],
      body: <><p>The Chinese animated fantasy continues Ne Zha's story, drawing on mythology as its young hero confronts a threat to humanity. A24 and CMC Pictures brought an English-language version to US theaters in August.</p><p><strong>Consider it for:</strong> mythological adventure and animation. The date here refers to the English-language release, not the film's original Chinese premiere.</p></>,
    },
  ],
  faq: [
    { question: "Which titles are family-oriented?", answer: <>The Bad Guys 2 is the animated adventure in this selection; Freakier Friday is Disney's multigenerational body-swap comedy. Check the official age rating and content guidance for your family. Animation alone does not make every film suitable for young children.</> },
    { question: "Which is the standalone horror option?", answer: <>Weapons is the original horror mystery here. You do not need another film to understand its setup; avoid detailed plot breakdowns if you want to preserve the surprises.</> },
    { question: "What should I watch before the sequels?", answer: <>The Bad Guys (2022), Freaky Friday (2003), Nobody (2021) and Ne Zha (2019) introduce the returning characters in their respective follow-ups.</> },
    { question: "Do these dates tell me where the movies are streaming now?", answer: <>No. They record the US theatrical releases in August 2025. Current rental and streaming availability varies by country and service; the official film pages linked below are a starting point.</> },
  ],
});
export default post;
