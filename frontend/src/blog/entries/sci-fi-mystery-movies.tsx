import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import editorialIllustration from "../components/editorialIllustration";

const cover = "/blog-assets/sci-fi-mystery-movies-cover.webp";
const catalog = (slug: string) => `https://www.justwatch.com/us/movie/${slug}`;
const films = [
  {
    id: "arrival", title: "Arrival", year: "2016", director: "Denis Villeneuve", runtime: "116 min",

    puzzle: "First contact", angle: "For a moving mystery about communication",
    viewing: "Paramount+ subscription", url: "https://www.paramountplus.com/movies/video/b252p_he2WOl_CT2pCO6vXWDXv1A5M9F/",
    premise: "Spacecraft appear around the world, and linguist Louise Banks is brought in to work out what their visitors are saying. Amy Adams plays a researcher whose first obstacle is basic but enormous: before anyone can ask why the aliens have come, both sides need a way to understand the question.",
    reason: "Start here if you want the investigation to carry emotional weight. Translation gives the film a concrete process to follow: a symbol, a tentative interpretation, another attempt. The military setting adds pressure without making every problem a battle. It is a patient choice for viewers who enjoy watching an idea gradually change the meaning of a scene. Expect grief and anxiety alongside the sense of discovery.",
  },
  {
    id: "moon", title: "Moon", year: "2009", director: "Duncan Jones", runtime: "97 min",

    puzzle: "Identity", angle: "For an intimate puzzle in an isolated workplace",
    viewing: "Digital rental or purchase", url: "https://tv.apple.com/us/movie/moon/umc.cmc.kn4jms59nt6y439vqjwgom31",
    premise: "Sam Bell is nearly finished with a three-year stint at a lunar mining base. His company is the computer GERTY, and home is a long way away. An accident interrupts the routine and gives Sam a reason to question the job he thought he understood. Sam Rockwell plays the exhausted worker at the center of it.",
    reason: "Choose Moon when you want a small cast and enough quiet to notice a change in someone's behavior. The base's workaday machinery makes the strange developments feel like a problem inside a real workplace. There is a human cost to the puzzle, so the appeal extends beyond guessing an explanation. It pairs well with Ex Machina, though Moon puts more emphasis on loneliness and the conditions of Sam's employment.",
  },
  {
    id: "coherence", title: "Coherence", year: "2013", director: "James Ward Byrkit", runtime: "About 89 min",

    puzzle: "Reality", angle: "For a dinner party that becomes a group investigation",
    viewing: "Digital rental or purchase", url: "https://tv.apple.com/us/movie/coherence/umc.cmc.hdoayzcx3u9ofxfawjrt3hgc",
    premise: "Eight friends get together for dinner on the night a comet passes overhead. Ordinary interruptions begin to feel connected, and the guests have to compare what they have seen with what the others remember. The less you know about the evening's complications, the more room the film has to surprise you.",
    reason: "This is the pick for people who enjoy arguing through a theory together. Conversation becomes part of the evidence, and the guests bring old tensions into every new decision. Its close, restless camerawork can feel uncomfortable; that fits a story in which nobody has a reliable overview. Give it your attention from the dinner onward. It is a better fit for a group willing to watch closely than for a party with the television on in the background.",
  },
  {
    id: "source-code", title: "Source Code", year: "2011", director: "Duncan Jones", runtime: "93 min",

    puzzle: "Time and evidence", angle: "For a brisk investigation with a ticking clock",
    viewing: "Digital rental or purchase", url: "https://tv.apple.com/us/movie/source-code/umc.cmc.3qh64tqrye0qklconl4j5ihmb",
    premise: "A soldier wakes on a Chicago commuter train in another man's body. His assignment is to identify a bomber, using a program that gives him access to the same short stretch of events. Jake Gyllenhaal plays an investigator who has to learn the rules of the assignment while doing the work.",
    reason: "Pick this if you like a suspect hunt and want the science-fiction mechanism to keep it moving. A repeated encounter can become useful evidence once Colter knows what to ask, which gives the familiar train carriage a fresh purpose on each return. The action is immediate and the questions are easy to grasp. There are violent explosions, and the story also asks you to care about the people caught inside the investigation.",
  },
  {
    id: "ex-machina", title: "Ex Machina", year: "2015", director: "Alex Garland", runtime: "108 min",

    puzzle: "Consciousness and trust", angle: "For a tense conversation where motives matter",
    viewing: "Digital rental or purchase", url: "https://tv.apple.com/us/movie/ex-machina/umc.cmc.3px5tjkllmjkrluv2ui9m6hbw",
    premise: "A young programmer, Caleb, visits his employer's remote home to evaluate an artificial intelligence called Ava. The task puts three people in an unequal relationship: the employee asking questions, the creator who controls the test and the being asked to prove she has a mind. Domhnall Gleeson, Oscar Isaac and Alicia Vikander play those roles.",
    reason: "Choose it for a mystery built from conversations and access to information. A pause, a locked door or the terms of an interview can matter as much as an explicit clue. The small cast makes it easy to keep track of what each person wants, while leaving room to reconsider those motives. This is an adult, uneasy watch with nudity, sexual material and violence. It suits viewers who want to discuss power and consent as well as artificial intelligence.",
  },
  {
    id: "dark-city", title: "Dark City", year: "1998", director: "Alex Proyas", runtime: "111 min — Director's Cut",

    puzzle: "Memory", angle: "For a noir mystery in an unfamiliar city",
    viewing: "Director's Cut: digital purchase", url: "https://play.google.com/store/movies/details/Dark_City_Director_s_Cut?hl=en&id=1fmPIU7x7-o",
    premise: "John Murdoch wakes without his memory and finds himself pursued through a city he cannot make sense of. People seem to know things about his life that he cannot confirm. Rufus Sewell plays the fugitive, with William Hurt, Jennifer Connelly and Kiefer Sutherland in the cast.",
    reason: "Pick Dark City for looming buildings, night streets and the uncertainty of having to investigate your own past. Its world is visually elaborate, so it offers a different kind of pleasure from the sparse rooms of Moon or Coherence. We recommend the Director's Cut for a first viewing: it removes the theatrical version's explanatory opening narration. Check the edition before paying; the roughly 100-minute theatrical cut is a different listing from the 111-minute version recommended here.",
  },
  {
    id: "minority-report", title: "Minority Report", year: "2002", director: "Steven Spielberg", runtime: "145 min",

    puzzle: "Prediction and guilt", angle: "For a full-scale futuristic detective thriller",
    viewing: "Digital rental or purchase", url: "https://tv.apple.com/us/movie/minority-report/umc.cmc.4e8pvt0eezl2rnq71x4nx3atn",
    premise: "In a future Washington, D.C., a police unit arrests people for murders predicted before they happen. Officer John Anderton believes in the system until it identifies him as a future killer. Tom Cruise plays a detective suddenly forced to investigate the evidence being used against him.",
    reason: "Choose this when you have time for the longest film on the list and want an investigation that opens out into a larger society. Chases, surveillance and questions about civil liberties grow from the same premise: what counts as proof when the alleged crime lies ahead? It gives you more physical action and more locations than most of these picks. Expect disturbing violence, including an unsettling medical sequence, alongside the detective work.",
  },
  {
    id: "gattaca", title: "Gattaca", year: "1997", director: "Andrew Niccol", runtime: "106 min",

    puzzle: "Identity and a murder", angle: "For a controlled, elegant thriller about passing as someone else",
    viewing: "Digital rental or purchase", url: "https://tv.apple.com/us/movie/gattaca/umc.cmc.5ezqaeo0qqkflzp5ofr6s33ny",
    premise: "In a society that sorts people by their genes, Vincent takes another man's identity to pursue a place on a space mission. A murder investigation at his workplace threatens to expose him. Ethan Hawke, Uma Thurman and Jude Law star in a story where a tiny biological trace can have life-changing consequences.",
    reason: "Gattaca is a useful choice if you enjoy the pressure of maintaining a deception. You know why Vincent needs to conceal his identity, which makes routine tests and ordinary questions feel dangerous. The murder supplies an investigation, but his ambition gives it personal stakes. Its measured pace and formal spaces suit a quieter movie night. Come for the tension between a person's capabilities and the record a system keeps about them.",
  },
  {
    id: "the-thirteenth-floor", title: "The Thirteenth Floor", year: "1999", director: "Josef Rusnak", runtime: "100 min",

    puzzle: "Memory and simulated reality", angle: "For a murder case with an unreliable frame of reference",
    viewing: "Digital rental or purchase", url: "https://tv.apple.com/us/movie/the-thirteenth-floor/umc.cmc.4zxdrzgea9fj0i3pi54278l3r",
    premise: "Douglas Hall works on a computer simulation of 1930s Los Angeles. When the project's leader is murdered, Hall becomes a suspect, with gaps in his recollection making it difficult to defend himself. Investigating the death means returning to a constructed world that already complicates the meaning of evidence.",
    reason: "Choose this for the overlap between a traditional murder mystery and questions about simulated experience. The period setting gives the investigation another visual world to move through, while Hall's missing memories keep his own account uncertain. It makes a useful companion to Dark City for viewers who want more late-1990s science-fiction noir. Avoid plot summaries that go beyond the initial murder: discovering the limits of the setup is part of the attraction.",
  },
  {
    id: "the-vast-of-night", title: "The Vast of Night", year: "2020", director: "Andrew Patterson", runtime: "About 90 min",

    puzzle: "An unexplained signal", angle: "For an eerie investigation driven by listening",
    viewing: "Digital rental or purchase", url: "https://tv.apple.com/us/movie/the-vast-of-night/umc.cmc.631ylsyfs43wyhf3x1he1wmhz",
    premise: "On a night in 1950s New Mexico, a switchboard operator and a radio DJ hear a strange frequency. Fay and Everett follow calls, recordings and local accounts to find its source. Sierra McCormick and Jake Horowitz play two young people whose practical knowledge of communications becomes a way into a much larger question.",
    reason: "Pick this if you enjoy a story that makes a voice on the telephone feel consequential. Long conversations and stretches of listening give the town room to acquire an unsettling atmosphere. It asks for patience with testimony, so it works especially well in a quiet room with clear sound. Pair it with Arrival for two different approaches to an unfamiliar signal: one intimate and local, the other operating under international pressure.",
  },
];

