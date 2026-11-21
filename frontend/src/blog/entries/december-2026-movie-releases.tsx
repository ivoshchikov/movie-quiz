import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import ArticleImage from "../components/ArticleImage";
import ExternalLink from "../components/ExternalLink";
import { formatBlogDate } from "../presentation";
import type { BlogPost } from "../types";

const checkedOn = "2026-11-21";
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
    preview: <><p>Pedro Pascal plays Alex Serian, a cellist returning to Los Angeles after twenty years on the road. Tony Gilroy writes and directs, with Olivia Wilde and Eva Victor among the cast.</p><p>We would reserve this early-December slot for a viewer interested in the life organised around making art. Coming home gives the premise a useful question: what is left of a familiar place after a profession has kept someone moving for two decades? Put it beside <em>Look Back</em> as the month's other invitation to think about creative work. This is a reason to follow the announced story, rather than an advance verdict on its execution.</p></>,
  },
  {
    id: "violent-night-2", title: "Violent Night 2", date: "2026-12-04", pick: "R-rated Christmas action",
    sourceLabel: "Universal Pictures", source: "https://www.violentnightmovie.com/",
    preview: <><p>David Harbour's Santa faces a gangster terrorising a shopping mall, according to <ExternalLink href={violentNightShowtimes}>Cinemark's synopsis</ExternalLink>. The mall replaces the first film's family estate as the announced setting.</p><p>That makes it the Christmas-action invitation: festive retail space supplies a recognisable place for a distinctly unfestive confrontation. Suggest it to the group that wants the holiday treated as action-comedy material. The 2022 <em>Violent Night</em> is the most useful test of whether the combination suits you. <ExternalLink href={cinemaUnited}>Cinema United lists the sequel as R</ExternalLink>, so a Santa costume is insufficient family guidance.</p></>,
  },
  {
    id: "zero-ad", title: "Zero A.D.: The Birth of Christ", date: "2026-12-11", pick: "A biblical drama with high stakes",
    sourceLabel: "Angel Studios", source: "https://www.angel.com/press/zero-ad",
    preview: <><p>Mary tries to keep her newborn safe while King Herod sees the child as a threat to his rule. Angel lists PG-13 for strong violence and bloody imagery.</p><p>The planning distinction is between familiarity with a Nativity story and the intensity of a particular dramatization. This premise places the mother and child's safety under immediate pressure. Choose it for that biblical-drama invitation and check the content guidance before organising a church or mixed-age outing. A seasonal subject cannot settle that decision on its own.</p></>,
  },
  {
    id: "avengers-doomsday", title: "Avengers: Doomsday", date: "2026-12-18", pick: "A Marvel crossover",
    sourceLabel: "Disney Movies", source: "https://movies.disney.com/avengers-doomsday",
    preview: <><p>Anthony and Joe Russo bring together the Avengers, the Fantastic Four and returning X-Men, among others. Robert Downey Jr. plays Victor von Doom.</p><p>The booking question is how much of the attraction comes from recognising the people entering the frame. A crossover promises new combinations of shared history; that is a different investment from following Paul's continuing story in <em>Dune</em> on the same date. Choose the ensemble encounter if those meetings are what you want from the ticket. The catch-up suggestions below offer starting points without pretending two films explain an entire screen universe.</p></>,
  },
  {
    id: "dune-part-three", title: "Dune: Part Three", date: "2026-12-18", pick: "Epic science fiction",
    sourceLabel: "Warner Bros.", source: "https://www.dunemovie.com/",
    bookingNote: <>Insider screenings <time dateTime="2026-12-14">Dec 14</time>–<time dateTime="2026-12-15">15</time></>,
    preview: <><p>Denis Villeneuve's third film finds Paul Atreides in power and facing its consequences. Warner Bros. lists Dune Insider screenings on December 14 and 15 before the December 18 wide opening.</p><p>Where <em>Doomsday</em> invites recognition across teams, this invitation depends on following a rise into its aftermath. Give the first two films time if the people and politics of Arrakis have blurred together. For a projected 70mm print, use <ExternalLink href={imax70mm}>IMAX's venue list</ExternalLink> and check the actual showtime's format; the word IMAX alone does not identify a film print. Story preparation and projection choice are two separate parts of this booking.</p></>,
  },
  {
    id: "the-angry-birds-movie-3", title: "The Angry Birds Movie 3", date: "2026-12-23", pick: "An animated comedy before Christmas",
    sourceLabel: "Paramount Pictures", source: "https://www.paramount.com/movies/the-angry-birds-movie-3",
    preview: <><p>Red faces becoming a father alongside saving the world, with Jason Sudeikis, Josh Gad and Danny McBride returning as Red, Chuck and Bomb.</p><p>The family-calendar advantage is practical: its Wednesday opening gives you an option before Christmas Day's crowded selection. The announced parenting turn also supplies a reason to revisit Red beyond meeting the same trio again. Put it on a mixed-age shortlist if the earlier films suit your household, then check the current classification and showtimes. An animated sequel still needs an audience-specific choice.</p></>,
  },
  {
    id: "jumanji-open-world", title: "Jumanji: Open World", date: "2026-12-25", pick: "A group adventure comedy",
    sourceLabel: "Sony Pictures", source: "https://jumanji.movie/",
    preview: <><p>The game breaks into the real world, with Dwayne Johnson, Kevin Hart, Jack Black and Karen Gillan back for the final film in their trilogy. The <ExternalLink href={jumanjiShowtimes}>exhibitor synopsis</ExternalLink> repeats Sony's Christmas invitation.</p><p>Choose this candidate when the company is the point: a returning comic group has a new boundary for the game to cross. Catching up with <em>Welcome to the Jungle</em> and <em>The Next Level</em> is a more relevant use of preparation time than treating every film bearing the title as homework. This is the ensemble-adventure prospect on Christmas Day, beside the very different invitations of <em>Werwulf</em> and <em>Mr. Irrelevant</em>.</p></>,
  },
  {
    id: "werwulf", title: "Werwulf", date: "2026-12-25", pick: "Christmas-night folk horror",
    sourceLabel: "Focus Features", source: "https://www.focusfeatures.com/werwulf",
    bookingNote: <>35mm in Pleasantville, NY</>,
    preview: <><p>Robert Eggers directs a werewolf story with Aaron Taylor-Johnson, Lily-Rose Depp and Willem Dafoe. The <ExternalLink href={werwulf35mm}>Jacob Burns Film Center</ExternalLink> lists a 35mm presentation opening December 25 in Pleasantville, New York.</p><p>Make this the deliberate horror booking in the Christmas group, especially for viewers drawn to Eggers's earlier period settings in <em>The Witch</em> or <em>Nosferatu</em>. A director's earlier work gives you a reason to be curious, rather than evidence that an unreleased film succeeds. If the film-print presentation is part of the outing, verify the venue and format together; one theatre's listing is not a national 35mm rollout.</p></>,
  },
  {
    id: "mr-irrelevant", title: "Mr. Irrelevant", date: "2026-12-25", pick: "An NFL underdog story",
    sourceLabel: "Paramount Pictures", source: "https://www.paramount.com/movies/mr-irrelevant",
    preview: <><p>David Corenswet plays John Tuggle, the final pick of the 1983 NFL Draft, trying to earn a place with the New York Giants. Michael Shannon plays coach Bill Parcells.</p><p>A draft position is a public assessment before a player gets to demonstrate what he can do. That is the underdog premise worth bringing to this booking. Choose it for the contest between an assigned label and work on a team, even if the NFL is unfamiliar. It gives Christmas Day a sports-drama prospect beside a game-world adventure and a horror film; those audiences should agree on the invitation before buying a row of seats.</p></>,
  },
  {
    id: "look-back", title: "Look Back", date: "2026-12-30", pick: "A coming-of-age story about making art",
    sourceLabel: "GKIDS", source: "https://gkids.com/films/look-back-a-film-by-kore-eda/",
    rollout: "Select theaters",
    bookingNote: <>Nationwide expansion <time dateTime="2027-01-15">Jan 15</time></>,
    preview: <><p>Hirokazu Koreeda's live-action adaptation of Tatsuki Fujimoto's manga follows two girls whose drawings turn rivalry into a shared creative life. GKIDS lists December 30 in select theatres and January 15, 2027 nationwide.</p><p>This is our end-of-month alternative for somebody interested in the work behind making an image: practice, comparison and finding another person who cares about the same craft. <em>Behemoth!</em> offers the month's other announced creative-life story, at a very different career stage. The useful caution is geographic. A December date on a calendar will not help if your nearest engagement begins with the January expansion.</p></>,
  },
];

