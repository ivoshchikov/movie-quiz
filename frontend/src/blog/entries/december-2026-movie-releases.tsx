import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import ArticleImage from "../components/ArticleImage";
import ExternalLink from "../components/ExternalLink";
import { formatBlogDate } from "../presentation";
import type { BlogPost } from "../types";

const checkedOn = "2026-11-12";
const assetRoot = "/blog-assets/december-2026";
const cover = `${assetRoot}-cover.webp`;
const photo = {
  src: `${assetRoot}-imax-reel.webp`,
  source: "https://commons.wikimedia.org/wiki/File:Film_Reel_on_an_IMAX_15_70_mm_Film_Projector.jpg",
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
};
const cinemaUnited = "https://cinemaunited.org/release-calendar/";
const imax70mm = "https://www.imax.com/news/dune-part-three-in-imax-70mm-film";
const werwulf35mm = "https://burnsfilmcenter.org/booking/werwulf/";
const jumanjiShowtimes = "https://www.cinemark.com/movies/jumanji-3";
const violentNightShowtimes = "https://www.cinemark.com/movies/violent-night-2";
const marvelRecap = "https://thewaltdisneycompany.com/news/russo-brothers-avengers-endgame-doomsday/";

type Release = {
  id: string;
  title: string;
  date: string;
  pick: string;
  sourceLabel: string;
  source: string;
  rollout?: "Select theaters";
  bookingNote?: ReactNode;
  preview: ReactNode;
};

const releases: Release[] = [
  {
    id: "behemoth", title: "Behemoth!", date: "2026-12-04", pick: "A drama about coming home",
    sourceLabel: "Searchlight Pictures", source: "https://www.searchlightpictures.com/behemoth/",
    preview: <p>Pedro Pascal plays Alex Serian, a cellist who returns to Los Angeles after two decades on the road. Tony Gilroy writes and directs, with Olivia Wilde and Eva Victor among the cast. This is the early-December pick if you want a contemporary drama about a musician coming home to a city he left years ago.</p>,
  },
  {
    id: "violent-night-2", title: "Violent Night 2", date: "2026-12-04", pick: "R-rated Christmas action",
    sourceLabel: "Universal Pictures", source: "https://www.violentnightmovie.com/",
    preview: <p>David Harbour's Santa is back, this time taking on a gangster who's terrorizing a shopping mall. The mall gives the action a different setting from the family estate in the 2022 film. Pick it for an action-comedy crowd that likes its Christmas movies loud. <ExternalLink href={violentNightShowtimes}>Cinemark lists it as R</ExternalLink>.</p>,
  },
  {
    id: "zero-ad", title: "Zero A.D.: The Birth of Christ", date: "2026-12-11", pick: "A biblical drama with high stakes",
    sourceLabel: "Angel Studios", source: "https://www.angel.com/press/zero-ad",
    preview: <p>The story follows Mary trying to keep her newborn safe as King Herod sees the child as a threat to his rule. Angel lists a PG-13 rating, citing strong violence and bloody imagery. Check that guidance if you're planning a church or family outing with younger viewers.</p>,
  },
  {
    id: "avengers-doomsday", title: "Avengers: Doomsday", date: "2026-12-18", pick: "A Marvel crossover",
    sourceLabel: "Disney Movies", source: "https://movies.disney.com/avengers-doomsday",
    preview: <p>Anthony and Joe Russo bring together the Avengers, the Fantastic Four and returning X-Men, among others. Robert Downey Jr. plays Victor von Doom. If you're mostly curious about how those teams fit together, use the short catch-up list below to pick a film or two.</p>,
  },
  {
    id: "dune-part-three", title: "Dune: Part Three", date: "2026-12-18", pick: "Epic science fiction",
    sourceLabel: "Warner Bros.", source: "https://www.dunemovie.com/",
    bookingNote: <>Insider screenings <time dateTime="2026-12-14">Dec 14</time>–<time dateTime="2026-12-15">15</time></>,
    preview: <p>Denis Villeneuve's third film picks up with Paul Atreides in power and facing the consequences of his reign. If the people and politics of Arrakis are hazy, give yourself time for the first two films. Warner Bros. lists Dune Insider screenings on December 14 and 15 ahead of the December 18 wide release. For a 70mm film print, start with <ExternalLink href={imax70mm}>IMAX's participating venue list</ExternalLink> and check the format on your theater's showtime.</p>,
  },
  {
    id: "the-angry-birds-movie-3", title: "The Angry Birds Movie 3", date: "2026-12-23", pick: "An animated comedy before Christmas",
    sourceLabel: "Paramount Pictures", source: "https://www.paramount.com/movies/the-angry-birds-movie-3",
    preview: <p>Red has a new challenge alongside saving the world: becoming a father. Jason Sudeikis, Josh Gad and Danny McBride return as Red, Chuck and Bomb. With a Wednesday opening, this is an animated option if you want to take the kids to a movie before Christmas Day. Check your theater's showtimes and age guidance when booking.</p>,
  },
  {
    id: "jumanji-open-world", title: "Jumanji: Open World", date: "2026-12-25", pick: "A group adventure comedy",
    sourceLabel: "Sony Pictures", source: "https://jumanji.movie/",
    preview: <p>The game's dangers spill into the real world, with Dwayne Johnson, Kevin Hart, Jack Black and Karen Gillan back for the final film in their trilogy. Sony and <ExternalLink href={jumanjiShowtimes}>Cinemark</ExternalLink> both put the opening on Christmas Day. It's an easy candidate to suggest when a group wants action and comedy in the same ticket.</p>,
  },
  {
    id: "werwulf", title: "Werwulf", date: "2026-12-25", pick: "Christmas-night folk horror",
    sourceLabel: "Focus Features", source: "https://www.focusfeatures.com/werwulf",
    bookingNote: <>35mm in Pleasantville, NY</>,
    preview: <p>Robert Eggers directs a werewolf story with Aaron Taylor-Johnson, Lily-Rose Depp and Willem Dafoe. For an audience that liked the dread and period detail of <em>The Witch</em> or <em>Nosferatu</em>, this is the horror choice on Christmas Day. The <ExternalLink href={werwulf35mm}>Jacob Burns Film Center</ExternalLink> lists a 35mm presentation in Pleasantville, New York.</p>,
  },
  {
    id: "mr-irrelevant", title: "Mr. Irrelevant", date: "2026-12-25", pick: "An NFL underdog story",
    sourceLabel: "Paramount Pictures", source: "https://www.paramount.com/movies/mr-irrelevant",
    preview: <p>David Corenswet plays John Tuggle, the final pick of the 1983 NFL Draft, as he tries to earn a place with the New York Giants. Michael Shannon plays coach Bill Parcells. The draft gives the film its starting point, and the work of staying on the team gives it a story to follow even if you don't watch football.</p>,
  },
  {
    id: "look-back", title: "Look Back", date: "2026-12-30", pick: "A coming-of-age story about making art",
    sourceLabel: "GKIDS", source: "https://gkids.com/films/look-back-a-film-by-kore-eda/",
    rollout: "Select theaters",
    bookingNote: <>Nationwide expansion <time dateTime="2027-01-15">Jan 15</time></>,
    preview: <p>Hirokazu Koreeda's live-action adaptation of Tatsuki Fujimoto's manga follows two girls whose drawings turn a school rivalry into a friendship. It's a quieter option for the end of the month. GKIDS lists a select-theater start on December 30 and a nationwide expansion on January 15, 2027. Check the December run first if you're hoping to catch it before New Year's.</p>,
  },
];