const post: BlogPost = {
  slug: "sci-fi-mystery-movies",
  title: "10 Sci-Fi Mystery Movies for Your Next Movie Night",
  seoTitle: "10 Sci-Fi Mystery Movies: A Spoiler-Free Watchlist",
  excerpt: "Pick a sci-fi mystery by the puzzle you want: identity, memory, time or first contact, with spoiler-free notes on mood, runtime and US viewing options.",
  date: "2026-11-06",
  modified: "2026-11-09",
  tags: ["Streaming & New Releases", "Sci-Fi", "Thriller"],
  coverUrl: "https://hard-quiz.com" + cover,
  listingCoverUrl: "https://hard-quiz.com/blog-assets/sci-fi-mystery-movies-640.webp",
  socialImagePath: "/blog-assets/sci-fi-mystery-movies-social.webp",
  contents: [
    { id: "choose-your-mystery", label: "Choose your kind of mystery" },
    ...films.map(film => ({ id: film.id, label: film.title })),
    { id: "before-you-watch", label: "Questions before you watch" },
    { id: "how-we-chose", label: "How we chose and checked the films" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Paramount — Arrival premise, credits and runtime", url: "https://www.paramount.com/movies/arrival" },
    { label: "Paramount+ US — Arrival viewing", url: films[0].url },
    { label: "Sony Pictures — Moon premise and digital editions", url: "https://www.sonypictures.com/movies/moon" },
    { label: "Apple TV Store US — Moon credits and runtime", url: films[1].url },
    { label: "Oscilloscope — Coherence premise", url: "https://oscilloscope.net/films/film/coherence/" },
    { label: "SFFILM — Coherence year, credits and 89-minute festival listing", url: "https://sffilm.org/event/coherence/" },
    { label: "Apple TV Store US — Coherence 2014 release and 88-minute listing", url: films[2].url },
    { label: "Apple TV Store US — Source Code premise, credits and runtime", url: films[3].url },
    { label: "A24 — Ex Machina premise, US release and runtime", url: "https://a24films.com/films/ex-machina" },
    { label: "Apple TV Store US — Ex Machina viewing", url: films[4].url },
    { label: "Google Play — Dark City Director's Cut purchase and 111-minute edition", url: films[5].url },
    { label: "Arrow Video US — Dark City editions and runtimes", url: "https://www.arrowvideo.com/p/4k/dark-city-limited-edition-4k-uhd/16425069/" },
    { label: "Paul Rowlands interviews Alex Proyas — Dark City opening narration", url: "https://www.money-into-light.com/2017/01/an-interview-with-alex-proyas-part-2-of.html" },
    { label: "Apple TV Store US — Minority Report premise, credits and runtime", url: films[6].url },
    { label: "Sony Pictures — Gattaca premise and digital editions", url: "https://www.sonypictures.com/movies/gattaca" },
    { label: "Apple TV Store US — Gattaca credits and runtime", url: films[7].url },
    { label: "Sony Pictures — The Thirteenth Floor premise and credits", url: "https://www.sonypictures.com/movies/thethirteenthfloor" },
    { label: "Apple TV Store US — The Thirteenth Floor runtime", url: films[8].url },
    { label: "Apple TV Store US — The Vast of Night US release, credits and runtime", url: films[9].url },
    { label: "RogerEbert.com — The Vast of Night filmmaking and tone", url: "https://www.rogerebert.com/reviews/the-vast-of-night-movie-review-2020" },
    ...["arrival-2016", "moon", "coherence", "source-code", "ex-machina", "dark-city-1998", "minority-report", "gattaca", "the-13th-floor", "the-vast-of-night"].map((slug, index) => ({ label: `JustWatch US — ${films[index].title} viewing cross-check`, url: catalog(slug) })),
  ],
  content: () => <>
    <p><strong>Start with <a href="#arrival">Arrival</a> for an emotional first-contact mystery, <a href="#source-code">Source Code</a> for a fast investigation or <a href="#coherence">Coherence</a> for a puzzle to discuss afterward.</strong> These ten sci-fi mystery movies make an unfamiliar rule part of the investigation. To solve the problem, someone has to work out how time, memory, identity or communication operates in their world.</p>
    <p>The notes below stay with the setup and the experience of watching. Use the table to choose a mood and a running time, then read that film's entry. Each story stands on its own, with no franchise homework required.</p>
    <figure><ArticleImage src={cover} width={1200} height={675} priority alt="Original Hard Quiz watchlist artwork with four questions about identity, reality, time and first contact." /></figure>

    <section className="hq-release-index hq-mystery-index" aria-labelledby="choose-your-mystery">
      <h2 id="choose-your-mystery" tabIndex={-1}>Choose your kind of sci-fi mystery</h2>
      <table>
        <caption>Ten films, with one US viewing route each. Catalogs checked November 6, 2026; rentals and purchases cost extra.</caption>
        <thead><tr><th scope="col">Film and puzzle</th><th scope="col">US viewing</th></tr></thead>
        <tbody>{films.map(film => <tr key={film.id}>
          <th scope="row"><a href={`#${film.id}`}>{film.title}</a><span className="hq-release-note">{film.puzzle}<br />{film.runtime}</span></th>
          <td><a href={film.url}>{film.viewing}</a></td>
        </tr>)}</tbody>
      </table>
    </section>
    <p>For a quieter night, choose <em>Moon</em> or <em>The Vast of Night</em>. For a more expansive thriller, give <em>Minority Report</em> the evening. <em>Gattaca</em> is a good starting point if the pressure of keeping a secret appeals more than a complicated science-fiction mechanism.</p>

    {films.map((film, index) => <section className="hq-watchlist-entry" key={film.id} aria-labelledby={film.id}>
      <h2 id={film.id} tabIndex={-1}>{index + 1}. {film.title} ({film.year})</h2>
      <p className="hq-watchlist-facts"><strong>{film.angle}</strong> · Directed by {film.director} · {film.runtime} · <a href={film.url}>{film.viewing}</a></p>
      {editorialIllustration(`sci-fi-mystery-${film.id}`)}
      <p>{film.premise}</p>
      <p>{film.reason}</p>
    </section>)}

    <section className="hq-article-faq" aria-labelledby="before-you-watch">
      <h2 id="before-you-watch" tabIndex={-1}>Questions before you watch</h2>
      <div><h3>Which of these sci-fi mysteries are under 100 minutes?</h3><p><em>Coherence</em>, <em>The Vast of Night</em>, <em>Source Code</em> and <em>Moon</em> all fit. <em>The Thirteenth Floor</em> is about 100 minutes, while the recommended Director's Cut of <em>Dark City</em> runs 111 minutes. Catalog runtimes can differ by a minute or two.</p></div>
      <div><h3>Which picks are the most unsettling?</h3><p><em>Coherence</em> turns a familiar social setting into a source of paranoia. <em>Dark City</em> has menacing imagery and murder scenes; <em>Ex Machina</em> adds sexual material and violence to its tension. For a quieter investigation with an eerie atmosphere, try <em>The Vast of Night</em>. A short runtime does not necessarily make a film a lighter watch.</p></div>
      <div><h3>Are these all detective stories with clear solutions?</h3><p>Some have a literal case to solve: <em>Source Code</em>, <em>Minority Report</em>, <em>Gattaca</em> and <em>The Thirteenth Floor</em>. Others turn understanding a situation into the central mystery. They vary in how much they explain and how much they leave open to interpretation. This list keeps the answers for the films themselves.</p></div>
    </section>

    <h2 id="how-we-chose" tabIndex={-1}>How we chose and checked the films</h2>
    <p>We selected ten standalone features in which a science-fiction premise changes what characters can know, test or trust. The order offers different ways into the genre. It is an editorial watchlist, and the recommendations compare the setup, pace and tone rather than rank endings. Distributor materials, film catalogs and published criticism inform the notes; this guide was prepared with AI assistance using the sources below.</p>
    <p>Years follow familiar film listings. <em>Coherence</em> is a 2013 film with a 2014 US release; its listings round to 88 or 89 minutes. <em>The Vast of Night</em> premiered at festivals in 2019 and reached US audiences in regular release in 2020, the year shown here. Allow about 90 minutes; catalogs list versions at 89–91 minutes. <em>Minority Report</em> uses the 145-minute Apple listing. <em>Dark City</em> specifically means the 111-minute Director's Cut.</p>
    <p>We checked public US viewing pages on <time dateTime="2026-11-06">November 6, 2026</time> and cross-checked digital offers against JustWatch US. The table supplies one route per film, rather than every available service. Apple TV Store rentals and purchases are separate from an Apple TV subscription. Availability and editions can change; playback and checkout were not tested.</p>
    <p>For recent discoveries, see our <Link to="/blog/best-sci-fi-movies-2026">sci-fi movies of 2026 watchlist</Link>. For a suspect hunt with a different tone, browse <Link to="/blog/movies-like-knives-out">movies like Knives Out</Link>. If the framing of <em>Dark City</em> or <em>Gattaca</em> catches your eye, our <Link to="/blog/why-2-39-1-feels-more-cinematic">2.39:1 widescreen explainer</Link> looks at how a wide frame organizes a scene.</p>
  </>,
};

export default post;
