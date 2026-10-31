import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import FilmStill from "../components/FilmStill";
import { formatBlogDate } from "../presentation";

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

const filmImages: Record<string, { src: string; width: number; height: number; alt: string; caption: string }> = {
  "the-cat-in-the-hat": {
    "src": "/blog-assets/november-2026-the-cat-in-the-hat-still.webp",
    "width": 1200,
    "height": 732,
    "alt": "Two blue-haired characters in red outfits stand beside a boy and a goldfish in a bowl.",
    "caption": "The Cat in the Hat (2026): scene from the film."
  },
  "godzilla-minus-zero": {
    "src": "/blog-assets/november-2026-godzilla-minus-zero-poster.webp",
    "width": 512,
    "height": 745,
    "alt": "Godzilla surrounded by fire on a poster advertising November 3 IMAX early-access screenings.",
    "caption": "Godzilla Minus Zero (2026): poster."
  },
  "wild-horse-nine": {
    "src": "/blog-assets/november-2026-wild-horse-nine-still.webp",
    "width": 1200,
    "height": 669,
    "alt": "Two men stand in tall grass between large moai statues on Easter Island.",
    "caption": "Wild Horse Nine (2026): scene from the film."
  },
  "ebenezer": {
    "src": "/blog-assets/november-2026-ebenezer-still.webp",
    "width": 985,
    "height": 859,
    "alt": "A man in a blue coat and top hat holds a cane in a wooden doorway.",
    "caption": "Ebenezer (2026): scene from the film."
  },
  "how-to-rob-a-bank": {
    "src": "/blog-assets/november-2026-how-to-rob-a-bank-still.webp",
    "width": 1200,
    "height": 704,
    "alt": "Armed robbers wearing animal masks climb out of the back of a green van.",
    "caption": "How to Rob a Bank (2026): scene from the film."
  },
  "paper-tiger": {
    "src": "/blog-assets/november-2026-paper-tiger-poster.webp",
    "width": 629,
    "height": 787,
    "alt": "Spanish-language Paper Tiger poster with three cast portraits and the title Tigre de Papel.",
    "caption": "Paper Tiger (2026): poster."
  },
  "sunrise-on-the-reaping": {
    "src": "/blog-assets/november-2026-sunrise-on-the-reaping-poster.webp",
    "width": 594,
    "height": 882,
    "alt": "Sunrise on the Reaping poster showing a pointed monument and figures in a flower-filled mountain valley.",
    "caption": "The Hunger Games: Sunrise on the Reaping (2026): poster."
  },
  "i-play-rocky": {
    "src": "/blog-assets/november-2026-i-play-rocky-still.webp",
    "width": 1200,
    "height": 708,
    "alt": "A young man in gray sweats jogs along a beach with a dog on a leash.",
    "caption": "I Play Rocky (2026): scene from the film."
  },
  "hexed": {
    "src": "/blog-assets/november-2026-hexed-still.webp",
    "width": 1200,
    "height": 568,
    "alt": "Three animated witches wearing pointed hats stand on a sunlit path.",
    "caption": "Hexed (2026): scene from the film."
  },
  "focker-in-law": {
    "src": "/blog-assets/november-2026-focker-in-law-poster.webp",
    "width": 481,
    "height": 810,
    "alt": "Focker-In-Law poster with three cast portraits against a red background.",
    "caption": "Focker-In-Law (2026): poster."
  }
};

