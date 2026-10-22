import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";

const coverPath = "/blog-assets/best-thriller-movies-2026-cover.webp";
const official = {
  crime: "https://www.aboutamazon.com/news/entertainment/crime-101-chris-hemsworth-amazon-mgm-studios",
  rip: "https://www.netflix.com/tudum/articles/rip-ben-affleck-matt-damon-release-date-photos-news",
  weight: "https://www.augenschein-filmproduktion.de/en/news/first-trailer-for-the-weight-starring-ethan-hawke-and-russell-crowe.html",
  primetime: "https://a24films.com/films/primetime",
  disclosure: "https://www.peacocktv.com/stream-movies/disclosure-day",
  apex: "https://www.netflix.com/tudum/articles/apex-release-date-cast-news",
  help: "https://www.20thcenturystudios.com/movies/send-help",
};
const reviews = {
  crime: "https://www.rottentomatoes.com/m/crime_101_2026",
  rip: "https://www.rottentomatoes.com/m/the_rip",
  weight: "https://www.rottentomatoes.com/m/the_weight_2026",
  primetime: "https://www.rottentomatoes.com/m/primetime",
  disclosure: "https://www.rottentomatoes.com/m/disclosure_day",
  apex: "https://www.rottentomatoes.com/m/apex_2026",
  help: "https://www.rottentomatoes.com/m/send_help",
};
const picks = [
  { id: "crime-101", title: "Crime 101", mood: "A character-driven heist" },
  { id: "the-rip", title: "The Rip", mood: "Police corruption and mistrust" },
  { id: "the-weight", title: "The Weight", mood: "A desperate wilderness journey" },
  { id: "primetime", title: "Primetime", mood: "Psychological unease and media ambition" },
  { id: "disclosure-day", title: "Disclosure Day", mood: "A science-fiction conspiracy" },
  { id: "apex", title: "Apex", mood: "A direct survival chase" },
  { id: "send-help", title: "Send Help", mood: "A viciously funny power struggle" },
];

