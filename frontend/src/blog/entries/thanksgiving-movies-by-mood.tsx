import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import artwork from "../thanksgivingArtwork.json";
import ExternalLink from "../components/ExternalLink";

const cover = "/blog-assets/thanksgiving-movies-by-mood-cover.webp";
const films = [
  {
    id: "planes-trains-and-automobiles", title: "Planes, Trains and Automobiles", year: "1987", director: "John Hughes", runtime: "93 min", rating: "R", mood: "Travel chaos with a warm heart",
    premise: "Neal Page wants to get home to Chicago for Thanksgiving. Del Griffith, a talkative shower-curtain-ring salesman, becomes his unwanted traveling companion as the journey keeps going wrong. Steve Martin's tightly wound impatience and John Candy's boundless sociability give every new setback someone to collide with.",
    reason: "Choose this when you want movement, mishaps and a clear destination. The holiday gives the trip its urgency, but the friendship is what makes the detours worth following. It is the most straightforward comedy-night starting point here, especially if your own holiday has involved a delayed flight. Leave room for a tender streak beneath the irritation.",
    caution: "Strong language, including a sustained profane outburst, plus sexual references. Its warmth does not make it a children's film.",
  },
  {
    id: "home-for-the-holidays", title: "Home for the Holidays", year: "1995", director: "Jodie Foster", runtime: "103 min", rating: "PG-13", mood: "A funny, messy family reunion",
    premise: "After losing her job, Claudia Larson returns to her parents' home for Thanksgiving without her teenage daughter. Holly Hunter plays a woman who already has enough to manage before the family starts asking questions. Robert Downey Jr., Anne Bancroft and Charles Durning help fill the house with competing versions of how the visit ought to go.",
    reason: "Pick this if you recognize the way a family visit can turn an adult back into somebody's exasperated child. The humor comes from interruptions, old roles and people who cannot quite leave one another alone. It is more prickly than a cozy holiday sitcom, but less relentlessly anxious than Krisha. A good choice for a group comfortable laughing at awkward relatives.",
    caution: "Sexual references, language and arguments. Expect affection mixed with embarrassment, rather than an entirely gentle gathering.",
  },
  {
    id: "pieces-of-april", title: "Pieces of April", year: "2003", director: "Peter Hedges", runtime: "About 81 min", rating: "PG-13", mood: "A small, bittersweet attempt to reconnect",
    premise: "April Burns invites her estranged family to Thanksgiving in her New York apartment. Her mother is seriously ill, so the meal carries more weight than an ordinary invitation. When the oven fails, April has to ask people in the building for help while her family makes its own difficult journey toward her.",
    reason: "Choose it for a short film in which a practical problem becomes a way to approach a painful relationship. Katie Holmes gives the hosting effort a vulnerable center: the dinner does not need to be perfect, but April needs the attempt to mean something. This is the intimate, improvised alternative to a lavish holiday spread. It suits a quiet evening when a little sadness is welcome alongside the humor.",
    caution: "Cancer, family estrangement, language and sexual material. The cooking mishaps are comic; the reason for the reunion is serious.",
  },
  {
    id: "whats-cooking", title: "What's Cooking?", year: "2000", director: "Gurinder Chadha", runtime: "109 min", rating: "PG-13", mood: "Four tables, food and complicated families",
    premise: "Four Los Angeles households prepare Thanksgiving dinner, bringing different traditions and unresolved disagreements to the table. Gurinder Chadha moves among Black, Jewish, Latino and Vietnamese American families. Food provides a shared occasion without making the guests' expectations, identities or relationships interchangeable.",
    reason: "Pick this when the preparation of a meal is part of what you enjoy about a holiday film. Its ensemble structure lets you compare who gets welcomed, who has to explain themselves and which subjects a household tries to avoid. There is room for humor and generosity, but dinner also exposes conflicts. Give it more attention than a background cooking show; several family stories are unfolding at once.",
    caution: "Prejudice, infidelity, sexual references and a frightening incident involving a gun. The food-centered premise comes with adult tension.",
  },
  {
    id: "krisha", title: "Krisha", year: "2015", director: "Trey Edward Shults", runtime: "81 min", rating: "R", mood: "An intensely uneasy homecoming",
    premise: "Krisha returns to her sister's Texas home on Thanksgiving, hoping to reconnect with relatives who have reasons to be wary. Preparing the turkey gives her a role in the gathering, but fitting back into the family is much harder. Krisha Fairchild plays the returning guest in Trey Edward Shults's debut feature.",
    reason: "Choose this only when you actively want the holiday to feel uncomfortable. Everyday household activity becomes pressure on a person struggling to find her place, and the close attention to Krisha makes the large gathering feel isolating. It is a strong contrast to the more forgiving comic rhythms of Home for the Holidays. Plan a quiet room and an audience ready for distress rather than festive reassurance.",
    caution: "Substance abuse, addiction, rejection, strong language and emotional volatility. This is the heaviest pick here; avoid it for an easygoing group watch.",
  },
  {
    id: "the-humans", title: "The Humans", year: "2021", director: "Stephen Karam", runtime: "106 min", rating: "R", mood: "Family drama with an eerie atmosphere",
    premise: "The Blake family gathers for Thanksgiving at a daughter's New York apartment. Across one evening, conversation brings worries about work, money, health and relationships into an unfamiliar space. Stephen Karam adapts his own play, with an ensemble including Richard Jenkins, Jayne Houdyshell, Beanie Feldstein, Amy Schumer, Steven Yeun and June Squibb.",
    reason: "Choose it for the feeling of overhearing a family that knows one another well and still struggles to talk. The apartment's noises and dim corners make ordinary discomfort feel ominous. It rewards attention to pauses and rooms as much as to dialogue. Viewers drawn to quiet dread may find it compelling; anyone expecting a brisk horror plot should approach it as an ensemble drama first.",
    caution: "Illness, dementia, financial anxiety, sexual references and language. Its dark humor does not remove the weight of the conversation.",
  },
  {
    id: "addams-family-values", title: "Addams Family Values", year: "1993", director: "Barry Sonnenfeld", runtime: "94 min", rating: "PG-13", mood: "A macabre comic detour",
    premise: "A new baby and a new nanny upset the Addams household, while Wednesday and Pugsley are sent to summer camp. The Thanksgiving connection is a camp pageant: a deliberately cheerful version of the holiday meets Wednesday Addams. The film as a whole is not set during a Thanksgiving family visit.",
    reason: "Pick it when your group prefers deadpan jokes and gothic absurdity to a sentimental dinner. The pageant makes it a seasonal conversation starter, but the broader appeal is the Addams family's complete confidence in its own strangeness. It also gives this list a useful change of pace after so many realistic arguments. You can enjoy the sequel's central setup without turning the evening into a marathon.",
    caution: "Macabre violence, sexual innuendo and dark jokes involving children and a baby. Check suitability for younger viewers even though it is the most cartoonish pick here.",
  },
];