function releaseDate(film: Release) {
  return <><time dateTime={film.date}>{formatBlogDate(film.date)}</time><span className="hq-release-note">{film.rollout ?? "Wide release"}{film.bookingNote && <><br />{film.bookingNote}</>}</span></>;
}

const post: BlogPost = {
  slug: "december-2026-movie-releases",
  title: "December 2026 Movie Releases: US Theater Dates",
  excerpt: "Plan December 2026 by the evening you want: Dune or Avengers, a Christmas group outing or a story about making art, with checked US dates and format notes.",
  date: "2026-11-12",
  modified: "2026-11-21",
  tags: ["Streaming & New Releases", "2020s"],
  coverUrl: `https://hard-quiz.com${cover}`,
  listingCoverUrl: `https://hard-quiz.com${assetRoot}-640.webp`,
  socialImagePath: `${assetRoot}-social.webp`,
  contents: [
    { id: "release-dates", label: "December release calendar" },
    ...releases.map(film => ({ id: film.id, label: film.title })),
    { id: "reserve-an-evening", label: "Which evening should you reserve?" },
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
    { label: "Cinemark — Violent Night 2 synopsis", url: violentNightShowtimes },
  ],
  content: () => <>
    <p>December's hardest booking may be agreeing on what sort of evening it is. <strong><em>Avengers: Doomsday</em> and <em>Dune: Part Three</em> share December 18</strong>, while Christmas Day offers a comic game-world adventure, an Eggers werewolf film and an NFL drama. The release date brings those choices together; very little about their invitations makes them interchangeable.</p>
    <p>We chose ten announced US openings to help reserve an evening, decide on preparation and distinguish a national date from a showtime you can actually book. Dates and the cited format listings were rechecked on <time dateTime={checkedOn}>November 21, 2026</time>. These are planning judgments from announced premises and release information, with no claim of advance screenings.</p>

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

    <h2 id="reserve-an-evening" tabIndex={-1}>Which evening should you reserve?</h2>
    <p><strong>December 18: a continuing life or a crossover encounter.</strong> We would prioritise <em>Dune</em> for somebody invested in Paul's story, then choose the projection format. We would prioritise <em>Doomsday</em> for a group whose pleasure comes from seeing familiar teams meet. Both decisions are about what you bring to a new film; neither can be settled by the shared opening date.</p>
    <p><strong>Christmas: choose the company before the ticket.</strong> <em>Jumanji</em> offers returning comic personalities, <em>Werwulf</em> a deliberate horror outing and <em>Mr. Irrelevant</em> an underdog sports story. <em>The Angry Birds Movie 3</em> opens two days earlier, supplying another possible slot for a family plan. Content guidance and local listings should finish that choice.</p>
    <p><strong>For creative lives, compare the ends of the month.</strong> <em>Behemoth!</em> begins with an established musician returning home; <em>Look Back</em> begins with young artists finding a shared pursuit. Those premises give the selection a route away from franchise catch-up. Check the latter's limited December run before planning a trip around it.</p>

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
