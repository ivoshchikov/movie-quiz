import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import filmPoster from "../components/filmPoster";
import { formatBlogDate } from "../presentation";
import ExternalLink from "../components/ExternalLink";

const coverPath = "/blog-assets/november-2026-movie-releases-cover.webp";
const sources = {
  calendar: "https://cinemaunited.org/release-calendar/",
  cat: "https://www.catinthehatfilm.com/",
  godzilla: "https://godzilla.com/blogs/news/new-teaser-and-additional-cast-announced-for-godzilla-minus-zero",
  godzillaEarly: "https://godzilla.com/blogs/news/tickets-on-sale-now-for-godzilla-minus-zero",
  wildHorse: "https://www.searchlightpictures.com/wild-horse-nine",
  ebenezer: "https://www.ebenezermovie.com/synopsis/",
  bank: "https://www.youtube.com/watch?v=ORxw68y3lyw",
  paperTiger: "https://www.neonrated.com/film/paper-tiger",
  paperTigerExpansion: "https://www.thewrap.com/creative-content/movies/james-grays-paper-tiger-set-for-november-release-by-neon/",
  bankEarly: "https://www.harkins.com/movies/how-to-rob-a-bank-early-access-screening/2026-11-11",
  rocky: "https://www.aboutamazon.com/news/entertainment/i-play-rocky-trailer-cast-release-date-amazon-mgm-studios",
  hunger: "https://www.stillking.film/the-hunger-games-sunrise-on-the-reaping/",
  hungerDate: "https://investors.lionsgate.com/news-events/news/news-details/2024/LIONSGATE-TO-ADAPT-SUZANNE-COLLINSS-NEWLY-ANNOUNCED-HUNGER-GAMES-NOVEL-SUNRISE-ON-THE-REAPING-INTO-MAJOR-MOTION-PICTURE/",
  hexed: "https://movies.disney.com/hexed",
  focker: "https://www.universalpictures.com/movies/focker-in-law/synopsis/",
  fockerTrailer: "https://people.com/ariana-grande-joins-ben-stiller-robert-de-niro-in-focker-in-law-trailer-11894857",
  narnia: "https://www.netflix.com/tudum/articles/narnia-release-date",
};

type ReleaseFilm = {
  id: string;
  title: string;
  genre: string;
  releaseDate: string;
  releaseNote?: ReactNode;
  director: string;
  cast: string;
  castLabel?: string;
  source: string;
  sourceLabel: string;
  body: ReactNode;
};