const films: ReleaseFilm[] = [
  {
    id: "the-cat-in-the-hat", title: "The Cat in the Hat", genre: "Animation",
    releaseDate: "2026-11-06", director: "Erica Rivinoja and Alessandro Carloni",
    castLabel: "Voices", cast: "Bill Hader, Quinta Brunson, Matt Berry, America Ferrera",
    source: sources.cat, sourceLabel: "Warner Bros.",
    body: <>
      <p>Bill Hader voices a Cat with an assignment: help Gabby and Sebastian, two siblings struggling with a move to a new town. His methods involve the kind of imaginative disorder that makes a simple visit rather more complicated. The risk of losing his magical hat gives this new animated adventure its own stakes.</p>
      <p>The self-contained story makes this a straightforward place to start for a family cinema trip. Be careful with the date: Warner Bros. lists international openings from November 4, while the North American theatrical and IMAX opening is <strong>November 6</strong>.</p>
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
      <p>If you have time for one preparatory watch this month, make it <em>Godzilla Minus One</em> (2023). For booking purposes, there are two dates to distinguish: <a href={sources.godzillaEarly}>TOHO and GKIDS confirm IMAX early-access screenings on November 3</a>, followed by the wide release in premium and standard formats on November 6.</p>
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
      <p>Martin McDonagh writes and directs. The premise offers a different sort of tension from November's monsters and arena spectacle: a small group of people, old grievances and a politically charged setting. Searchlight lists November 6, but does not specify the rollout's scale on its film page. Check your city's listings rather than assuming a nationwide opening.</p>
    </>,
  },
  {
    id: "ebenezer", title: "Ebenezer", genre: "Christmas ghost story",
    releaseDate: "2026-11-13", director: "Ti West",
    cast: "Johnny Depp, Rupert Grint, Andrea Riseborough, Ian McKellen",
    source: sources.ebenezer, sourceLabel: "Paramount's official film site",
    body: <>
      <p>Johnny Depp plays Ebenezer Scrooge in Ti West's new take on the familiar Christmas figure. The ensemble includes Rupert Grint, Andrea Riseborough and Ian McKellen. Paramount's current film site uses the title <em>Ebenezer</em> and gives November 13 as the US opening.</p>
      <p>The recognizable name makes this an easy title to suggest for a seasonal outing, but check the trailer and current content guidance before making it a family booking. A Christmas setting alone tells you little about how gentle a ghost story will be.</p>
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
      <p>The crew's appetite for an audience is the complication to watch: every new viewer is also another witness. The wide opening remains November 13. <a href={sources.bankEarly}>Harkins also lists an early-access screening on November 11</a>; check participating locations and showtimes before booking.</p>
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
      <p><a href={sources.paperTiger}>NEON's current film page confirms a November 13 theatrical opening</a>. <a href={sources.paperTigerExpansion}>TheWrap reported a November 20 nationwide expansion</a> when the release was announced in June. At our October 31 check, Paper Tiger was absent from Cinema United's wide-release calendar, and NEON's page did not separately confirm that expansion. November 20 remains a reported rollout date, not a guarantee of screenings in your city; check local showtimes. The calendar's omission alone does not establish a delay.</p>
    </>,
  },
  {
    id: "sunrise-on-the-reaping", title: "The Hunger Games: Sunrise on the Reaping", genre: "Dystopian action",
    releaseDate: "2026-11-20", director: "Francis Lawrence", cast: "Joseph Zada as Haymitch Abernathy",
    source: sources.hunger, sourceLabel: "Stillking Film",
    body: <>
      <p>Haymitch Abernathy takes the central role as the series returns to Panem 24 years before <em>The Hunger Games</em>. Joseph Zada plays the younger Haymitch, and the story begins with the reaping for the 50th Games, the Second Quarter Quell. Francis Lawrence directs the adaptation of Suzanne Collins's novel.</p>
      <p>The original <em>The Hunger Games</em> (2012) is a useful refresher if you want to reconnect with Panem and the adult Haymitch before this earlier chapter. Reading <em>Sunrise on the Reaping</em> first will reveal its story, so save the novel for afterward if discovering the events on screen matters more to you. <a href={sources.hungerDate}>Lionsgate's announced North American release date is November 20</a>.</p>
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
      <p><a href={sources.rocky}>Amazon confirms a select-theater opening on November 6</a>, while <a href={sources.calendar}>Cinema United lists the wide opening on November 20</a>. Watching <em>Rocky</em> beforehand gives you the finished film as a point of comparison. There is no need to work through every subsequent boxing sequel to follow this production story.</p>
    </>,
  },
  {
    id: "hexed", title: "Hexed", genre: "Animated fantasy",
    releaseDate: "2026-11-25", director: "Fawn Veerasunthorn and Jason Hand; co-directed by Josie Trinidad",
    castLabel: "Voices", cast: "Hailee Steinfeld, Rashida Jones, Jodie Foster, Walton Goggins",
    source: sources.hexed, sourceLabel: "Disney",
    body: <>
      <p>Teenager Billie Doe discovers magical abilities that send her from suburbia into Hexe, a realm of witches. Her cautious mother, Alice, comes along, making the mother-daughter relationship central to the adventure. Hailee Steinfeld and Rashida Jones voice Billie and Alice; Jodie Foster voices Queen Celeste.</p>
      <p>This original Disney fantasy opens on the Wednesday before Thanksgiving. It is an option for a group looking for a new animated world to explore without franchise preparation. Disney now lists <em>Hexed</em> as <strong>PG</strong> on its <a href={sources.hexed}>official US film page</a>. Check the detailed content guidance before choosing it for younger children.</p>
    </>,
  },
  {
    id: "focker-in-law", title: "Focker-In-Law", genre: "Comedy",
    releaseDate: "2026-11-25", director: "John Hamburg",
    cast: "Ben Stiller, Robert De Niro, Ariana Grande",
    source: sources.focker, sourceLabel: "Universal Pictures",
    body: <>
      <p>The <em>Meet the Parents</em> family gains a new prospective in-law. Ariana Grande plays Olivia, who is involved with Greg Focker's son Henry, bringing Ben Stiller and Robert De Niro back into another round of family scrutiny. <a href={sources.fockerTrailer}>The first trailer's lie-detector sequence</a> makes the connection to the series' old anxieties plain.</p>
      <p>John Hamburg, who co-wrote the previous three films, directs this chapter. If your Thanksgiving group wants returning characters and awkward-family comedy, this is the relevant entry in the calendar. <em>Meet the Parents</em> (2000) is the starting point for the Greg-and-Jack relationship. Universal's US opening is <strong>November 25</strong>.</p>
    </>,
  },
];