const post: BlogPost = {
  slug: "best-thriller-movies-2026",
  title: "Best Thriller Movies of 2026 So Far: A Spoiler-Free Guide",
  seoTitle: "Best Thriller Movies of 2026 So Far: 7 Picks",
  excerpt: "Seven of the best thriller movies of 2026 so far, from Crime 101 to The Weight. Choose by mood and find spoiler-free advice and US viewing options.",
  date: "2026-10-22",
  tags: ["Streaming & New Releases", "Thriller", "2020s"],
  coverUrl: "https://hard-quiz.com" + coverPath,
  listingCoverUrl: "https://hard-quiz.com" + coverPath,
  socialImagePath: "/blog-assets/best-thriller-movies-2026-social.webp",
  contents: [
    { id: "quick-picks", label: "Choose your kind of thriller" },
    ...picks.map(({ id, title }) => ({ id, label: title })),
    { id: "where-to-watch", label: "Where to watch in the US" },
    { id: "how-we-chose", label: "How we chose the films" },
    { id: "thriller-questions", label: "Questions before you watch" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Amazon — Crime 101: premise, filmmaker, cast and Prime Video availability", url: official.crime },
    { label: "Netflix Tudum — The Rip: release, premise and credits", url: official.rip },
    { label: "augenschein — The Weight: premise, credits and September 18 US theatrical release", url: official.weight },
    { label: "A24 — Primetime: official synopsis, cast and September 25 release", url: official.primetime },
    { label: "Peacock — Disclosure Day: premise, credits, US release, classification and viewing", url: official.disclosure },
    { label: "Netflix Tudum — Apex: premise, cast, filmmaker and Netflix availability", url: official.apex },
    { label: "20th Century Studios — Send Help: release, genre, credits and home viewing", url: official.help },
    { label: "Rotten Tomatoes — Crime 101: critical reception and US release", url: reviews.crime },
    { label: "Rotten Tomatoes — The Rip: critical reception", url: reviews.rip },
    { label: "Rotten Tomatoes — The Weight: critical reception and digital viewing", url: reviews.weight },
    { label: "Rotten Tomatoes — Primetime: critical reception", url: reviews.primetime },
    { label: "Rotten Tomatoes — Disclosure Day: critical reception", url: reviews.disclosure },
    { label: "Rotten Tomatoes — Apex: critical reception", url: reviews.apex },
    { label: "Rotten Tomatoes — Send Help: critical reception", url: reviews.help },
  ],
  content: () => <>
    <p><strong>Start with <a href="#crime-101">Crime 101</a> for a smart heist thriller, <a href="#the-weight">The Weight</a> for a dangerous journey through the wilderness, or <a href="#primetime">Primetime</a> for something more psychologically uncomfortable.</strong> If you want a tense night on the sofa without choosing a rental, <a href="#the-rip">The Rip</a> and <a href="#apex">Apex</a> are Netflix options with very different kinds of pressure.</p>
    <p>The best thriller for tonight depends on what you want to worry about. A plan falling apart? A partner withholding something? A person who cannot get away? These seven recommendations cover US releases available by <time dateTime="2026-10-22">October 22, 2026</time>, with the advertised setup, reasons to choose each film and a few useful reservations. There are no endings or concealed identities below.</p>

    <figure>
      <ArticleImage src={coverPath} alt="Original Hard Quiz thriller artwork: seven connected case-file markers, a beam of light and the words Thrillers 2026" width={1200} height={675} priority />
      <figcaption>Original Hard Quiz artwork, created for this guide.</figcaption>
    </figure>

    <section className="hq-release-index" aria-labelledby="quick-picks">
      <h2 id="quick-picks" tabIndex={-1}>The quick picks: seven different ways to build suspense</h2>
      <table>
        <caption>Choose by the experience you want. These films are grouped by appeal, rather than ranked by a score.</caption>
        <thead><tr><th scope="col">Film</th><th scope="col">Choose it for</th></tr></thead>
        <tbody>{picks.map(pick => <tr key={pick.id}><th scope="row"><a href={"#" + pick.id}>{pick.title}</a></th><td>{pick.mood}</td></tr>)}</tbody>
      </table>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="crime-101">
      <h2 id="crime-101" tabIndex={-1}>Crime 101: the first pick for heist-film fans</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Bart Layton · <strong>Key cast:</strong> Chris Hemsworth, Halle Berry, Mark Ruffalo · <strong>US theatrical release:</strong> February 13, 2026</p>
      <p>A jewel thief has been working the 101 freeway so methodically that a detective believes he can finally identify a pattern. An insurance broker, facing a turning point in her own career, becomes entangled in the thief's next move. The setup gives three people a reason to watch one another closely, and three different ideas about what a successful outcome would mean.</p>
      <p>That is the attraction of <em>Crime 101</em>: the robbery is a meeting point for characters with lives beyond the job. Layton adapts a Don Winslow novella, and the <a href={reviews.crime}>critical response</a> has been especially positive about the ensemble. It is the most natural starting point here if you want professional criminals, patient police work and the pull of a carefully prepared score.</p>
      <p>Make room for a substantial crime drama rather than expecting a compact puzzle. The interest lies in the people as well as the mechanics. <a href={official.crime}>Amazon's official guide</a> confirms that the film is included with Prime Video; check the local listing before pressing play.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="the-rip">
      <h2 id="the-rip" tabIndex={-1}>The Rip: when the dangerous question is whom to trust</h2>
      <p className="hq-watchlist-facts"><strong>Writer-director:</strong> Joe Carnahan · <strong>Key cast:</strong> Matt Damon, Ben Affleck, Teyana Taylor, Steven Yeun · <strong>Netflix release:</strong> January 16, 2026</p>
      <p>A team of Miami police officers discovers millions of dollars in a stash house. The money has to be counted before they can leave, turning an apparently successful seizure into an extended test of trust. Other people want the cash, and the officers cannot be certain of one another's intentions.</p>
      <p>Damon and Affleck's familiarity makes the premise particularly appealing: two actors audiences associate with friendship are placed inside a story built on suspicion. Carnahan's film is a good choice if the moment before somebody answers a question interests you as much as the moment somebody reaches for a weapon. <a href={reviews.rip}>Reviews collected by Rotten Tomatoes</a> praise that partnership, while some find the action less persuasive than the early uncertainty.</p>
      <p>Choose it for a contained crime problem that grows increasingly volatile. It makes a useful double bill with <em>Crime 101</em>: one film follows people moving toward a job, while this one traps its team with the proceeds. <a href={official.rip}>Netflix's film guide</a> confirms the cast, premise and release.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="the-weight">
      <h2 id="the-weight" tabIndex={-1}>The Weight: a survival thriller with something to lose</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Padraic McKinley · <strong>Key cast:</strong> Ethan Hawke, Russell Crowe, Julia Jones · <strong>US theatrical release:</strong> September 18, 2026</p>
      <p>During the Great Depression, Samuel Murphy is sent to a prison camp and faces losing his daughter. A warden offers him an apparent route back to her: help carry gold through hostile country. Murphy joins a group of inmates for a journey in which the people sharing the burden may be as dangerous as the terrain.</p>
      <p>The emotional bargain gives this pick a different shape from a simple escape movie. Freedom is attached to a task, and completing the task means relying on others whose interests may change. Hawke plays Murphy and Crowe the warden; the <a href={reviews.weight}>strong critical reception</a> repeatedly points to Hawke's performance as a reason the stripped-down story holds its weight.</p>
      <p>Pick this when you want physical hardship and human treachery in the same film. Its appeal is closer to an arduous journey than a rapid succession of revelations. The <a href={official.weight}>producer's announcement</a> confirms the September US opening; its earlier Sundance appearance was also in 2026.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="primetime">
      <h2 id="primetime" tabIndex={-1}>Primetime: for a more disturbing kind of ambition</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Lance Oppenheim · <strong>Key cast:</strong> Robert Pattinson, Skyler Gisondo, Merritt Wever · <strong>US theatrical release:</strong> September 25, 2026</p>
      <p>In 2006, <em>To Catch a Predator</em> host Chris Hansen sets out to make television history. Robert Pattinson plays Hansen in Oppenheim's dramatization, which turns the machinery of a television sting into the subject of a thriller. The question is what happens to the pursuit of justice when the pursuit of an audience becomes part of it.</p>
      <p>This is the pick for psychological and moral discomfort. Instead of asking only whether a suspect will be caught, the premise asks who controls the image, who benefits from it and what the demand for spectacle does to everybody involved. <a href={reviews.primetime}>Its generally favorable reception</a> highlights Pattinson and the filmmaking, although critics disagree about how far the film takes its argument.</p>
      <p>Expect an adult story about exploitation and media power. It is inspired by real events, but it is a dramatic film, not a documentary record of the television series. <a href={official.primetime}>A24's official page</a> provides the release details and current showtimes without requiring a plot recap.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="disclosure-day">
      <h2 id="disclosure-day" tabIndex={-1}>Disclosure Day: for conspiracy suspense on a larger scale</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Steven Spielberg · <strong>Key cast:</strong> Emily Blunt, Josh O'Connor, Colin Firth · <strong>US theatrical release:</strong> June 12, 2026</p>
      <p>A meteorologist and a government cybersecurity whistleblower become involved in an effort to reveal evidence of extraterrestrial life. The threat is bigger than a single crime: proof that changes what people believe about the world also changes the stakes for anyone trying to keep it hidden.</p>
      <p>Choose <em>Disclosure Day</em> if you want suspense to open outward into science fiction. Spielberg directs from a David Koepp screenplay, with Blunt and O'Connor among the ensemble. The <a href={reviews.disclosure}>critical consensus</a> emphasizes Blunt's work and the film's interest in human connection; reservations concern the way the larger story fits together. That makes it a better match for viewers drawn to discovery and conspiracy than those seeking a tightly bounded detective case.</p>
      <p>It is also the PG-13 option in this selection. That classification is a useful starting point for a family discussion, rather than a guarantee that every child will find it comfortable. <a href={official.disclosure}>Peacock's US page</a> confirms the premise, credits and current subscription availability.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="apex">
      <h2 id="apex" tabIndex={-1}>Apex: for a chase you can understand immediately</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Baltasar Kormákur · <strong>Key cast:</strong> Charlize Theron, Taron Egerton, Eric Bana · <strong>Netflix release:</strong> April 24, 2026</p>
      <p>A grieving climber heads into the Australian wilderness and finds herself pursued by a killer. Charlize Theron plays Sasha, with Taron Egerton as the man hunting her. Distance, terrain and physical endurance become practical problems rather than background scenery.</p>
      <p>This is the most straightforward pursuit movie on the list. The reason to choose it is the bodily tension of somebody having to keep moving, find cover and use the landscape. Kormákur's experience with survival stories is a useful fit for that premise. Netflix's <a href={official.apex}>production and cast guide</a> places the shoot in New South Wales and discusses Theron's demanding physical work.</p>
      <p>Set your expectations accordingly: <a href={reviews.apex}>its reception is more divided</a> than that of the strongest picks above, with praise for Theron and the locations alongside criticism of the familiar story. It earns a place here as a clear recommendation for a particular mood. If you want intricate motives or a mystery to solve, start elsewhere on the list.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="send-help">
      <h2 id="send-help" tabIndex={-1}>Send Help: when survival comes with an office grudge</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Sam Raimi · <strong>Leads:</strong> Rachel McAdams, Dylan O'Brien · <strong>US theatrical release:</strong> January 30, 2026</p>
      <p>Two colleagues survive a plane crash and wash up on an island. They need one another, but they also bring a history of resentment into a place where workplace rank has little practical value. The survival problem and the argument over power are inseparable.</p>
      <p>Raimi's film is the choice for readers who want their tension mixed with cruel humor. The situation offers something especially satisfying to debate afterward: which skills matter once the office disappears, and how quickly should authority change hands? <a href={reviews.help}>Its favorable critical reception</a> singles out the two leads and the film's readiness to push its premise into vicious territory.</p>
      <p>This is a horror crossover, and its R rating matters if you were expecting a restrained survival drama. We also include it in our <Link to="/blog/best-horror-movies-2026">2026 horror watchlist</Link>; here, the attraction is the two-person contest of wills. The <a href={official.help}>studio's page</a> lists Hulu, Hulu on Disney+ and digital purchase options.</p>
    </section>

    <section className="hq-release-index" aria-labelledby="where-to-watch">
      <h2 id="where-to-watch" tabIndex={-1}>Where to watch these thrillers in the US</h2>
      <p>These are the viewing routes listed at our October 22 check. Subscription access and a paid rental are different offers; follow the linked page to confirm the option in your country.</p>
      <table>
        <caption>US viewing information checked October 22, 2026. Local availability can change.</caption>
        <thead><tr><th scope="col">Film</th><th scope="col">Viewing route</th></tr></thead>
        <tbody>
          <tr><th scope="row">Crime 101</th><td><a href={official.crime}>Prime Video subscription</a></td></tr>
          <tr><th scope="row">The Rip</th><td><a href={official.rip}>Netflix subscription</a></td></tr>
          <tr><th scope="row">The Weight</th><td><a href={reviews.weight}>Digital rental or purchase listed on Fandango</a></td></tr>
          <tr><th scope="row">Primetime</th><td><a href={official.primetime}>Check A24's current theater listings</a></td></tr>
          <tr><th scope="row">Disclosure Day</th><td><a href={official.disclosure}>Peacock subscription</a></td></tr>
          <tr><th scope="row">Apex</th><td><a href={official.apex}>Netflix subscription</a></td></tr>
          <tr><th scope="row">Send Help</th><td><a href={official.help}>Hulu / Hulu on Disney+; digital purchase also listed</a></td></tr>
        </tbody>
      </table>
    </section>

    <h2 id="how-we-chose" tabIndex={-1}>How we chose the films</h2>
    <p>We looked for films released to US audiences in 2026 by October 22, then cross-checked distributor information against the review coverage linked below. Favorable critical reception helped establish the shortlist; a distinct reason to watch determined the final mix. <em>Apex</em> is the more divisive survival option, included with that limitation explained.</p>
    <p>The result covers crime, wilderness survival, psychological unease, science fiction and one horror crossover. It does not rank unreleased trailers alongside finished films, and the order is not a numerical verdict. The recommendations are editorial judgments based on source research, not claims of firsthand screenings. No critic score has been turned into a Hard Quiz rating.</p>

    <section className="hq-article-faq" aria-labelledby="thriller-questions">
      <h2 id="thriller-questions" tabIndex={-1}>Questions before you choose a thriller</h2>
      <h3>Which 2026 thriller should I watch first?</h3>
      <p><em>Crime 101</em> is the broadest recommendation for a crime-film evening. Choose <em>The Weight</em> if a dangerous journey appeals more than a heist, or <em>Primetime</em> if you want to think about media ambition and the discomfort of watching. Those are different experiences, which is why this guide starts with a mood table.</p>
      <h3>Which picks are on Netflix?</h3>
      <p><em>The Rip</em> and <em>Apex</em> are the Netflix films in this selection, confirmed by the service's own pages. Pick <em>The Rip</em> for an ensemble under suspicion and <em>Apex</em> for a physical pursuit. Availability in your account depends on your location.</p>
      <h3>Which are psychological thrillers rather than horror?</h3>
      <p><em>Primetime</em> is the clearest choice here for psychological and moral unease. <em>The Rip</em> builds suspense through suspicion within a group. If you want to avoid the deliberate horror-comedy mixture, leave <em>Send Help</em> for another evening. Genre labels overlap; the individual entries explain the source of each film's tension.</p>
      <h3>Do I need to watch anything beforehand?</h3>
      <p>These seven picks work as standalone stories. <em>Crime 101</em> adapts a novella, and <em>Primetime</em> draws on real events, but neither requires homework. Avoid ending explainers and extended plot summaries until afterward if you want to preserve the discoveries.</p>
    </section>

    <h2>Keep the movie night going</h2>
    <p>For something more frightening, use our <Link to="/blog/best-horror-movies-2026">best horror movies of 2026 guide</Link>. For another survival story adapted from a novel, our <Link to="/blog/is-whalefall-based-on-a-book">Whalefall book and movie guide</Link> explains the source material. Planning a cinema trip instead? Check our <Link to="/blog/november-2026-movie-releases">November 2026 US movie releases</Link>.</p>
    <p>Think you would recognize these stars without a title card? Try <Link to="/">Hard Quiz's movie and actor games</Link>, or open the <Link to="/daily">Daily Challenge</Link> for today's shared quiz. Classic can be played as a guest; Daily requires an account.</p>
    <p><small>Prepared with AI assistance using studio, distributor and streaming-service information, checked against published critical reception. Facts and US viewing options were checked on October 22, 2026.</small></p>
  </>,
};

export default post;
