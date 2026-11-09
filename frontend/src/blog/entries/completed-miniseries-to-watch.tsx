import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import editorialIllustration from "../components/editorialIllustration";

const coverPath = "/blog-assets/completed-miniseries-to-watch-cover.webp";
const sources = {
  unorthodox: "https://www.netflix.com/title/81019069",
  whenTheySeeUs: "https://www.netflix.com/title/80200549",
  chernobyl: "https://www.hbomaxlapress.com/news/667",
  chernobylEpisodes: "https://tv.apple.com/us/show/chernobyl/umc.cmc.4r07f208iugn79go4pmvpcqbt",
  chernobylUS: "https://www.justwatch.com/us/tv-show/chernobyl",
  normalPeople: "https://press.hulu.com/shows/normal-people/",
  normalPeopleUS: "https://www.hulu.com/series/normal-people-57048262-2ca5-41ee-9b57-53bb9b9e1596",
  normalPeopleEpisodes: "https://www.tvmaze.com/shows/42361/normal-people/episodeguide",
  memorial: "https://tv.apple.com/us/show/five-days-at-memorial/umc.cmc.50agn5zbvuj7z70teq1p0pixn",
  memorialPress: "https://www.apple.com/tv-pr/originals/five-days-at-memorial/",
  memorialEpisodes: "https://www.tvmaze.com/shows/50057/five-days-at-memorial/episodeguide",
  queensGambit: "https://www.netflix.com/title/80234304",
  oneDay: "https://www.netflix.com/title/81256740",
  oneDayEpisodes: "https://www.tvmaze.com/shows/59243/one-day/episodeguide",
  godless: "https://www.netflix.com/title/80097141",
  stationEleven: "https://press.wbd.com/us/media-release/hbo-max/hbo-max-releases-teaser-and-first-look-images-max-original-limited-series-station",
  stationElevenUS: "https://www.justwatch.com/us/tv-show/station-eleven",
  stationElevenEpisodes: "https://www.tvmaze.com/shows/42845/station-eleven/episodeguide",
  maid: "https://www.netflix.com/title/81166770",
};

// Whole-minute episode listings, not episode count multiplied by a typical length.
// Netflix: five titles below. Apple TV: Chernobyl. TVmaze: the other four.
const picks = [
  { id: "unorthodox", title: "Unorthodox", year: "2020", minutes: [52, 52, 55, 54], mood: "A short, intimate story of starting again", service: "Netflix", viewing: sources.unorthodox },
  { id: "when-they-see-us", title: "When They See Us", year: "2019", minutes: [63, 71, 73, 88], mood: "An unflinching drama about injustice", service: "Netflix", viewing: sources.whenTheySeeUs },
  { id: "chernobyl", title: "Chernobyl", year: "2019", minutes: [59, 65, 62, 65, 72], mood: "History, institutional failure and mounting dread", service: "HBO Max", viewing: sources.chernobylUS },
  { id: "normal-people", title: "Normal People", year: "2020", minutes: [30, 28, 33, 31, 31, 33, 27, 28, 22, 26, 28, 23], mood: "A romance built from small, consequential moments", service: "Hulu", viewing: sources.normalPeopleUS },
  { id: "five-days-at-memorial", title: "Five Days at Memorial", year: "2022", minutes: [40, 40, 47, 47, 53, 45, 54, 53], mood: "A hospital disaster and its moral aftermath", service: "Apple TV", viewing: sources.memorial },
  { id: "the-queens-gambit", title: "The Queen's Gambit", year: "2020", minutes: [59, 65, 46, 48, 48, 60, 68], mood: "Competition, ambition and a gifted outsider", service: "Netflix", viewing: sources.queensGambit },
  { id: "one-day", title: "One Day", year: "2024", minutes: [39, 27, 22, 28, 33, 27, 31, 29, 24, 32, 19, 27, 26, 36], mood: "A bittersweet romance unfolding across the years", service: "Netflix", viewing: sources.oneDay },
  { id: "godless", title: "Godless", year: "2017", minutes: [70, 69, 74, 68, 50, 41, 80], mood: "A frontier town, an outlaw and a looming reckoning", service: "Netflix", viewing: sources.godless },
  { id: "station-eleven", title: "Station Eleven", year: "2021–2022", minutes: [44, 46, 49, 44, 54, 44, 53, 57, 57, 59], mood: "Survival, memory and the need to make art", service: "HBO Max", viewing: sources.stationElevenUS },
  { id: "maid", title: "Maid", year: "2021", minutes: [50, 52, 47, 48, 59, 57, 53, 59, 60, 54], mood: "A mother's struggle for safety and independence", service: "Netflix", viewing: sources.maid },
];

