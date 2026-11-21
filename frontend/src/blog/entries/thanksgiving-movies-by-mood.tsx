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
    reason: "The trip has one simple objective: get Neal home. Putting the impatient Steve Martin beside the sociable John Candy means every delay also prolongs a conversation Neal did not order. That is the comic engine to choose this for. We put it first for a lively group because the journey keeps giving everybody a new practical disaster to recognise. Beneath the irritation is a tender streak; a household exhausted by its own travel may appreciate both halves of that bargain.",
    caution: "Strong language, including a sustained profane outburst, plus sexual references. Its warmth does not make it a children's film.",
  },
  {
    id: "home-for-the-holidays", title: "Home for the Holidays", year: "1995", director: "Jodie Foster", runtime: "103 min", rating: "PG-13", mood: "A funny, messy family reunion",
    premise: "After losing her job, Claudia Larson returns to her parents' home for Thanksgiving without her teenage daughter. Holly Hunter plays a woman who already has enough to manage before the family starts asking questions. Robert Downey Jr., Anne Bancroft and Charles Durning help fill the house with competing versions of how the visit ought to go.",
    reason: "The telling detail is the return itself: an adult arrives with a life of her own and is promptly somebody’s child again. Old roles give the interruptions their force. Choose this when your group can enjoy recognition without turning the screening into a discussion of which relative resembles whom. Compared with Planes, Trains and Automobiles, the obstacle has already been reached: everybody is home. Its prickly affection makes it a gentler family gathering than Krisha’s.",
    caution: "Sexual references, language and arguments. Expect affection mixed with embarrassment, rather than an entirely gentle gathering.",
  },
  {
    id: "pieces-of-april", title: "Pieces of April", year: "2003", director: "Peter Hedges", runtime: "About 81 min", rating: "PG-13", mood: "A small, bittersweet attempt to reconnect",
    premise: "April Burns invites her estranged family to Thanksgiving in her New York apartment. Her mother is seriously ill, so the meal carries more weight than an ordinary invitation. When the oven fails, April has to ask people in the building for help while her family makes its own difficult journey toward her.",
    reason: "A broken oven makes a reconciliation depend on the neighbours. That small practical failure is our reason for choosing this film: April’s wish to host becomes visible work, and asking strangers for help becomes part of asking her family to come closer. It is the intimate alternative to the several households in What’s Cooking? Reserve a quiet 80-odd minutes. The cooking problem invites comedy; her mother’s illness gives the invitation a weight a cheerful holiday label would miss.",
    caution: "Cancer, family estrangement, language and sexual material. The cooking mishaps are comic; the reason for the reunion is serious.",
  },
  {
    id: "whats-cooking", title: "What's Cooking?", year: "2000", director: "Gurinder Chadha", runtime: "109 min", rating: "PG-13", mood: "Four tables, food and complicated families",
    premise: "Four Los Angeles households prepare Thanksgiving dinner, bringing different traditions and unresolved disagreements to the table. Gurinder Chadha moves among Black, Jewish, Latino and Vietnamese American families. Food provides a shared occasion without making the guests' expectations, identities or relationships interchangeable.",
    reason: "Four tables let you notice a rule that a single dinner might disguise: every household has its own definition of being a good guest. Chadha’s ensemble premise gives food a useful dramatic job, bringing people together while leaving their expectations distinct. Choose it when the preparation and the conversation both interest you. Pieces of April concentrates that effort around one host; this film asks you to follow several families, so it deserves more attention than background television while cooking.",
    caution: "Prejudice, infidelity, sexual references and a frightening incident involving a gun. The food-centered premise comes with adult tension.",
  },
  {
    id: "krisha", title: "Krisha", year: "2015", director: "Trey Edward Shults", runtime: "81 min", rating: "R", mood: "An intensely uneasy homecoming",
    premise: "Krisha returns to her sister's Texas home on Thanksgiving, hoping to reconnect with relatives who have reasons to be wary. Preparing the turkey gives her a role in the gathering, but fitting back into the family is much harder. Krisha Fairchild plays the returning guest in Trey Edward Shults's debut feature.",
    reason: "Giving someone the turkey gives them both a place in the gathering and something to get wrong. That is the pressure in Krisha’s attempt to return: practical household activity cannot settle the history people bring into the room. We recommend it only to an audience actively choosing discomfort. Its concentrated attention to one uneasy guest makes a sharp comparison with the more forgiving bustle of Home for the Holidays. This is a film for after a conversation about mood, not an ambush after dessert.",
    caution: "Substance abuse, addiction, rejection, strong language and emotional volatility. This is the heaviest pick here; avoid it for an easygoing group watch.",
  },
  {
    id: "the-humans", title: "The Humans", year: "2021", director: "Stephen Karam", runtime: "106 min", rating: "R", mood: "Family drama with an eerie atmosphere",
    premise: "The Blake family gathers for Thanksgiving at a daughter's New York apartment. Across one evening, conversation brings worries about work, money, health and relationships into an unfamiliar space. Stephen Karam adapts his own play, with an ensemble including Richard Jenkins, Jayne Houdyshell, Beanie Feldstein, Amy Schumer, Steven Yeun and June Squibb.",
    reason: "The apartment gets a vote in this family conversation. Its noises and obscured corners make worries about money, health and work feel as though they occupy the building as well as the dialogue. That is the reason to choose it over a straightforward reunion comedy. Leave enough quiet to hear the room. Compared with Krisha’s troubled homecoming, this is the ensemble option for people whose private anxieties share one uneasy space. A brisk horror plot would be the wrong expectation.",
    caution: "Illness, dementia, financial anxiety, sexual references and language. Its dark humor does not remove the weight of the conversation.",
  },
  {
    id: "addams-family-values", title: "Addams Family Values", year: "1993", director: "Barry Sonnenfeld", runtime: "94 min", rating: "PG-13", mood: "A macabre comic detour",
    premise: "A new baby and a new nanny upset the Addams household, while Wednesday and Pugsley are sent to summer camp. The Thanksgiving connection is a camp pageant: a deliberately cheerful version of the holiday meets Wednesday Addams. The film as a whole is not set during a Thanksgiving family visit.",
    reason: "Most of this list asks whether somebody can fit into a family gathering. The Addamses supply a useful change of company: they are remarkably confident about belonging to their own peculiar family. Wednesday’s Thanksgiving pageant gives the film its seasonal place, while the deadpan gothic comedy supplies the broader appeal. Pick it for a group that prefers macabre absurdity to realistic dinner arguments. The pageant is one sequence in a larger story, and the PG-13 label still merits a content check for children.",
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
  excerpt: "A Thanksgiving film has to suit the room. Compare seven comedies and family dramas by the company, tension and kind of dinner they bring with them.",
  date: "2026-11-09",
  modified: "2026-11-21",
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
    { id: "same-table-different-evening", label: "Similar tables, different evenings" },
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
    <p>A Thanksgiving film has to survive the room you put it in. A comedy for a noisy table and a drama for two people after the guests leave are doing different jobs. Putting <em>Krisha</em> on because everybody enjoyed the turkey would be a particularly bold piece of hosting.</p>
    <p><strong>For company and comic momentum, our first choice is <a href="#planes-trains-and-automobiles">Planes, Trains and Automobiles</a>.</strong> For a quieter attempt at reconciliation, choose <a href="#pieces-of-april">Pieces of April</a>. Reserve <a href="#krisha">Krisha</a> and <a href="#the-humans">The Humans</a> for an audience choosing discomfort together. Six of these seven films give the holiday a central role; <em>Addams Family Values</em> is a clearly marked pageant-related detour. The ratings and tone notes matter: this is an adult and older-viewer selection.</p>
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

    <h2 id="same-table-different-evening" tabIndex={-1}>Similar tables, very different evenings</h2>
    <p><em>Pieces of April</em> and <em>Krisha</em> each give a returning family member something practical to do with a meal. For April, asking the neighbours for an oven makes hosting an act of reaching out. For Krisha, responsibility for the turkey puts an uneasy return under pressure. Their similar length tells you very little about which emotional experience your group wants.</p>
    <p><em>What's Cooking?</em> and <em>The Humans</em> both make household expectations visible, but use different scales. Four Los Angeles families let you compare the terms of welcome across tables. One New York apartment asks you to listen to the worries sharing a single space. Choose the ensemble breadth of the former or the concentrated unease of the latter before letting the holiday label make the decision.</p>

    <section className="hq-article-faq" aria-labelledby="before-you-watch">
      <h2 id="before-you-watch" tabIndex={-1}>Questions before you watch</h2>
      <div><h3>Which Thanksgiving movie should we put on after dinner?</h3><p><em>Planes, Trains and Automobiles</em> is the clearest comedy pick if strong language is acceptable. <em>Home for the Holidays</em> keeps the humor inside a family reunion. For a quieter evening with emotional stakes, choose <em>Pieces of April</em>. Ask the group before switching to the intense family distress of <em>Krisha</em>.</p></div>
      <div><h3>Are these Thanksgiving movies suitable for children?</h3><p>This list does not provide an all-ages recommendation. Its PG-13 and R films include sexual references, language, substance abuse or upsetting family situations. Even the comic <em>Addams Family Values</em> has macabre violence and adult jokes. Use the individual tone notes and the film's full content guidance when choosing for a mixed-age group.</p></div>
      <div><h3>Why is Addams Family Values a Thanksgiving movie?</h3><p>Wednesday and Pugsley take part in a Thanksgiving pageant at summer camp. That sequence gives it a memorable connection to the holiday, while the wider story follows the Addams household and a new nanny. Choose it for seasonal dark humor, rather than a story about guests coming home for Thanksgiving dinner.</p></div>
      <div><h3>Which films fit a shorter evening?</h3><p><em>Pieces of April</em> and <em>Krisha</em> run about 80 minutes, but they offer very different experiences. The former centers on a fragile effort to host; the latter is an intense drama about a troubled return. <em>Planes, Trains and Automobiles</em> and <em>Addams Family Values</em> are both about an hour and a half.</p></div>
    </section>

    <h2 id="how-we-chose" tabIndex={-1}>How we chose and checked the films</h2>
    <p>We chose films in which getting home, preparing a meal or sitting with family creates a dramatic problem. <em>Addams Family Values</em> earns its exception by turning a Thanksgiving pageant into the comic problem. The comparisons ask who a screening suits and what the holiday makes the characters do. They are our interpretations of the sourced premises and critical context, rather than reports of personal screenings. This guide was prepared with AI assistance and editorial source checks.</p>
    <p>Years follow familiar film listings. <em>Krisha</em> is a 2015 film that opened theatrically in the US on March 18, 2016. Running times follow the linked US digital catalogs; editions and rounding can differ by a minute or two. <em>The Humans</em> is listed at 106 minutes by Apple and 108 minutes in A24's catalog. <em>Pieces of April</em> is approximately 80–81 minutes.</p>
    <p>We checked the corresponding US Apple TV Store listings on <time dateTime="2026-11-09">November 9, 2026</time>. Each poster and its store badge links to that film's rental or purchase listing. These are separate transactions from an Apple TV subscription; catalog availability, price and edition can change. Playback and checkout were not tested. The artwork is promotional store material, with rights retained by the respective owners. iTunes is a trademark of Apple Inc., registered in the U.S. and other countries.</p>
    <p>US Thanksgiving falls on November 26 in 2026. For films opening around the holiday, see our <Link to="/blog/november-2026-movie-releases">November 2026 movie release calendar</Link>. For an evening of suspects and family secrets, try our <Link to="/blog/movies-like-knives-out">movies like Knives Out</Link> watchlist.</p>
  </>,
};

export default post;