const films: ReleaseFilm[] = [
  {
    id: "the-cat-in-the-hat", title: "The Cat in the Hat", genre: "Animation",
    releaseDate: "2026-11-06", director: "Erica Rivinoja and Alessandro Carloni",
    castLabel: "Voices", cast: "Bill Hader, Quinta Brunson, Matt Berry, America Ferrera",
    source: sources.cat, sourceLabel: "Warner Bros.",
    body: <>
      <p>Bill Hader voices a Cat with an assignment: help Gabby and Sebastian, two siblings struggling with a move to a new town. His methods involve the kind of imaginative disorder that makes a simple visit rather more complicated. The risk of losing his magical hat gives this new animated adventure its own stakes.</p>
      <p>Moving to a new town gives the disorder a useful purpose: unfamiliar surroundings are already the children's problem before the Cat begins complicating them. Choose this premise for a family that wants to enter a new animated story; <em>Hexed</em> below offers a different parent-and-child invitation later in the month. The dates need separate attention: international openings began November 4, while the North American theatrical and IMAX date is <strong>November 6</strong>.</p>
    </>,
  },
  {
    id: "godzilla-minus-zero", title: "Godzilla Minus Zero", genre: "Monster drama",
    releaseDate: "2026-11-06",
    releaseNote: <>IMAX early access <time dateTime="2026-11-03">Nov 3</time></>,
    director: "Takashi Yamazaki", cast: "Ryunosuke Kamiki, Minami Hamabe",
    source: sources.godzilla, sourceLabel: "TOHO / Godzilla",
    body: <>
      <p>Takashi Yamazaki returns to the Shikishima family's story two years after <em>Godzilla Minus One</em>. The setting is 1949, with a fragile recovery threatened by another catastrophe. Ryunosuke Kamiki and Minami Hamabe return, giving the sequel a direct connection to the earlier film's characters.</p>
      <p>The returning family is the reason to give <em>Godzilla Minus One</em> (2023) your one preparatory slot. A city's destruction has different stakes when its attempted recovery already belongs to people you know. Choose that continuity if it is what you want from a monster-film outing. For the historical calendar, distinguish <ExternalLink href={sources.godzillaEarly}>the November 3 IMAX early-access screenings</ExternalLink> from the November 6 wide opening in premium and standard formats.</p>
    </>,
  },
  {
    id: "wild-horse-nine", title: "Wild Horse Nine", genre: "Dark comedy",
    releaseDate: "2026-11-06", director: "Martin McDonagh",
    releaseNote: <>Theatrical opening; check local availability</>,
    cast: "John Malkovich, Sam Rockwell, Steve Buscemi",
    source: sources.wildHorse, sourceLabel: "Searchlight Pictures",
    body: <>
      <p>Shortly before the 1973 Chilean coup, two CIA agents are sent from Santiago to Easter Island. They bring troubled pasts and current conspiracies with them, and a connection with two students adds another complication. John Malkovich and Sam Rockwell play the agents; Steve Buscemi is their bureau chief.</p>
      <p>Sending a troubled partnership away from the centre of events does not remove its baggage. That is the reason this Martin McDonagh premise interests us beside the month's larger-scale spectacle: the mission travels with two people who already have problems of their own. Choose it for political intrigue and difficult company. Searchlight's November 6 date did not specify the scale of the rollout at our full-calendar check, so local availability is a separate question.</p>
    </>,
  },
  {
    id: "ebenezer", title: "Ebenezer", genre: "Christmas ghost story",
    releaseDate: "2026-11-13", director: "Ti West",
    cast: "Johnny Depp, Rupert Grint, Andrea Riseborough, Ian McKellen",
    source: sources.ebenezer, sourceLabel: "Paramount's official film site",
    body: <>
      <p>Johnny Depp plays Ebenezer Scrooge in Ti West's new take on the familiar Christmas figure. The ensemble includes Rupert Grint, Andrea Riseborough and Ian McKellen. Paramount's current film site uses the title <em>Ebenezer</em> and gives November 13 as the US opening.</p>
      <p>A familiar Christmas figure is useful common ground for a group, but the ghosts determine what sort of outing follows. We would choose this prospect for people curious about how a new filmmaker handles an old seasonal story. Check the trailer and current content guidance before turning recognition of Scrooge into a family booking. Familiarity with the name does not establish the intensity of this version.</p>
    </>,
  },
  {
    id: "how-to-rob-a-bank", title: "How to Rob a Bank", genre: "Crime action",
    releaseDate: "2026-11-13", director: "David Leitch",
    releaseNote: <>Select Harkins early access <time dateTime="2026-11-11">Nov 11</time></>,
    cast: "Nicholas Hoult, Zoë Kravitz, Anna Sawai, John C. Reilly",
    source: sources.bank, sourceLabel: "Amazon MGM Studios' official trailer",
    body: <>
      <p>A bank-robbing crew broadcasts its heists and becomes a social-media phenomenon. That visibility also puts the robbers in the sights of an FBI agent and a software engineer. David Leitch directs, with Nicholas Hoult, Zoë Kravitz and Anna Sawai among the cast.</p>
      <p>A robber normally benefits from being hard to identify. Broadcasting the job makes attention both a reward and a liability, which is why this earns the spectacle-driven crime slot. Compare it with <em>Paper Tiger</em>'s family bargain if you want to choose by the source of the trouble. The calendar records November 13 for the wide opening and <ExternalLink href={sources.bankEarly}>November 11 for a Harkins early-access screening</ExternalLink>; those dates describe different engagements.</p>
    </>,
  },
  {
    id: "paper-tiger", title: "Paper Tiger", genre: "Crime drama",
    releaseDate: "2026-11-13",
    releaseNote: <>Opening; expansion reported for <time dateTime="2026-11-20">Nov 20</time></>,
    director: "James Gray", cast: "Adam Driver, Scarlett Johansson, Miles Teller",
    source: sources.paperTiger, sourceLabel: "NEON",
    body: <>
      <p>Two brothers enter a scheme that promises more than it can safely deliver. Their involvement with the Russian mafia then puts pressure on the family ties they rely on. James Gray directs Adam Driver, Scarlett Johansson and Miles Teller in a story about the point where a financial gamble starts to threaten a family.</p>
      <p>The useful contrast with <em>How to Rob a Bank</em> is what the characters stand to lose: here the scheme puts an existing family bond under pressure. Choose that premise for a crime drama about obligations turning dangerous. <ExternalLink href={sources.paperTiger}>NEON's page, rechecked November 21, now says “In Theaters”</ExternalLink> and supplies tickets. The table preserves the November 13 opening and <ExternalLink href={sources.paperTigerExpansion}>reported November 20 expansion from the announcement</ExternalLink>. The current studio page does not independently establish the scale of that expansion; check your city.</p>
    </>,
  },
  {
    id: "sunrise-on-the-reaping", title: "The Hunger Games: Sunrise on the Reaping", genre: "Dystopian action",
    releaseDate: "2026-11-20", director: "Francis Lawrence", cast: "Joseph Zada as Haymitch Abernathy",
    source: sources.hunger, sourceLabel: "Stillking Film",
    body: <>
      <p>Haymitch Abernathy takes the central role as the series returns to Panem 24 years before <em>The Hunger Games</em>. Joseph Zada plays the younger Haymitch, and the story begins with the reaping for the 50th Games, the Second Quarter Quell. Francis Lawrence directs the adaptation of Suzanne Collins's novel.</p>
      <p>The face you bring from the earlier films changes the invitation: this is the younger life of a man audiences may already know as somebody else's mentor. Our one-film refresher would be <em>The Hunger Games</em> (2012) for that relationship with the adult Haymitch. Save the new novel for afterward if discovery on screen is your priority. <ExternalLink href={sources.hungerDate}>Lionsgate's announced North American opening is November 20</ExternalLink>; local showtimes establish where that date becomes a ticket.</p>
    </>,
  },
  {
    id: "i-play-rocky", title: "I Play Rocky", genre: "Biographical drama",
    releaseDate: "2026-11-20",
    releaseNote: <>Select theaters <time dateTime="2026-11-06">Nov 6</time></>,
    director: "Peter Farrelly", cast: "Anthony Ippolito, Matt Dillon, AnnaSophia Robb",
    source: sources.rocky, sourceLabel: "Amazon MGM Studios / About Amazon",
    body: <>
      <p>Anthony Ippolito plays a young Sylvester Stallone trying to get <em>Rocky</em> made with himself in the lead. The drama lies in that condition: getting the screenplay onto a screen is only part of the ambition. Peter Farrelly directs this dramatization of the struggle behind the 1976 film.</p>
      <p>The condition is the interesting detail: Stallone wants the film made with himself in the part, so a successful sale and a successful ambition need not mean the same thing. Choose this for the struggle over who gets to embody a story. <em>Rocky</em> is the relevant preparation; a marathon of boxing sequels would answer a different question. <ExternalLink href={sources.rocky}>Amazon gives November 6 in select theatres</ExternalLink>, with <ExternalLink href={sources.calendar}>November 20 on the wide-release calendar</ExternalLink>.</p>
    </>,
  },
  {
    id: "hexed", title: "Hexed", genre: "Animated fantasy",
    releaseDate: "2026-11-25", director: "Fawn Veerasunthorn and Jason Hand; co-directed by Josie Trinidad",
    castLabel: "Voices", cast: "Hailee Steinfeld, Rashida Jones, Jodie Foster, Walton Goggins",
    source: sources.hexed, sourceLabel: "Disney",
    body: <>
      <p>Teenager Billie Doe discovers magical abilities that send her from suburbia into Hexe, a realm of witches. Her cautious mother, Alice, comes along, making the mother-daughter relationship central to the adventure. Hailee Steinfeld and Rashida Jones voice Billie and Alice; Jodie Foster voices Queen Celeste.</p>
      <p>Bringing a cautious mother into a daughter's new realm gives both characters something to negotiate. That relationship is our reason to shortlist this original fantasy for a group wanting a new world together. Its Wednesday opening also gives the holiday plan a useful slot before Thanksgiving itself. Disney's <ExternalLink href={sources.hexed}>US page</ExternalLink> lists <strong>November 25 and PG</strong>, reconfirmed November 21. Check the detailed guidance for the particular children attending.</p>
    </>,
  },
  {
    id: "focker-in-law", title: "Focker-In-Law", genre: "Comedy",
    releaseDate: "2026-11-25", director: "John Hamburg",
    cast: "Ben Stiller, Robert De Niro, Ariana Grande",
    source: sources.focker, sourceLabel: "Universal Pictures",
    body: <>
      <p>The <em>Meet the Parents</em> family gains a new prospective in-law. Ariana Grande plays Olivia, who is involved with Greg Focker's son Henry, bringing Ben Stiller and Robert De Niro back into another round of family scrutiny. <ExternalLink href={sources.fockerTrailer}>The first trailer's lie-detector sequence</ExternalLink> makes the connection to the series' old anxieties plain.</p>
      <p>A prospective in-law gives an established family a new person to assess, and a new person a reason to assess the family back. Choose this return when that social scrutiny is the comedy your Thanksgiving group wants. <em>Meet the Parents</em> (2000) introduces Greg and Jack's arrangement; John Hamburg, a co-writer of the previous three films, directs the new chapter. The US opening is <strong>November 25</strong>, also listed on Cinema United's calendar at the November 21 check.</p>
    </>,
  },
];