function releaseDate(film: Release) {
  return <><time dateTime={film.date}>{formatBlogDate(film.date)}</time><span className="hq-release-note">{film.rollout ?? "Wide release"}{film.bookingNote && <><br />{film.bookingNote}</>}</span></>;
}

const post: BlogPost = {
  slug: "december-2026-movie-releases",
  title: "December 2026 Movie Releases: US Theater Dates",
  excerpt: "Check 10 December 2026 US movie releases, including Dune: Part Three and Avengers: Doomsday, with wide openings, early IMAX shows and limited runs.",
  date: "2026-11-12",
  tags: ["Streaming & New Releases", "2020s"],
  coverUrl: `https://hard-quiz.com${cover}`,
  listingCoverUrl: `https://hard-quiz.com${assetRoot}-640.webp`,
  socialImagePath: `${assetRoot}-social.webp`,
  contents: [
    { id: "release-dates", label: "December release calendar" },
    ...releases.map(film => ({ id: film.id, label: film.title })),
    { id: "what-to-watch-first", label: "What to watch before the sequels" },
    { id: "screening-formats", label: "How to choose a screening" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Cinema United — expected wide releases in North America", url: cinemaUnited },
    ...releases.map(film => ({ label: `${film.sourceLabel} — ${film.title}`, url: film.source })),
    { label: "IMAX — Dune: Part Three 70mm venues and tickets", url: imax70mm },
    { label: "Jacob Burns Film Center — Werwulf in 35mm", url: werwulf35mm },
    { label: "Disney — the returning teams in Avengers: Doomsday", url: marvelRecap },
    { label: "Cinemark — Jumanji: Open World U.S. opening and synopsis", url: jumanjiShowtimes },
    { label: "Cinemark — Violent Night 2 U.S. opening and rating", url: violentNightShowtimes },
  ],
  content: () => <>
    <p><strong><em>Avengers: Doomsday</em> and <em>Dune: Part Three</em> both open wide on December 18.</strong> On Christmas Day, there's a new <em>Jumanji</em>, a Robert Eggers horror film and an NFL drama. If you're booking for kids before the holiday, <em>The Angry Birds Movie 3</em> opens Wednesday, December 23.</p>
    <p>These ten picks cover U.S. theater openings, including advance screenings for <em>Dune</em> on December 14 and 15 and a select-theater start for <em>Look Back</em>. Dates and formats were checked on <time dateTime={checkedOn}>November 12, 2026</time>.</p>

    <section className="hq-release-index" aria-labelledby="release-dates">
      <h2 id="release-dates" tabIndex={-1}>December 2026 movie release dates at a glance</h2>
      <table>
        <caption>Selected U.S. theatrical openings and special screenings</caption>
        <thead><tr><th scope="col">Movie</th><th scope="col">U.S. opening</th><th scope="col">Pick it for</th></tr></thead>
        <tbody>{releases.map(film => <tr key={film.id}>
          <th scope="row"><a href={`#${film.id}`}>{film.title}</a></th>
          <td>{releaseDate(film)}</td>
          <td>{film.pick}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <figure>
      <ArticleImage src={cover} alt="Original Hard Quiz calendar highlighting December 4, 11, 18, 23, 25 and 30, 2026 as selected U.S. movie opening dates" width={1200} height={675} />
    </figure>

    {releases.map(film => <section key={film.id} aria-labelledby={film.id}>
      <h2 id={film.id} tabIndex={-1}>{film.title}</h2>
      <p className="hq-watchlist-facts"><time dateTime={film.date}>{formatBlogDate(film.date)}</time> · <ExternalLink href={film.source}>{film.sourceLabel}</ExternalLink></p>
      {film.preview}
    </section>)}

    <h2 id="what-to-watch-first" tabIndex={-1}>What to watch before the sequels</h2>
    <ul>
      <li><strong><em>Dune: Part Three</em>.</strong> Watch <em>Dune</em> (2021) and <em>Dune: Part Two</em> (2024) in order. The first introduces Paul and the factions competing for Arrakis. The second explains how he gets to the position he holds in the new film.</li>
      <li><strong><em>Avengers: Doomsday</em>.</strong> For two recent films, start with <em>Thunderbolts*</em> and <em>The Fantastic Four: First Steps</em>. If you're returning after a long gap, add <em>Avengers: Endgame</em> as a refresher for the original team. <ExternalLink href={marvelRecap}>The directors describe which teams cross paths in the new film</ExternalLink>.</li>
      <li><strong><em>Jumanji: Open World</em>.</strong> Start with <em>Jumanji: Welcome to the Jungle</em> and continue with <em>Jumanji: The Next Level</em> to meet this group of players and see how their game works.</li>
      <li><strong><em>Violent Night 2</em>.</strong> <em>Violent Night</em> (2022) introduces Harbour's Santa and gives you a quick way to tell whether the series' mix of action and Christmas comedy suits your group.</li>
    </ul>

    <h2 id="screening-formats" tabIndex={-1}>How to choose a screening</h2>
    <p><strong>Check the opening in your city first.</strong> Nine films in the table appear on <ExternalLink href={cinemaUnited}>Cinema United's wide-release calendar</ExternalLink>, which covers titles expected to play at 2,000 or more North American locations. <em>Look Back</em> begins in select theaters before its January expansion. For a local booking, use your theater's listing to confirm the day and showtime.</p>
    <p><strong>Read the format next to the specific showtime.</strong> Look for “IMAX 70mm” in the <em>Dune</em> listing if you want a projected film print. A showtime labeled simply “IMAX” can use digital projection. <em>Werwulf</em> has a 35mm listing at the Jacob Burns Film Center. Check other venues individually for that format.</p>
    <figure>
      <ArticleImage src={photo.src} alt="A reel of 70mm film on an IMAX projector at the Jeu de Paume in Paris" width={1000} height={750} />
      <figcaption>An IMAX 70mm film reel at the Jeu de Paume, Paris. <ExternalLink href={photo.source}>Photo by DiscoA340</ExternalLink> · <ExternalLink href={photo.license}>CC0 1.0</ExternalLink>. Resized and compressed.</figcaption>
    </figure>
    <p>Planning a trip sooner? See the <Link to="/blog/november-2026-movie-releases">November U.S. release calendar</Link>. If you're staying in, pick something from our <Link to="/blog/best-sci-fi-movies-2026">2026 sci-fi watchlist</Link> or try a round of <Link to="/movie-quiz">guessing movies from stills</Link>.</p>
  </>,
};

export default post;