const totalMinutes = (minutes: number[]) => minutes.reduce((total, value) => total + value, 0);
function viewingTime(minutes: number[]) {
  const rounded = Math.round(totalMinutes(minutes) / 5) * 5;
  const hours = Math.floor(rounded / 60);
  return `About ${hours}h${rounded % 60 ? ` ${rounded % 60}m` : ""}`;
}

function seriesFacts(id: string) {
  const pick = picks.find(item => item.id === id)!;
  return <p className="hq-watchlist-facts"><strong>{pick.year}</strong> · {pick.minutes.length} episodes · {viewingTime(pick.minutes)} · <a href={pick.viewing}>{pick.service}: viewing page</a></p>;
}

function seriesStill(id: string) {
  return editorialIllustration(`miniseries-${id}`);
}


const post: BlogPost = {
  slug: "completed-miniseries-to-watch",
  title: "10 Completed Miniseries to Watch Over a Weekend",
  seoTitle: "10 Completed Miniseries to Watch Over a Weekend",
  excerpt: "Find a finished miniseries for the weekend: ten spoiler-free picks with episode counts, calculated viewing times, tone notes and US streaming links.",
  date: "2026-11-01",
  modified: "2026-11-09",
  tags: ["Streaming & New Releases", "Drama", "2010s", "2020s"],
  coverUrl: "https://hard-quiz.com" + coverPath,
  listingCoverUrl: "https://hard-quiz.com/blog-assets/completed-miniseries-to-watch-640.webp",
  socialImagePath: "/blog-assets/completed-miniseries-to-watch-social.webp",
  contents: [
    { id: "weekend-picks", label: "Compare time, mood and US streaming" },
    { id: "what-completed-means", label: "What we mean by completed" },
    ...picks.map(pick => ({ id: pick.id, label: pick.title })),
    { id: "plan-your-weekend", label: "Make a realistic weekend plan" },
    { id: "how-we-checked", label: "How we checked the running times" },
    { id: "miniseries-questions", label: "Questions before you start" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Netflix — Unorthodox: limited-series label, four episodes, lengths and premise", url: sources.unorthodox },
    { label: "Netflix — When They See Us: four-part limited series and episode lengths", url: sources.whenTheySeeUs },
    { label: "HBO — Chernobyl: five-part miniseries announcement", url: sources.chernobyl },
    { label: "Apple TV US — Chernobyl: five episode lengths", url: sources.chernobylEpisodes },
    { label: "JustWatch US — Chernobyl: HBO Max subscription listings", url: sources.chernobylUS },
    { label: "Hulu Press — Normal People: adaptation, cast and twelve-episode format", url: sources.normalPeople },
    { label: "Hulu — Normal People: US series listing; may redirect by region", url: sources.normalPeopleUS },
    { label: "TVmaze — Normal People: episode-level running times", url: sources.normalPeopleEpisodes },
    { label: "Apple TV US — Five Days at Memorial: subscription viewing and episode catalog", url: sources.memorial },
    { label: "Apple TV Press — Five Days at Memorial: limited series and credits", url: sources.memorialPress },
    { label: "TVmaze — Five Days at Memorial: all eight episode lengths", url: sources.memorialEpisodes },
    { label: "Netflix — The Queen's Gambit: seven episodes, lengths and credits", url: sources.queensGambit },
    { label: "Netflix — One Day: limited-series format and premise", url: sources.oneDay },
    { label: "TVmaze — One Day: fourteen episode lengths", url: sources.oneDayEpisodes },
    { label: "Netflix — Godless: seven episodes, lengths and premise", url: sources.godless },
    { label: "Warner Bros. Discovery — Station Eleven: ten-episode limited series and cast", url: sources.stationEleven },
    { label: "JustWatch US — Station Eleven: HBO Max subscription listings", url: sources.stationElevenUS },
    { label: "TVmaze — Station Eleven: ten episode lengths", url: sources.stationElevenEpisodes },
    { label: "Netflix — Maid: ten episodes, lengths and premise", url: sources.maid },
    { label: "JustWatch US — Unorthodox: regional subscription cross-check", url: "https://www.justwatch.com/us/tv-show/unorthodox" },
    { label: "JustWatch US — When They See Us: regional subscription cross-check", url: "https://www.justwatch.com/us/tv-show/when-they-see-us" },
    { label: "JustWatch US — Normal People: Hulu availability cross-check", url: "https://www.justwatch.com/us/tv-show/normal-people" },
    { label: "JustWatch US — The Queen's Gambit: regional subscription cross-check", url: "https://www.justwatch.com/us/tv-show/the-queens-gambit" },
    { label: "JustWatch US — One Day: regional subscription cross-check", url: "https://www.justwatch.com/us/tv-show/one-day" },
    { label: "JustWatch US — Godless: regional subscription cross-check", url: "https://www.justwatch.com/us/tv-show/godless" },
    { label: "JustWatch US — Maid: regional subscription cross-check", url: "https://www.justwatch.com/us/tv-show/maid" },
  ],
  content: () => <>
    <p><strong>For a weekend series with an ending, try <a href="#the-queens-gambit">The Queen's Gambit</a> for an absorbing competition drama, <a href="#unorthodox">Unorthodox</a> for the shortest commitment here, or <a href="#station-eleven">Station Eleven</a> for a more expansive, reflective story.</strong> All ten selections have finished their released run; none requires waiting for a weekly finale.</p>
    <p>The useful question is how much of your weekend you want to give one story. Four long episodes can take nearly five hours; twelve short ones can fit into less than six. The table below adds the episode lengths rather than treating every series as a season of hour-long television. It also separates a manageable running time from an easy emotional watch.</p>

    <figure>
      <ArticleImage src={coverPath} alt="Original Hard Quiz weekend planner illustration with Saturday and Sunday cards and short episode strips." width={1200} height={675} priority />
      <figcaption>Original Hard Quiz illustration. The episode strips are decorative; use the table for actual viewing times.</figcaption>
    </figure>

    <section className="hq-release-index" aria-labelledby="weekend-picks">
      <h2 id="weekend-picks" tabIndex={-1}>Ten finished miniseries, from shortest to longest</h2>
      <p>US viewing pages checked November 1, 2026. Times are approximate totals, rounded to the nearest five minutes; they exclude adverts, pauses and bonus material. <a href="#how-we-checked">See the calculation notes.</a></p>
      <table>
        <caption>Choose one complete story for the weekend. This is an order by time, not a ranking of quality.</caption>
        <thead><tr><th scope="col">Miniseries / mood</th><th scope="col">Episodes / total</th><th scope="col">US viewing</th></tr></thead>
        <tbody>{picks.map(pick => <tr key={pick.id}>
          <th scope="row"><a href={"#" + pick.id}>{pick.title}</a><span className="hq-release-note">{pick.mood}</span></th>
          <td>{pick.minutes.length} episodes<span className="hq-release-note">{viewingTime(pick.minutes)}</span></td>
          <td><a href={pick.viewing}>{pick.service}</a></td>
        </tr>)}</tbody>
      </table>
      <p>The services shown are selected subscription routes, not an exhaustive list of rental or purchase offers. HBO Max entries link to US availability listings; Apple TV here means its subscription, not every title sold in the Apple TV Store. Confirm the title and your plan before subscribing.</p>
    </section>

    <h2 id="what-completed-means" tabIndex={-1}>What counts as a completed miniseries?</h2>
    <p>For this list, the released episodes form a self-contained dramatic work with a concluding episode. We have left out ongoing shows, seasons waiting for a finale and cancellations that strand an unfinished central plot. A deliberately open final choice can still be an ending: <em>Normal People</em> is the clearest example here.</p>
    <p>This does not mean every character gets a tidy future, that a dramatization settles every real-world question, or that a producer could never revisit the material. We checked the released format, episode list and the kind of closure the story offers. The descriptions below explain the fit without revealing the endings.</p>

    <section className="hq-watchlist-entry" aria-labelledby="unorthodox">
      <h2 id="unorthodox" tabIndex={-1}>Unorthodox: a short series with room to breathe</h2>
      {seriesFacts("unorthodox")}
      {seriesStill("unorthodox")}
      <p>Esty leaves her Hasidic community in Brooklyn for Berlin, where a group of musicians opens up an unfamiliar way of living. Shira Haas plays a young woman trying to work out what belongs to her, while the life she has left behind remains close.</p>
      <p>Choose this when you want a character story you can finish without reserving both days. Its four parts make a concentrated arc, with music and new friendships giving the upheaval something tangible to move toward. Expect pressure around marriage, faith and personal autonomy rather than a light travel escape. The conclusion leaves a life ahead of Esty; it does not require another season to complete this first movement toward independence.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="when-they-see-us">
      <h2 id="when-they-see-us" tabIndex={-1}>When They See Us: four parts that deserve time between them</h2>
      {seriesFacts("when-they-see-us")}
      {seriesStill("when-they-see-us")}
      <p>Ava DuVernay's drama follows five teenagers wrongly accused after the 1989 Central Park attack, and the families living with the consequences. Its scope extends beyond an investigation into the years that an accusation can take from a person.</p>
      <p>Four episodes make this sound smaller than it feels. Each is substantial, and the last is the longest; leave space around the viewing rather than treating it as an evening's background television. It is the choice for a historical social drama, with coercive questioning, racism and imprisonment central to the experience. The four-part work reaches its conclusion, but the injustice it depicts is not packaged as an easy mystery to solve.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="chernobyl">
      <h2 id="chernobyl" tabIndex={-1}>Chernobyl: a disaster story driven by the cost of denial</h2>
      {seriesFacts("chernobyl")}
      {seriesStill("chernobyl")}
      <p>The 1986 nuclear disaster becomes a five-part drama about people trying to understand an emergency while institutions resist what they are saying. Jared Harris, Stellan Skarsgård and Emily Watson anchor the story's scientists and officials.</p>
      <p>Pick it for the tension of expertise colliding with power: a measurement or an unwelcome explanation can be as consequential as a physical act of rescue. The series has a defined historical scope and a concluding episode rather than a seasonal cliffhanger. It is a demanding weekend choice, with distressing injuries and deaths. It is also a dramatization, not a substitute for historical or scientific accounts of the accident.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="normal-people">
      <h2 id="normal-people" tabIndex={-1}>Normal People: twelve episodes, a relatively small time commitment</h2>
      {seriesFacts("normal-people")}
      {seriesStill("normal-people")}
      <p>Marianne and Connell move from school in a small Irish town to university, carrying a private connection into changing social worlds. Daisy Edgar-Jones and Paul Mescal play the pair in this adaptation of Sally Rooney's novel.</p>
      <p>The short chapters suit viewers who would rather watch relationships change through conversations, hesitations and misunderstandings than through large plot machinery. Twelve episodes need not mean twelve hours. The ending is intentionally open about the characters' future, so choose another title if you need every romantic question tied off. This is a finished adaptation with that openness built in, not a promise of a later resolving season. Expect explicit intimacy, family abuse and difficult mental-health material.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="five-days-at-memorial">
      <h2 id="five-days-at-memorial" tabIndex={-1}>Five Days at Memorial: the emergency and the questions afterward</h2>
      {seriesFacts("five-days-at-memorial")}
      {seriesStill("five-days-at-memorial")}
      <p>Hurricane Katrina leaves a New Orleans hospital facing rising water, failing power and decisions made under extreme conditions. Vera Farmiga, Cherry Jones and Cornelius Smith Jr. lead the cast of the limited series adapted from Sheri Fink's reporting.</p>
      <p>The title describes the crisis, not the full shape of the story: the eight episodes also make room for its aftermath. Choose it if you want to follow how a disaster becomes an argument about responsibility. Its completed run does not turn the ethical questions into comfortable answers. This is one of the heaviest options here, particularly for viewers sensitive to hospital deaths and failures of care; shorter running time is not a measure of emotional intensity.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="the-queens-gambit">
      <h2 id="the-queens-gambit" tabIndex={-1}>The Queen's Gambit: the strongest all-round starting point</h2>
      {seriesFacts("the-queens-gambit")}
      {seriesStill("the-queens-gambit")}
      <p>Beth Harmon discovers a remarkable aptitude for chess while growing up in an orphanage, then enters a competitive world that offers recognition without necessarily giving her stability. Anya Taylor-Joy leads Scott Frank and Allan Scott's seven-part adaptation of Walter Tevis's novel.</p>
      <p>This is the most straightforward recommendation here if you want ambition, changing surroundings and the momentum of a competition. You do not need to study chess before starting; the drama gives the matches personal stakes. Beth's trajectory has a full arc across the seven episodes, which makes the time investment easy to judge. The glossy period setting comes with addiction and isolation, so it is not an uncomplicated comfort watch.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="one-day">
      <h2 id="one-day" tabIndex={-1}>One Day: a long relationship told in short chapters</h2>
      {seriesFacts("one-day")}
      {seriesStill("one-day")}
      <p>Emma and Dexter meet around their university graduation, then the series returns to their lives on the same date across successive years. Ambika Mod and Leo Woodall lead this fourteen-episode adaptation of David Nicholls's novel, distinct from the 2011 film.</p>
      <p>The appeal is watching what changes between meetings: a career, a friendship, a way of speaking to someone who knew you earlier. It suits viewers who enjoy romance shaped by time and missed opportunities. Fourteen chapters still make a shorter commitment than several seven-episode dramas in this list. Expect a bittersweet, emotionally heavy story, not a reassurance that the romantic-comedy setup will keep everything gentle. The released adaptation has a concluding chapter.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="godless">
      <h2 id="godless" tabIndex={-1}>Godless: a western worth giving the whole weekend</h2>
      {seriesFacts("godless")}
      {seriesStill("godless")}
      <p>A fleeing outlaw finds refuge near a mining town whose population has been transformed by catastrophe, while his former gang leader searches for him. Scott Frank's western stars Michelle Dockery, Jack O'Connell and Jeff Daniels.</p>
      <p>Choose this for a larger cast, frontier landscapes and the accumulating tension around a threatened community. The seven episodes have very different lengths, including an extended finale; episode count alone understates the commitment. Its central conflict belongs to this one limited series, so you can make room for it without signing up for years of television. Be prepared for violent attacks and sexual violence, rather than assuming the period setting makes it an easy family watch.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="station-eleven">
      <h2 id="station-eleven" tabIndex={-1}>Station Eleven: what people preserve after the world changes</h2>
      {seriesFacts("station-eleven")}
      {seriesStill("station-eleven")}
      <p>After a devastating flu, survivors build new lives while a traveling group keeps performing Shakespeare. Patrick Somerville's adaptation of Emily St. John Mandel's novel moves between the world before the collapse and the people trying to live afterward.</p>
      <p>Pick this when you have time for connections to gather across different timelines. It offers a more reflective reason to watch an apocalypse story: memory, performance and the relationships that outlast a familiar world. The ten-episode limited series reaches a conclusion, although the lives it imagines are larger than the portion we see. Pandemic loss and violence remain part of the story; the interest in art does not make the opening catastrophe mild.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="maid">
      <h2 id="maid" tabIndex={-1}>Maid: a full weekend with a determined, exhausted mother</h2>
      {seriesFacts("maid")}
      {seriesStill("maid")}
      <p>Alex leaves an abusive relationship with her young daughter and begins cleaning houses while trying to secure somewhere safe to live. Margaret Qualley leads the series, with Andie MacDowell playing Alex's mother.</p>
      <p>The drama is in the practical obstacles: work, childcare, housing and the systems that are supposed to help. That makes it a different kind of suspense from a criminal investigation. Choose it for a sustained character journey, but budget for the longest run in this selection and for difficult material involving abuse and poverty. The ten episodes complete this stage of Alex's story; they do not pretend that independence is achieved through a single encouraging decision.</p>
    </section>

    <h2 id="plan-your-weekend" tabIndex={-1}>Make a weekend plan you will actually enjoy</h2>
    <p><strong>For one long sitting, Unorthodox is the clearest fit.</strong> With a little more room, <em>When They See Us</em> fits below five hours, though its subject may make separate sittings preferable. A pause does not make a series any less complete.</p>
    <p><strong>For two substantial sessions, start with The Queen's Gambit or One Day.</strong> Their totals are similar despite very different episode counts. <em>Normal People</em> gives you even more short stopping points. Add meals, breaks and any advertising to the published running times.</p>
    <p><strong>For most of both days, choose Godless, Station Eleven or Maid.</strong> Let the chapters dictate the break instead of dividing the episode count in half. A longer finale can make the last few episodes a much bigger sitting than they first appear.</p>
    <p>If that is more television than you want, our <Link to="/blog/movies-like-knives-out">movies like Knives Out guide</Link> offers a single-film alternative. Between episodes, you can also test your movie and actor recognition with <strong>Choose a game</strong> below.</p>

    <h2 id="how-we-checked" tabIndex={-1}>How we checked episodes, time and availability</h2>
    <p>We checked the official series or distributor pages for the format, premise and credits, then reviewed the released episode lists. The selection combines romance, historical drama, a western, speculative fiction and social drama; it is not a list of ten crime shows or a claim to rank every miniseries.</p>
    <p><strong>Viewing time is calculated, not timed with a stopwatch.</strong> We added Netflix's individual episode lengths for <em>Unorthodox</em>, <em>When They See Us</em>, <em>The Queen's Gambit</em>, <em>Godless</em> and <em>Maid</em>; Apple TV's five episode listings for <em>Chernobyl</em>; and TVmaze's complete episode guides for the other four. Totals are rounded to the nearest five minutes. Catalogs can round individual episodes differently or list different edits, so your player may differ by a few minutes. Trailers, interviews, recaps outside the episodes and advertising are not added.</p>
    <p>US viewing routes were checked on <time dateTime="2026-11-01">November 1, 2026</time>, using official title pages and US catalog listings. Netflix's public pages can localize to the visitor's country; the six Netflix selections were cross-checked in JustWatch's US catalog. Hulu's <em>Normal People</em> page was checked through its indexed official text and a US catalog cross-check because direct opening redirected by region. Subscription playback and checkout were not tested. Catalogs and plan eligibility can change.</p>
    <p>These are editorial recommendations based on the cited material, not claims of firsthand screenings. The guide was prepared with AI assistance. The lists of episode lengths and calculation sources are preserved in the accompanying editorial record.</p>

    <section className="hq-article-faq" aria-labelledby="miniseries-questions">
      <h2 id="miniseries-questions" tabIndex={-1}>Questions before you start</h2>
      <h3>Which is the shortest completed miniseries here?</h3>
      <p><em>Unorthodox</em>: four episodes totaling about three hours and thirty-five minutes using the listed episode lengths. That makes it the easiest time commitment here, though its story of leaving a restrictive marriage is not light entertainment.</p>
      <h3>Does a completed miniseries have to resolve everything?</h3>
      <p>No. A work can conclude its central arc while leaving the characters' future open. <em>Normal People</em> is included on that basis. If you need a neatly settled romantic outcome, choose a different title rather than treating its ending as a missing episode.</p>
      <h3>Are all ten miniseries available on Netflix?</h3>
      <p>No. Six are listed on Netflix in the US; <em>Chernobyl</em> and <em>Station Eleven</em> have HBO Max routes, <em>Normal People</em> is on Hulu, and <em>Five Days at Memorial</em> has an Apple TV subscription route. Check the linked title listing in your country before paying.</p>
      <h3>Can I finish one of these without watching all weekend?</h3>
      <p>Yes. Pick by the total time rather than the number of episodes. <em>Unorthodox</em> leaves most of a weekend free, and the shorter chapters of <em>Normal People</em> or <em>One Day</em> make it easier to stop between other plans. The longer picks are options, not a viewing target you need to meet.</p>
    </section>
  </>,
};

export default post;