function renderReleaseDate(film: ReleaseFilm) {
  return <><time dateTime={film.releaseDate}>{formatBlogDate(film.releaseDate)}</time>{film.releaseNote && <span className="hq-release-note">{film.releaseNote}</span>}</>;
}

const post: BlogPost = {
  slug: "november-2026-movie-releases",
  title: "November 2026 Movie Releases: US Theater Dates",
  excerpt: "Ten November 2026 US releases compared by the history and company you bring, with preparation choices, rollout distinctions and a November 21 planning update.",
  date: "2026-10-18",
  modified: "2026-11-21",
  tags: ["Streaming & New Releases", "2020s"],
  coverUrl: "https://hard-quiz.com" + coverPath,
  listingCoverUrl: "https://hard-quiz.com" + coverPath,
  socialImagePath: "/blog-assets/november-2026-movie-releases-social.webp",
  contents: [
    { id: "release-dates", label: "November release calendar" },
    ...films.map(film => ({ id: film.id, label: film.title })),
    { id: "thanksgiving-movies", label: "Planning a Thanksgiving movie trip" },
    { id: "october-31-update", label: "Calendar checks and November 21 notes" },
    { id: "release-questions", label: "Release-date questions" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Cinema United — North American wide-release calendar; I Play Rocky's November 20 wide opening", url: sources.calendar },
    { label: "Warner Bros. — The Cat in the Hat: US and international openings, story and credits", url: sources.cat },
    { label: "TOHO / Godzilla — Minus Zero: sequel setting, returning cast and November 6 opening", url: sources.godzilla },
    { label: "TOHO / Godzilla — November 3 IMAX early access and November 6 wide release", url: sources.godzillaEarly },
    { label: "Searchlight Pictures — Wild Horse Nine: November 6 date, synopsis and credits", url: sources.wildHorse },
    { label: "Paramount — Ebenezer: current title, November 13 opening and credits", url: sources.ebenezer },
    { label: "Amazon MGM Studios — How to Rob a Bank: official trailer description, release date and credits", url: sources.bank },
    { label: "Harkins — How to Rob a Bank: November 11 early-access listing at participating theaters", url: sources.bankEarly },
    { label: "NEON — Paper Tiger: current theatrical status, synopsis and cast", url: sources.paperTiger },
    { label: "TheWrap — June 25 report of Paper Tiger's November 20 nationwide expansion; not separately reconfirmed by NEON's current page", url: sources.paperTigerExpansion },
    { label: "Amazon MGM Studios / About Amazon — I Play Rocky: select-theater opening, story and cast", url: sources.rocky },
    { label: "Stillking Film — The Hunger Games: Sunrise on the Reaping: adaptation, director and cast", url: sources.hunger },
    { label: "Lionsgate — Sunrise on the Reaping: announced November 20 North American opening and story timeline", url: sources.hungerDate },
    { label: "Disney — Hexed: November 25 date, story, voice cast, directors and rating status", url: sources.hexed },
    { label: "Universal Pictures — Focker-In-Law: cast, filmmakers and US release campaign", url: sources.focker },
    { label: "People — Focker-In-Law's official first trailer and Olivia's connection to the family", url: sources.fockerTrailer },
    { label: "Netflix Tudum — Narnia: The Magician's Nephew: current 2027 theatrical and streaming dates", url: sources.narnia },
  ],
  content: () => <>
    <p>A familiar name on a cinema board can mean several things: a family you want to meet again, a younger version of somebody you know, or a new attempt at an old ghost story. November's selection asks which history you want to bring to the ticket. The alternatives include two crime premises whose problems begin with very different appetites.</p>
    <p><strong>The calendar runs from <em>Godzilla Minus Zero</em> on November 6 to <em>Hexed</em> and <em>Focker-In-Law</em> on November 25, with <em>Sunrise on the Reaping</em> on November 20.</strong> The ten entries preserve US opening dates, separating wide releases, select-theatre starts and special screenings. The full calendar check was October 31; the <a href="#october-31-update">November 21 notes</a> recheck selected late-month plans and explain the limit on <em>Paper Tiger</em>'s reported expansion. Opening dates alone do not establish today's local showtimes.</p>

    <section className="hq-release-index" aria-labelledby="release-dates">
      <h2 id="release-dates" tabIndex={-1}>November 2026 movie release dates at a glance</h2>
      <table>
        <caption>Selected US theatrical dates · rollout details and early screenings noted</caption>
        <thead><tr><th scope="col">Movie</th><th scope="col">US date</th><th scope="col">Genre</th></tr></thead>
        <tbody>{films.map(film => <tr key={film.id}><th scope="row"><a href={"#" + film.id}>{film.title}</a></th><td>{renderReleaseDate(film)}</td><td>{film.genre}</td></tr>)}</tbody>
      </table>
    </section>

    <figure>
      <ArticleImage src={coverPath} alt="Original Hard Quiz calendar graphic for November 2026, highlighting November 6, 13, 20 and 25 as US theatrical release dates" width={1200} height={675} priority />
      <figcaption>Original Hard Quiz calendar artwork. The table includes earlier limited releases and special screenings.</figcaption>
    </figure>

    {films.map(film => <section key={film.id} aria-labelledby={film.id}>
      <h2 id={film.id} tabIndex={-1}>{film.title}</h2>
      <dl className="hq-movie-facts">
        <div><dt>US theatrical date</dt><dd>{renderReleaseDate(film)}</dd></div>
        <div><dt>Director</dt><dd>{film.director}</dd></div>
        <div><dt>{film.castLabel || "Starring"}</dt><dd>{film.cast}</dd></div>
      </dl>
      {filmPoster(`november-2026-${film.id}`)}
      {film.body}
      <p className="hq-watchlist-facts"><ExternalLink href={film.source}>{film.sourceLabel}: film details</ExternalLink></p>
    </section>)}

    <h2 id="thanksgiving-movies" tabIndex={-1}>What should you see over Thanksgiving?</h2>
    <p><strong>For a family entering a new world together, compare <em>Hexed</em> and <em>The Cat in the Hat</em>.</strong> One sends a mother and daughter into an unfamiliar realm; the other brings disorder to siblings already dealing with a new town. The former's November 25 opening makes it a fresh Thanksgiving candidate, while the Cat's earlier opening needs a current local-showtime check. Age guidance finishes the decision.</p>
    <p><strong>If there is time for one preparatory film, spend it on the relationship.</strong> <em>Godzilla Minus One</em> supplies the returning family's history; <em>The Hunger Games</em> supplies a relationship with the older Haymitch; <em>Meet the Parents</em> introduces Greg and Jack. For <em>I Play Rocky</em>, watching <em>Rocky</em> lets you compare an ambition with the film it produced. Choose the relevant connection instead of building a franchise checklist.</p>
    <p><strong>For crime, choose what makes the scheme dangerous.</strong> Broadcasting a robbery turns attention into a liability in <em>How to Rob a Bank</em>. A tempting deal puts brothers and their obligations under pressure in <em>Paper Tiger</em>. The second is our premise-based choice for a family-bonds drama; the first is the more obvious candidate for public spectacle. These are reasons to investigate the films, with no claim that we have screened them.</p>

    <h2 id="october-31-update" tabIndex={-1}>Calendar checks: October 31 and November 21</h2>
    <p>Our October 31 full-calendar update separated a theatrical opening from a confirmed wide release:</p>
    <ul>
      <li><strong>Paper Tiger:</strong> the table now leads with NEON's confirmed November 13 opening. The November 20 expansion is attributed to TheWrap's announcement report, with its current confirmation limit explained above.</li>
      <li><strong>Wild Horse Nine:</strong> Searchlight still lists November 6; the guide no longer labels that date as a confirmed nationwide opening.</li>
      <li><strong>How to Rob a Bank:</strong> the November 13 wide opening is unchanged; a Harkins early-access listing for November 11 is now marked separately.</li>
    </ul>
    <p><strong>November 21 planning note:</strong> Cinema United continues to list <em>Hexed</em> and <em>Focker-In-Law</em> for November 25; Disney separately confirms <em>Hexed</em>'s date and PG rating. NEON now marks <em>Paper Tiger</em> “In Theaters” and provides ticket links, without specifying a nationwide expansion date on the film page. The opening and reported expansion remain separate facts. The ten-film table is a selection, rather than a list of every November release.</p>

    <section className="hq-article-faq" aria-labelledby="release-questions">
      <h2 id="release-questions" tabIndex={-1}>Questions about November's releases</h2>
      <h3>Is Narnia still coming out in November 2026?</h3>
      <p>No. <ExternalLink href={sources.narnia}>Netflix's current announcement</ExternalLink> gives <strong>February 12, 2027</strong> for the theatrical release of Greta Gerwig's <em>Narnia: The Magician's Nephew</em>, followed by Netflix on April 2, 2027. Older November 2026 listings are out of date.</p>
      <h3>Why do Paper Tiger and I Play Rocky have more than one date?</h3>
      <p><em>I Play Rocky</em> starts in selected theaters on November 6, according to Amazon, and Cinema United lists its wide opening on November 20. NEON confirms <em>Paper Tiger</em> for November 13; its November 20 expansion comes from TheWrap's announcement report and is not separately confirmed on NEON's current page. These dates describe different stages of a rollout, so check which one applies to your city.</p>
      <h3>Which movies open during Thanksgiving week?</h3>
      <p>In this selection, <em>Hexed</em> and <em>Focker-In-Law</em> open on <strong>Wednesday, November 25</strong>. Thanksgiving falls on Thursday, November 26. Films opening earlier in November may also be playing that weekend; actual screenings depend on your local cinema.</p>
      <h3>Are these streaming release dates?</h3>
      <p>No. These are US theatrical dates. A studio's connection to a streaming service does not establish a subscription release date. Follow the linked official pages for later viewing announcements, and check the country attached to any listing you find.</p>
    </section>

    <h2>For a film night at home</h2>
    <p>If you are choosing a tense watch for tonight, our <Link to="/blog/best-horror-movies-2026">2026 horror watchlist</Link> sorts seven films by mood and explains sequel preparation. For another book-to-screen release, our <Link to="/blog/is-whalefall-based-on-a-book">Whalefall novel and movie guide</Link> explains what the adaptation is based on without revealing the ending.</p>
    <p><small>Prepared with AI assistance from studio, distributor, exhibitor and exhibition-industry sources, plus reporting on the Focker-In-Law trailer and Paper Tiger's announced expansion. The comparisons are release-planning judgments, with no claim of personal screenings. The full-calendar verification date remains October 31, 2026. The November 21 check covers the late-month calendar listings, Disney's Hexed page, NEON's current Paper Tiger page and Netflix's Narnia announcement; it does not renew every local-showtime or availability claim.</small></p>
  </>,
};

export default post;