function renderReleaseDate(film: ReleaseFilm) {
  return <><time dateTime={film.releaseDate}>{formatBlogDate(film.releaseDate)}</time>{film.releaseNote && <span className="hq-release-note">{film.releaseNote}</span>}</>;
}

const post: BlogPost = {
  slug: "november-2026-movie-releases",
  title: "November 2026 Movie Releases: US Theater Dates",
  excerpt: "Plan November 2026 at the movies: ten US releases, from Godzilla Minus Zero to The Hunger Games and Hexed, with dates and spoiler-free previews.",
  date: "2026-10-18",
  modified: "2026-10-31",
  tags: ["Streaming & New Releases", "2020s"],
  coverUrl: "https://hard-quiz.com" + coverPath,
  listingCoverUrl: "https://hard-quiz.com" + coverPath,
  socialImagePath: "/blog-assets/november-2026-movie-releases-social.webp",
  contents: [
    { id: "release-dates", label: "November release calendar" },
    ...films.map(film => ({ id: film.id, label: film.title })),
    { id: "thanksgiving-movies", label: "Planning a Thanksgiving movie trip" },
    { id: "october-31-update", label: "October 31 calendar update" },
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
    { label: "NEON — Paper Tiger: November 13 opening, synopsis and cast", url: sources.paperTiger },
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
    <p><strong>November 2026's US movie releases include <em>Godzilla Minus Zero</em> on November 6, <em>The Hunger Games: Sunrise on the Reaping</em> on November 20, and <em>Hexed</em> and <em>Focker-In-Law</em> on November 25.</strong> Between them are a Christmas ghost story, two very different crime films and the story behind <em>Rocky</em>.</p>
    <p>These ten selected theatrical releases give you a way to plan the month by date and mood. The calendar distinguishes wide openings, earlier select-theater runs and special screenings; it does not promise that every film will open nationwide. The ten film entries and release details were reviewed on <time dateTime="2026-10-31">October 31, 2026</time>. Paper Tiger's reported expansion needs a local check; see the <a href="#october-31-update">update below</a>.</p>

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
      {filmImages[film.id] && <FilmStill {...filmImages[film.id]} />}
      {film.body}
      <p className="hq-watchlist-facts"><a href={film.source}>{film.sourceLabel}: film details</a></p>
    </section>)}

    <h2 id="thanksgiving-movies" tabIndex={-1}>What should you see over Thanksgiving?</h2>
    <p><strong>For a new family adventure, start with <em>The Cat in the Hat</em> or <em>Hexed</em>.</strong> The Cat opens earlier in the month; Disney's witch-world adventure arrives on November 25, the day before the US Thanksgiving holiday. Check age guidance for the children in your group.</p>
    <p><strong>For an established series, choose the history you want to revisit.</strong> <em>Sunrise on the Reaping</em> returns to Panem, <em>Godzilla Minus Zero</em> continues the Shikishima family's story, and <em>Focker-In-Law</em> revisits Greg and Jack. Those are different kinds of preparation: a previous film can supply emotional context as well as plot.</p>
    <p><strong>For a group drawn to crime stories, compare the premises.</strong> <em>How to Rob a Bank</em> has a crew turning robbery into a public spectacle; <em>Paper Tiger</em> starts with brothers drawn into a dangerous scheme. <em>Wild Horse Nine</em> moves toward intelligence work, political intrigue and a troubled partnership. These are choices by setup, not a ranking of films we have screened.</p>

    <h2 id="october-31-update" tabIndex={-1}>What changed in our October 31 check?</h2>
    <p>The selected films retain their announced November openings. This update corrects the distinction between a theatrical opening and a confirmed wide release:</p>
    <ul>
      <li><strong>Paper Tiger:</strong> the table now leads with NEON's confirmed November 13 opening. The November 20 expansion is attributed to TheWrap's announcement report, with its current confirmation limit explained above.</li>
      <li><strong>Wild Horse Nine:</strong> Searchlight still lists November 6; the guide no longer labels that date as a confirmed nationwide opening.</li>
      <li><strong>How to Rob a Bank:</strong> the November 13 wide opening is unchanged; a Harkins early-access listing for November 11 is now marked separately.</li>
    </ul>

    <section className="hq-article-faq" aria-labelledby="release-questions">
      <h2 id="release-questions" tabIndex={-1}>Questions about November's releases</h2>
      <h3>Is Narnia still coming out in November 2026?</h3>
      <p>No. <a href={sources.narnia}>Netflix's current announcement</a> gives <strong>February 12, 2027</strong> for the theatrical release of Greta Gerwig's <em>Narnia: The Magician's Nephew</em>, followed by Netflix on April 2, 2027. Older November 2026 listings are out of date.</p>
      <h3>Why do Paper Tiger and I Play Rocky have more than one date?</h3>
      <p><em>I Play Rocky</em> starts in selected theaters on November 6, according to Amazon, and Cinema United lists its wide opening on November 20. NEON confirms <em>Paper Tiger</em> for November 13; its November 20 expansion comes from TheWrap's announcement report and is not separately confirmed on NEON's current page. These dates describe different stages of a rollout, so check which one applies to your city.</p>
      <h3>Which movies open during Thanksgiving week?</h3>
      <p>In this selection, <em>Hexed</em> and <em>Focker-In-Law</em> open on <strong>Wednesday, November 25</strong>. Thanksgiving falls on Thursday, November 26. Films opening earlier in November may also be playing that weekend; actual screenings depend on your local cinema.</p>
      <h3>Are these streaming release dates?</h3>
      <p>No. These are US theatrical dates. A studio's connection to a streaming service does not establish a subscription release date. Follow the linked official pages for later viewing announcements, and check the country attached to any listing you find.</p>
    </section>

    <h2>More to watch before November</h2>
    <p>If you are choosing a tense watch for tonight, our <Link to="/blog/best-horror-movies-2026">2026 horror watchlist</Link> sorts seven films by mood and explains sequel preparation. For another book-to-screen release, our <Link to="/blog/is-whalefall-based-on-a-book">Whalefall novel and movie guide</Link> explains what the adaptation is based on without revealing the ending.</p>
    <p><small>Prepared with AI assistance from studio, distributor, exhibitor and exhibition-industry sources, plus reporting on the Focker-In-Law trailer and Paper Tiger's announced expansion. This is a release-planning guide, not a review based on screenings. The ten entries, US dates and Hexed's PG rating were reviewed on October 31, 2026. Paramount and Universal's US synopsis details were checked through indexed official-page text; Paper Tiger's expansion is qualified above.</small></p>
  </>,
};

export default post;
