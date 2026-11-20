import { buildNewReleasesPost } from "../kits/new-release";

const post = buildNewReleasesPost({
  slug: "august-2025-new-movies-guide",
  title: "August 2025 Movie Releases: 7 Picks (US)",
  excerpt: "An August 2025 US release archive: seven films compared by the kind of return they offer, from family reunions and comedy revivals to an original horror mystery.",
  date: "2025-08-13", modified: "2026-11-21", archiveYear: 2025,
  monthLabel: "August 2025",
  tags: ["New Releases", "Movie Guide", "In Theaters", "Streaming & New Releases"],
  coverUrl: "https://hard-quiz.com/blog-assets/original/archive-august-2025-cover.webp",
  listingCoverUrl: "https://hard-quiz.com/blog-assets/original/archive-august-2025-cover-640.webp",
  socialImagePath: "/blog-assets/original/archive-august-2025-social.webp",
  intro: "August 2025 had a question for returning moviegoers: what exactly were you hoping to get back? A familiar family, an old comic rhythm, a crew that had supposedly gone straight? Five of these seven picks revisit characters or a comedy franchise. Weapons and Honey Don't! supply the fresh starts. This US theatrical archive compares what each invitation offers; its dates describe that month, while the recommendations help you decide which film to seek out now.",
  sources: [
    { label: "Universal Pictures — The Bad Guys 2", url: "https://www.universalpictures.com/movies/the-bad-guys-2" },
    { label: "Paramount Pictures — The Naked Gun", url: "https://www.paramount.com/movies/the-naked-gun" },
    { label: "Disney — Freakier Friday", url: "https://movies.disney.com/freakier-friday" },
    { label: "Warner Bros. Discovery — Weapons", url: "https://press.wbd.com/na/media-release/weapons-begins-streaming-exclusively-hbo-max-october-24?language_content_entity=en" },
    { label: "Universal Pictures — Nobody 2 production credits", url: "https://www.universalpicturesathome.com/press-release/nobody-2-press-release" },
    { label: "Focus Features — Honey Don't!", url: "https://www.focusfeatures.com/honey-dont" },
    { label: "A24 — Ne Zha II", url: "https://a24films.com/films/ne-zha-2" },
    { label: "A24 — Ne Zha II English-language release trailer", url: "https://www.youtube.com/watch?v=ETlOSBR92Fs" },
  ],
  films: [
    {
      id: "the-bad-guys-2", title: "The Bad Guys 2", posterId: "august-2025-bad-guys-2",
      releaseDate: "2025-08-01", genre: "Animated adventure", director: "Pierre Perifel",
      castLabel: "Voices", cast: ["Sam Rockwell", "Marc Maron", "Awkwafina"],
      body: <><p>Wolf and his crew are attempting the least convincing career change in the room: former thieves trying to earn an honest living. A new crew pulls them into another heist in this continuation of DreamWorks' adaptation of Aaron Blabey's books.</p><p>The reason to choose it over the month's other family return, <em>Freakier Friday</em>, is the pleasure of a team under pressure. A caper gives each personality a job and then asks those personalities to cooperate. Start with <em>The Bad Guys</em> (2022) if their attempted reform is the part that interests you; the sequel's premise gets more mileage once you know what they are reforming from.</p></>,
    },
    {
      id: "the-naked-gun", title: "The Naked Gun", posterId: "august-2025-naked-gun-2025",
      releaseDate: "2025-08-01", genre: "Comedy", director: "Akiva Schaffer",
      cast: ["Liam Neeson", "Pamela Anderson"],
      body: <><p>Liam Neeson inherits Police Squad's dubious competence as Frank Drebin Jr., with Pamela Anderson joining Akiva Schaffer's police spoof. The casting is already an invitation to a particular joke: an authoritative face can make a ridiculous situation funnier.</p><p>This is the choice for a group that wants comedy to interrupt the detective story at every opportunity. Compare it with <em>Honey Don't!</em>: both start with an investigation, but this invitation is to outright spoof, while Honey's is to a stranger crime comedy. Knowledge of the original Drebin explains the family connection; choose the new film because you want its comic approach, rather than to complete a case file.</p></>,
    },
    {
      id: "freakier-friday", title: "Freakier Friday", posterId: "august-2025-freaky-friday-2",
      releaseDate: "2025-08-08", genre: "Comedy", director: "Nisha Ganatra",
      cast: ["Jamie Lee Curtis", "Lindsay Lohan", "Julia Butters", "Sophia Hammons"],
      body: <><p>Tess and Anna Coleman return to a family that has grown since their first body swap. Anna now has a daughter and a prospective stepdaughter. The extra generation changes the useful question from how mother and daughter misunderstand each other to how several people might all be right about different parts of a family argument.</p><p>Pick it when the returning faces are part of the attraction: Jamie Lee Curtis and Lindsay Lohan supply the connection to <em>Freaky Friday</em> (2003). That earlier film is the most useful preparation. The attraction here is a comic family negotiation, a different evening from the chase-and-heist company of <em>The Bad Guys 2</em>.</p></>,
    },
    {
      id: "weapons", title: "Weapons", posterId: "august-2025-weapons-2025",
      releaseDate: "2025-08-08", genre: "Horror", director: "Zach Cregger",
      cast: ["Josh Brolin", "Julia Garner"],
      body: <><p>Almost an entire class of children disappears on one night. Zach Cregger's horror mystery starts with the people who remain, each confronted by an absence they cannot explain.</p><p>This earns the month's clearest fresh-start recommendation because its shared event gives a community a reason to become suspicious of itself. Notice how the premise distributes the problem: a classroom, a home and a neighbourhood would each register the same disappearance differently. Choose it for that investigation and dread. Keep longer synopses closed; knowing the answer would remove the reason for following those different viewpoints.</p></>,
    },
    {
      id: "nobody-2", title: "Nobody 2", posterId: "august-2025-nobody-2",
      releaseDate: "2025-08-15", genre: "Action comedy", director: "Timo Tjahjanto",
      cast: ["Bob Odenkirk", "Connie Nielsen", "Sharon Stone"],
      body: <><p>Hutch's family vacation runs into local trouble and a crime boss. Bob Odenkirk returns, with Timo Tjahjanto directing the sequel.</p><p>The family outing is a useful pressure cooker for this action-comedy premise: the person trying to have an ordinary holiday is unusually equipped to make it extraordinary. Put it beside <em>The Naked Gun</em> when choosing the evening's comic violence. Do you want a police spoof, or an action film whose attempt at domestic normality keeps going wrong? <em>Nobody</em> (2021) introduces Hutch and makes that second invitation clearer.</p></>,
    },
    {
      id: "honey-dont", title: "Honey Don't!", posterId: "august-2025-honey-dont",
      releaseDate: "2025-08-22", genre: "Dark comedy", director: "Ethan Coen",
      cast: ["Margaret Qualley", "Aubrey Plaza", "Chris Evans", "Charlie Day"],
      body: <><p>Honey O'Donahue investigates strange deaths connected to a church. Margaret Qualley plays the private detective in Ethan Coen and Tricia Cooke's dark comedy, with Aubrey Plaza and Chris Evans among the cast.</p><p>The church gives this case a useful social setting: an institution built around trust is an interesting place to ask suspicious questions. It is the standalone crime-comedy alternative in a month crowded with returns. Choose it when you want to meet a new investigator; choose <em>The Naked Gun</em> when you want the investigation itself treated as comic target practice.</p></>,
    },
    {
      id: "ne-zha-ii", title: "Ne Zha II", posterId: "august-2025-ne-zha-2",
      releaseDate: "2025-08-22", releaseNote: "English-language version",
      genre: "Animated fantasy", director: "Jiao Zi",
      castLabel: "English voices", cast: ["Michelle Yeoh", "Crystal Lee", "Vincent Rodriguez III", "Aleks Le"],
      body: <><p>The Chinese animated fantasy continues Ne Zha's story as its young hero confronts a threat to humanity. A24 and CMC Pictures brought this English-language version to US cinemas in August; that is the release recorded here.</p><p>This is the mythological-adventure route through the lineup. Its connection to an earlier story makes <em>Ne Zha</em> (2019) more useful preparation than assuming that an animated sequel will explain every relationship from scratch. Check the language and version on a current listing: the August date identifies an English-language release, and cannot stand in for the original Chinese premiere or a promise about today's available editions.</p></>,
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