function renderFilmEntry(film: typeof films[number]) {
  const image = artwork[film.id as keyof typeof artwork];
  return <section className="hq-watchlist-entry" aria-labelledby={film.id}>
    <h3 id={film.id} tabIndex={-1}>{film.title} ({film.year})</h3>
    <p className="hq-watchlist-facts"><strong>{film.mood}</strong> · Directed by {film.director} · {film.runtime} · US rating: {film.rating}</p>
    <div className="hq-film-layout">
      <figure className="hq-store-poster">
        <ExternalLink href={image.storeUrl} aria-label={`View ${film.title} in the US Apple TV Store`}>
          <ArticleImage src={image.src} width={image.width} height={image.height} sizes="(max-width: 600px) 180px, 190px" alt={image.alt} />
        </ExternalLink>
        <figcaption>Promotional store poster via Apple iTunes. Film artwork © its respective rights holders.</figcaption>
        <ExternalLink className="hq-store-badge" href={image.storeUrl} aria-label={`Get ${film.title} on iTunes — US store`}>
          <img src="/blog-assets/itunes-store-get-badge.svg" width={140} height={41} alt="Get it on iTunes" loading="lazy" decoding="async" />
        </ExternalLink>
      </figure>
      <div className="hq-film-copy">
        <p>{film.premise}</p>
        <p>{film.reason}</p>
        <p><strong>Tone note:</strong> {film.caution}</p>
        <p><ExternalLink href={image.storeUrl}>Check US rental or purchase options for {film.title}</ExternalLink>.</p>
      </div>
    </div>
  </section>;
}

