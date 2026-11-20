import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import ExternalLink from "../components/ExternalLink";

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
  excerpt: "Seven 2026 thrillers compared by who holds the advantage: thieves, colleagues, a camera or the landscape. Reasons to choose, reservations and US viewing notes.",
  date: "2026-10-22",
  modified: "2026-11-21",
  tags: ["Streaming & New Releases", "Thriller", "2020s"],
  coverUrl: "https://hard-quiz.com" + coverPath,
  listingCoverUrl: "https://hard-quiz.com" + coverPath,
  socialImagePath: "/blog-assets/best-thriller-movies-2026-social.webp",
  contents: [
    { id: "quick-picks", label: "Choose your kind of thriller" },
    ...picks.map(({ id, title }) => ({ id, label: title })),
    { id: "who-holds-advantage", label: "Choose who holds the advantage" },
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
    <p>A good thriller makes you keep track of an advantage. Somebody has the money, controls the camera, knows the route or gets to ask the questions. These seven 2026 films earn their places through different arrangements of that power. The useful choice is which arrangement you want to watch come under pressure.</p>
    <p><strong><a href="#crime-101">Crime 101</a> is our first recommendation for a crime-film evening:</strong> a thief, an investigator and an insurance broker give the same job three sets of stakes. Choose <a href="#the-rip">The Rip</a> for suspicion inside a team, <a href="#the-weight">The Weight</a> for a bargain carried into hostile country or <a href="#primetime">Primetime</a> for the discomfort of turning an investigation into television. The selection and US viewing table use an October 22 cutoff. The descriptions preserve the films' discoveries.</p>

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
      <p>The pattern is the telling detail. Professional discipline helps a thief repeat a successful method; repetition also gives an investigator something to recognise. Add an insurance broker with different professional pressures and the job becomes an intersection of three lives. That is why we put Layton's Don Winslow adaptation first for a crime evening. Choose it for the people making the plan as well as the mechanics of executing it.</p>
      <p>Make room for a substantial crime drama rather than expecting a compact puzzle. The interest lies in the people as well as the mechanics. <ExternalLink href={official.crime}>Amazon's official guide</ExternalLink> confirms that the film is included with Prime Video; check the local listing before pressing play.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="the-rip">
      <h2 id="the-rip" tabIndex={-1}>The Rip: when the dangerous question is whom to trust</h2>
      <p className="hq-watchlist-facts"><strong>Writer-director:</strong> Joe Carnahan · <strong>Key cast:</strong> Matt Damon, Ben Affleck, Teyana Taylor, Steven Yeun · <strong>Netflix release:</strong> January 16, 2026</p>
      <p>A team of Miami police officers discovers millions of dollars in a stash house. The money has to be counted before they can leave, turning an apparently successful seizure into an extended test of trust. Other people want the cash, and the officers cannot be certain of one another's intentions.</p>
      <p>Counting money should make the situation more certain. Here it keeps the officers in a house where nobody can be certain about the people counting beside them. That contradiction earns its place in the selection. Damon and Affleck's familiar partnership supplies an extra reason to watch their exchanges closely: an audience can bring a sense of trust that the characters' circumstances promptly put under strain. Choose it when hesitation inside a group is the tension you want.</p>
      <p>Choose it for a contained crime problem that grows increasingly volatile. It makes a useful double bill with <em>Crime 101</em>: one film follows people moving toward a job, while this one traps its team with the proceeds. <ExternalLink href={official.rip}>Netflix's film guide</ExternalLink> confirms the cast, premise and release.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="the-weight">
      <h2 id="the-weight" tabIndex={-1}>The Weight: a survival thriller with something to lose</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Padraic McKinley · <strong>Key cast:</strong> Ethan Hawke, Russell Crowe, Julia Jones · <strong>US theatrical release:</strong> September 18, 2026</p>
      <p>During the Great Depression, Samuel Murphy is sent to a prison camp and faces losing his daughter. A warden offers him an apparent route back to her: help carry gold through hostile country. Murphy joins a group of inmates for a journey in which the people sharing the burden may be as dangerous as the terrain.</p>
      <p>The gold makes the bargain physical. Murphy cannot simply want a route back to his daughter; he has to carry a burden through terrain and company he cannot control. That gives this survival choice a different shape from <em>Apex</em>'s pursuit. One character is trying to get away from a hunter; the other has accepted a task because of the person waiting beyond it. Choose the pressure of an obligation if that distinction is what draws you in.</p>
      <p>Pick this when you want physical hardship and human treachery in the same film. Its appeal is closer to an arduous journey than a rapid succession of revelations. The <ExternalLink href={official.weight}>producer's announcement</ExternalLink> confirms the September US opening; its earlier Sundance appearance was also in 2026.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="primetime">
      <h2 id="primetime" tabIndex={-1}>Primetime: for a more disturbing kind of ambition</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Lance Oppenheim · <strong>Key cast:</strong> Robert Pattinson, Skyler Gisondo, Merritt Wever · <strong>US theatrical release:</strong> September 25, 2026</p>
      <p>In 2006, <em>To Catch a Predator</em> host Chris Hansen sets out to make television history. Robert Pattinson plays Hansen in Oppenheim's dramatization, which turns the machinery of a television sting into the subject of a thriller. The question is what happens to the pursuit of justice when the pursuit of an audience becomes part of it.</p>
      <p>A television sting has two audiences: the person in the room and the people who will later watch the room. That gives this premise its particular discomfort. An investigation can become a performance, and the demand for a useful image can become a pressure on the people making it. Choose <em>Primetime</em> when you want to question the arrangement of a scene as well as follow its danger. Pattinson playing a familiar television figure adds another layer to that act of watching.</p>
      <p>Expect an adult story about exploitation and media power. It is inspired by real events, but it is a dramatic film, not a documentary record of the television series. <ExternalLink href={official.primetime}>A24's official page</ExternalLink> provides the release details and current showtimes without requiring a plot recap.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="disclosure-day">
      <h2 id="disclosure-day" tabIndex={-1}>Disclosure Day: for conspiracy suspense on a larger scale</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Steven Spielberg · <strong>Key cast:</strong> Emily Blunt, Josh O'Connor, Colin Firth · <strong>US theatrical release:</strong> June 12, 2026</p>
      <p>A meteorologist and a government cybersecurity whistleblower become involved in an effort to reveal evidence of extraterrestrial life. The threat is bigger than a single crime: proof that changes what people believe about the world also changes the stakes for anyone trying to keep it hidden.</p>
      <p>Proof matters because somebody else needs to see it. That makes disclosure a dramatic action in itself: getting information changes a person's position, and making it public changes everybody else's. We include Spielberg and David Koepp's sci-fi thriller for that outward movement. Compare it with <em>Primetime</em> if screens interest you as instruments of power. Here the invitation is to a secret reaching a public audience, on a much larger scale than a room of suspects.</p>
      <p>It is also the PG-13 option in this selection. That classification is a useful starting point for a family discussion, rather than a guarantee that every child will find it comfortable. <ExternalLink href={official.disclosure}>Peacock's US page</ExternalLink> confirms the premise, credits and current subscription availability.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="apex">
      <h2 id="apex" tabIndex={-1}>Apex: for a chase you can understand immediately</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Baltasar Kormákur · <strong>Key cast:</strong> Charlize Theron, Taron Egerton, Eric Bana · <strong>Netflix release:</strong> April 24, 2026</p>
      <p>A grieving climber heads into the Australian wilderness and finds herself pursued by a killer. Charlize Theron plays Sasha, with Taron Egerton as the man hunting her. Distance, terrain and physical endurance become practical problems rather than background scenery.</p>
      <p>Terrain becomes useful when somebody has to cross it and another person is following. That is our reason to include this as the direct pursuit option: distance and cover give the danger a readable physical shape. Netflix's <ExternalLink href={official.apex}>production guide</ExternalLink> discusses the New South Wales shoot and Theron's physical work. Choose it for movement through a landscape; <em>The Rip</em> offers the opposite invitation, holding its team in place with a problem between them.</p>
      <p>Set your expectations accordingly: <ExternalLink href={reviews.apex}>its reception is more divided</ExternalLink> than that of the strongest picks above, with praise for Theron and the locations alongside criticism of the familiar story. It earns a place here as a clear recommendation for a particular mood. If you want intricate motives or a mystery to solve, start elsewhere on the list.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="send-help">
      <h2 id="send-help" tabIndex={-1}>Send Help: when survival comes with an office grudge</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Sam Raimi · <strong>Leads:</strong> Rachel McAdams, Dylan O'Brien · <strong>US theatrical release:</strong> January 30, 2026</p>
      <p>Two colleagues survive a plane crash and wash up on an island. They need one another, but they also bring a history of resentment into a place where workplace rank has little practical value. The survival problem and the argument over power are inseparable.</p>
      <p>The argument has a practical test: whose skills are useful now? An island makes it possible to reconsider a workplace rank without asking human resentment to disappear along with the workplace. That earns Raimi's film the cruel-comedy place in this selection. Compare it with <em>The Weight</em>, where a bargain with authority sends a man into danger; here the danger makes the authority itself open to dispute. Choose it when a contest of wills is part of the evening's pleasure.</p>
      <p>This is a horror crossover, and its R rating matters if you were expecting a restrained survival drama. We also include it in our <Link to="/blog/best-horror-movies-2026">2026 horror watchlist</Link>; here, the attraction is the two-person contest of wills. The <ExternalLink href={official.help}>studio's page</ExternalLink> lists Hulu, Hulu on Disney+ and digital purchase options.</p>
    </section>

    <h2 id="who-holds-advantage" tabIndex={-1}>Choose who holds the advantage</h2>
    <p><strong>For a plan, compare <em>Crime 101</em> and <em>The Rip</em>.</strong> The first sets several people on courses toward a job; the second holds a team with money already found. Choose between watching intentions converge and watching people reassess one another in a shared room.</p>
    <p><strong>For a physical test, compare <em>The Weight</em> and <em>Apex</em>.</strong> A burden and a pursuer make different demands on a landscape. One promises a way back to somebody; the other turns getting away into the immediate need. <em>Send Help</em> adds a third practical problem: needing the person you resent.</p>
    <p><strong>For the power of an image, compare <em>Primetime</em> and <em>Disclosure Day</em>.</strong> Each gives a screen consequences beyond the person standing in front of it. Choose the unsettling construction of a television event or the much broader threat of a secret becoming public. Those are different sources of suspense, even when both involve somebody demanding the truth.</p>

    <section className="hq-release-index" aria-labelledby="where-to-watch">
      <h2 id="where-to-watch" tabIndex={-1}>Where to watch these thrillers in the US</h2>
      <p>These are the viewing routes listed at our October 22 check. Subscription access and a paid rental are different offers; follow the linked page to confirm the option in your country.</p>
      <table>
        <caption>US viewing information checked October 22, 2026. Local availability can change.</caption>
        <thead><tr><th scope="col">Film</th><th scope="col">Viewing route</th></tr></thead>
        <tbody>
          <tr><th scope="row">Crime 101</th><td><ExternalLink href={official.crime}>Prime Video subscription</ExternalLink></td></tr>
          <tr><th scope="row">The Rip</th><td><ExternalLink href={official.rip}>Netflix subscription</ExternalLink></td></tr>
          <tr><th scope="row">The Weight</th><td><ExternalLink href={reviews.weight}>Digital rental or purchase listed on Fandango</ExternalLink></td></tr>
          <tr><th scope="row">Primetime</th><td><ExternalLink href={official.primetime}>Check A24's current theater listings</ExternalLink></td></tr>
          <tr><th scope="row">Disclosure Day</th><td><ExternalLink href={official.disclosure}>Peacock subscription</ExternalLink></td></tr>
          <tr><th scope="row">Apex</th><td><ExternalLink href={official.apex}>Netflix subscription</ExternalLink></td></tr>
          <tr><th scope="row">Send Help</th><td><ExternalLink href={official.help}>Hulu / Hulu on Disney+; digital purchase also listed</ExternalLink></td></tr>
        </tbody>
      </table>
    </section>

    <h2 id="how-we-chose" tabIndex={-1}>How we chose the films</h2>
    <p>We looked for films released to US audiences in 2026 by October 22, then cross-checked distributor information against the review coverage linked below. The final selection follows a particular rule: each premise gives somebody an advantage whose security can be questioned. That lets us compare a thief's method, a team's trust, a television production and a physical pursuit. <em>Apex</em> is the more divisive survival option, included with that limitation explained.</p>
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