const post: BlogPost = {
  slug: "thanksgiving-movies-by-mood",
  title: "Thanksgiving Movies: What to Watch by Mood",
  seoTitle: "Thanksgiving Movies: A Guide by Mood",
  excerpt: "Choose a Thanksgiving film for your evening, from holiday travel comedies to tense family dramas, with tone notes and checked US viewing options.",
  date: "2026-11-09",
  tags: ["Streaming & New Releases", "Comedy", "Drama"],
  coverUrl: "https://hard-quiz.com" + cover,
  listingCoverUrl: "https://hard-quiz.com/blog-assets/thanksgiving-movies-by-mood-640.webp",
  socialImagePath: "/blog-assets/thanksgiving-movies-by-mood-social.webp",
  contents: [
    { id: "quick-picks", label: "Pick your mood" },
    { id: "for-laughs", label: "For laughs and familiar chaos" },
    { id: "bittersweet", label: "For food and bittersweet connection" },
    { id: "family-tension", label: "For tense adult drama" },
    { id: "dark-comedy", label: "For macabre comedy" },
    { id: "before-you-watch", label: "Questions before you watch" },
    { id: "how-we-chose", label: "How we chose and checked" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Paramount — Planes, Trains and Automobiles", url: "https://www.paramountpictures.com/movies/planes-trains-and-automobiles" },
    { label: "Paramount — Home for the Holidays", url: "https://www.paramount.com/movies/home-for-the-holidays" },
    { label: "BAM — Pieces of April", url: "https://www.bam.org/film/2025/nyc2000s-pieces-of-april" },
    { label: "A24 — Krisha, including its March 18, 2016 US release", url: "https://a24films.com/films/krisha" },
    { label: "Visit Films — Krisha's 2015 film listing", url: "https://www.visitfilms.com/krisha" },
    { label: "A24 catalog — The Humans", url: "https://catalog.a24films.com/collections/5" },
    { label: "Slant Magazine — The Humans, tone and apartment sound", url: "https://www.slantmagazine.com/film/the-humans-review-stephen-karam/" },
    { label: "Common Sense Media — What's Cooking? content guidance", url: "https://www.commonsensemedia.org/movie-reviews/whats-cooking" },
    { label: "Paramount — Addams Family Values", url: "https://www.paramount.com/movies/addams-family-values" },
    { label: "AARP — the Thanksgiving pageant in Addams Family Values", url: "https://www.aarp.org/entertainment/movies-for-grownups/thanksgiving-movies.html" },
    ...films.map(film => ({ label: `Apple TV Store US — ${film.title} viewing and film details`, url: artwork[film.id as keyof typeof artwork].storeUrl })),
    { label: "US Office of Personnel Management — 2026 Thanksgiving date", url: "https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/" },
  ],
  content: () => <>
    <p><strong>For a funny Thanksgiving movie, start with <a href="#planes-trains-and-automobiles">Planes, Trains and Automobiles</a>. For a short, bittersweet story, choose <a href="#pieces-of-april">Pieces of April</a>. For a deliberately tense evening, try <a href="#krisha">Krisha</a> or <a href="#the-humans">The Humans</a>.</strong> The best choice depends on the room: a family reunion comedy and an anxious family drama can share a holiday without creating the same movie night.</p>
    <p>These seven Thanksgiving movies are grouped by mood, with running times, US ratings and a tone note for each. Six make the holiday part of their central story; <em>Addams Family Values</em> earns its place through a specific Thanksgiving pageant. This is a watchlist for adults and older viewers, rather than a children's holiday lineup.</p>
    <figure><ArticleImage src={cover} width={1200} height={675} priority alt="Original Hard Quiz illustration grouping Thanksgiving films by mood." /><figcaption>Choose the mood before you set the table. Original Hard Quiz illustration.</figcaption></figure>

    <section className="hq-release-index hq-mystery-index" aria-labelledby="quick-picks">
      <h2 id="quick-picks" tabIndex={-1}>Pick a Thanksgiving movie by mood</h2>
      <table>
        <caption>Seven picks, not a ranking. US store listings checked November 9, 2026. Rentals and purchases cost extra.</caption>
        <thead><tr><th scope="col">Film and running time</th><th scope="col">Mood and audience</th></tr></thead>
        <tbody>{films.map(film => <tr key={film.id}>
          <th scope="row"><a href={`#${film.id}`}>{film.title}</a><span className="hq-release-note">{film.runtime} · {film.year}</span></th>
          <td>{film.mood}<span className="hq-release-note">US rating: {film.rating}</span></td>
        </tr>)}</tbody>
      </table>
    </section>
    <p>If your group wants a lively comedy, stay with the first two picks. If the meal and an attempt at reconciliation are the draw, move to <em>Pieces of April</em> or <em>What's Cooking?</em>. Save <em>Krisha</em> and <em>The Humans</em> for people who have agreed that an uncomfortable evening is part of the appeal.</p>

    <h2 id="for-laughs" tabIndex={-1}>For laughs and familiar holiday chaos</h2>
    {renderFilmEntry(films[0])}
    {renderFilmEntry(films[1])}
    <h2 id="bittersweet" tabIndex={-1}>For food and bittersweet connection</h2>
    {renderFilmEntry(films[2])}
    {renderFilmEntry(films[3])}
    <h2 id="family-tension" tabIndex={-1}>For tense adult family drama</h2>
    {renderFilmEntry(films[4])}
    {renderFilmEntry(films[5])}
    <h2 id="dark-comedy" tabIndex={-1}>For a macabre comic detour</h2>
    {renderFilmEntry(films[6])}

    <section className="hq-article-faq" aria-labelledby="before-you-watch">
      <h2 id="before-you-watch" tabIndex={-1}>Questions before you watch</h2>
      <div><h3>Which Thanksgiving movie should we put on after dinner?</h3><p><em>Planes, Trains and Automobiles</em> is the clearest comedy pick if strong language is acceptable. <em>Home for the Holidays</em> keeps the humor inside a family reunion. For a quieter evening with emotional stakes, choose <em>Pieces of April</em>. Ask the group before switching to the intense family distress of <em>Krisha</em>.</p></div>
      <div><h3>Are these Thanksgiving movies suitable for children?</h3><p>This list does not provide an all-ages recommendation. Its PG-13 and R films include sexual references, language, substance abuse or upsetting family situations. Even the comic <em>Addams Family Values</em> has macabre violence and adult jokes. Use the individual tone notes and the film's full content guidance when choosing for a mixed-age group.</p></div>
      <div><h3>Why is Addams Family Values a Thanksgiving movie?</h3><p>Wednesday and Pugsley take part in a Thanksgiving pageant at summer camp. That sequence gives it a memorable connection to the holiday, while the wider story follows the Addams household and a new nanny. Choose it for seasonal dark humor, rather than a story about guests coming home for Thanksgiving dinner.</p></div>
      <div><h3>Which films fit a shorter evening?</h3><p><em>Pieces of April</em> and <em>Krisha</em> run about 80 minutes, but they offer very different experiences. The former centers on a fragile effort to host; the latter is an intense drama about a troubled return. <em>Planes, Trains and Automobiles</em> and <em>Addams Family Values</em> are both about an hour and a half.</p></div>
    </section>

    <h2 id="how-we-chose" tabIndex={-1}>How we chose and checked the films</h2>
    <p>We chose features that give Thanksgiving a meaningful role, plus one clearly labeled pageant-related exception. The groups compare tone and viewing company rather than declare a single winner. Distributor materials, US film-store listings and the sources below informed this guide; it was prepared with AI assistance and editorial source checks. The notes stay with the setup and avoid revealing endings.</p>
    <p>Years follow familiar film listings. <em>Krisha</em> is a 2015 film that opened theatrically in the US on March 18, 2016. Running times follow the linked US digital catalogs; editions and rounding can differ by a minute or two. <em>The Humans</em> is listed at 106 minutes by Apple and 108 minutes in A24's catalog. <em>Pieces of April</em> is approximately 80–81 minutes.</p>
    <p>We checked the corresponding US Apple TV Store listings on <time dateTime="2026-11-09">November 9, 2026</time>. Each poster and its store badge links to that film's rental or purchase listing. These are separate transactions from an Apple TV subscription; catalog availability, price and edition can change. Playback and checkout were not tested. The artwork is promotional store material, with rights retained by the respective owners. iTunes is a trademark of Apple Inc., registered in the U.S. and other countries.</p>
    <p>US Thanksgiving falls on November 26 in 2026. For films opening around the holiday, see our <Link to="/blog/november-2026-movie-releases">November 2026 movie release calendar</Link>. For an evening of suspects and family secrets, try our <Link to="/blog/movies-like-knives-out">movies like Knives Out</Link> watchlist.</p>
  </>,
};

export default post;
