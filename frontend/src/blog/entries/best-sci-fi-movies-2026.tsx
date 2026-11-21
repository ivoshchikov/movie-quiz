import { Link } from "react-router-dom";
import ArticleImage from "../components/ArticleImage";
import filmContent from "../components/filmContent";
import type { BlogPost } from "../types";
import ExternalLink from "../components/ExternalLink";

const cover = "/blog-assets/best-sci-fi-movies-2026-cover.webp";
const films = [
  {
    id: "project-hail-mary",

    title: "Project Hail Mary",
    angle: "For a space adventure with some warmth",
    mood: "First contact, spaceflight and a hopeful streak",
    release: "March 20",
    runtime: "2h 36m",
    viewing: "Prime Video subscription",
    url: "https://www.aboutamazon.com/news/entertainment/project-hail-mary-ryan-gosling-amazon-mgm-studios",
    premise: "Ryan Gosling plays Ryland Grace, a science teacher who wakes aboard a spacecraft with little memory of how he got there. What begins as a search for his bearings becomes a mission to figure out why the Sun is losing energy. Phil Lord and Christopher Miller direct the adaptation of Andy Weir’s novel.",
    reason: "The useful distinction is what Grace does when he lacks an answer: he has to make a test. That gives this mission a different appeal from the exposure and public panic of Disclosure Day. Choose it for the pleasure of making something intelligible, including a relationship across a language barrier. We put it first because cooperation is a generous way into this selection. At 2h 36m it needs an evening, and readers seeking a brisk creature chase should head to Oak Street instead.",
  },
  {
    id: "disclosure-day",

    title: "Disclosure Day",
    angle: "For a first-contact mystery on Earth",
    mood: "Alien contact, secrecy and public panic",
    release: "June 12",
    runtime: "2h 25m",
    viewing: "Peacock subscription",
    url: "https://www.peacocktv.com/stream-movies/disclosure-day",
    premise: "An on-air incident involving a TV meteorologist played by Emily Blunt puts an extraordinary secret in public view. Josh O’Connor plays a man trying to bring the truth out. Steven Spielberg directs, with a screenplay by David Koepp.",
    reason: "A weather presenter is supposed to make uncertainty manageable. An inexplicable incident on her broadcast reverses that job in front of an audience. That is the detail that earns this its place: first contact arrives through a familiar screen, and the question immediately becomes who gets to explain what everybody saw. Choose it for public alarm and conspiracy. Project Hail Mary offers the more intimate communication problem; this one sends the disturbance out into the world.",
  },
  {
    id: "good-luck-have-fun-dont-die",

    title: "Good Luck, Have Fun, Don’t Die",
    angle: "For an AI comedy that runs hot",
    mood: "Time travel, AI anxiety and dark comedy",
    release: "February 13",
    runtime: "2h 14m",
    viewing: "Hulu subscription",
    url: "https://www.hulu.com/movie/good-luck-have-fun-dont-die-39d9aea5-a4f3-44b1-9d6c-539ff6fe3bef",
    premise: "A stranger who says he comes from the future walks into a Los Angeles diner and tries to recruit the people eating there to help stop a rogue AI. Sam Rockwell plays the stranger in Gore Verbinski’s dark comedy.",
    reason: "A diner is a fine place to announce the end of the world: everybody has somewhere else to be. The recruitment premise makes belief a practical decision before the AI argument can become an abstract debate. Would you leave your meal for this stranger? It is our choice for an impatient, argumentative group of characters and a restless dark-comedy mood. Allow for detours and violence; the title is a warning about the invitation, not an assurance of a gentle evening.",
  },
  {
    id: "hoppers",

    title: "Hoppers",
    angle: "For a family movie with an actual sci-fi idea",
    mood: "Robot bodies, animal communication and comedy",
    release: "March 6",
    runtime: "1h 49m",
    viewing: "Disney+ subscription",
    url: "https://www.disneyplus.com/browse/entity-38ce207f-bd54-4e94-92b9-5854b5a409fe",
    premise: "In Daniel Chong’s Pixar film, Mabel uses technology that lets her inhabit a robotic beaver and communicate with animals. She wants to protect a local habitat, and going undercover changes whose opinions she has to take seriously.",
    reason: "The robot beaver changes the direction of the conversation. Mabel enters hoping to protect a habitat, then has to hear from the creatures who live there. That makes the technology a tool for changing perspective, which is why this earns the family slot rather than being included simply because Pixar made it. Choose it for animal comedy with an idea to discuss afterward. The noisy comic premise suits a different room from the quiet, uncertain harbour of Rose of Nevada.",
  },
  {
    id: "the-end-of-oak-street",

    title: "The End of Oak Street",
    angle: "For a creature adventure under two hours",
    mood: "A displaced neighborhood and creature suspense",
    release: "August 14",
    runtime: "1h 39m",
    viewing: "Digital rental or purchase",
    url: "https://www.endofoakstreet.com/",
    premise: "A suburban street is transported somewhere its residents don’t recognize. Anne Hathaway and Ewan McGregor play parents trying to keep their family together as the houses and yards around them become the edge of unfamiliar territory. David Robert Mitchell wrote and directed.",
    reason: "A suburb normally makes a promise: you know what comes after the next driveway. Moving the whole street breaks that promise while leaving its landmarks standing. That is the appeal to choose here: familiar domestic space becomes the edge of a survival problem. At 1h 39m it is the shortest commitment in this selection. Pick it for a family-in-danger creature adventure; a viewer hoping to sit with the rules of a speculative idea has better reasons to choose Project Hail Mary or Redux Redux.",
  },
  {
    id: "redux-redux",

    title: "Redux Redux",
    angle: "For a dark story about parallel worlds",
    mood: "Alternate realities, grief and revenge",
    release: "February 20",
    runtime: "About 1h 50m",
    viewing: "Digital rental or purchase",
    url: "https://tv.apple.com/us/movie/redux-redux/umc.cmc.1q1ov2dsu0t9r4fb7caznimtz",
    premise: "Michaela McManus plays Irene, a grieving mother who uses a machine to cross into other versions of her world and hunt the man who killed her daughter. Kevin and Matthew McManus turn that premise into a small-scale thriller.",
    reason: "A machine that offers another world sounds like a way to escape. Irene uses it to pursue the same purpose again. Our reason for including Redux Redux is that friction between infinite opportunity and an increasingly narrow life: the premise gives grief a repeat button. It pairs with Rose of Nevada as a darker question about getting another version of your life. Choose this one for revenge-thriller pressure, with the loss of a child and violence central to its appeal and its limits.",
  },
  {
    id: "rose-of-nevada",

    title: "Rose of Nevada",
    angle: "For a strange, slow time-travel film",
    mood: "Time displacement, coastal life and unease",
    release: "June 19",
    runtime: "1h 54m",
    viewing: "MUBI subscription",
    url: "https://mubi.com/en/us/films/rose-of-nevada",
    premise: "A fishing boat that vanished decades ago turns up again in a Cornish village. Two men, played by George MacKay and Callum Turner, take it back out to sea. When they return, the harbor is familiar in ways that make it harder to tell what’s wrong. Mark Jenkin wrote and directed.",
    reason: "The harbour has to feel like somewhere people work before its altered familiarity can trouble us. Jenkin’s 16mm images and constructed sound give this selection a different texture from its spaceships and screens; the BFI describes a production that adds dialogue and sound after filming. Our recommendation is to listen to the place as carefully as you study the faces. Choose it for uncertainty that gathers around daily routines. Viewers wanting a brisk explanation of time travel should take a different berth.",
  },
];

const post: BlogPost = {
  slug: "best-sci-fi-movies-2026",
  title: "Best Sci-Fi Movies of 2026 So Far: A Spoiler-Free Watchlist",
  seoTitle: "Best Sci-Fi Movies of 2026 So Far: What to Watch",
  excerpt: "Seven 2026 sci-fi films chosen for what an impossible rule does to an ordinary life, with comparisons, runtimes and dated US viewing links.",
  date: "2026-11-03",
  modified: "2026-11-21",
  tags: ["Streaming & New Releases", "Sci-Fi", "2020s"],
  coverUrl: "https://hard-quiz.com" + cover,
  listingCoverUrl: "https://hard-quiz.com/blog-assets/best-sci-fi-movies-2026-640.webp",
  socialImagePath: "/blog-assets/best-sci-fi-movies-2026-social.webp",
  contents: [
    { id: "quick-picks", label: "Compare the seven picks" },
    ...films.map(film => ({ id: film.id, label: film.title })),
    { id: "choose-an-idea", label: "Choose the question for your evening" },
    { id: "how-we-chose", label: "How we chose and checked the films" },
    { id: "sci-fi-questions", label: "Questions before you watch" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Amazon MGM Studios and Prime Video — Project Hail Mary release, premise and viewing", url: films[0].url },
    { label: "Rotten Tomatoes — Project Hail Mary runtime and reviews", url: "https://www.rottentomatoes.com/m/project_hail_mary" },
    { label: "Peacock — Disclosure Day US release, runtime, cast and viewing", url: films[1].url },
    { label: "Hulu — Good Luck, Have Fun, Don’t Die US viewing", url: films[2].url },
    { label: "Constantin Film — Good Luck, Have Fun, Don’t Die US theatrical release", url: "https://constantin.film/en/cinema/good-luck-have-fun-dont-die/" },
    { label: "Apple TV Store US — Good Luck, Have Fun, Don’t Die credits and runtime", url: "https://tv.apple.com/us/movie/good-luck-have-fun-dont-die/umc.cmc.7jtkucfs19f2zz383s5n0katk" },
    { label: "RogerEbert.com — Good Luck, Have Fun, Don’t Die review and US release", url: "https://www.rogerebert.com/reviews/good-luck-have-fun-dont-die-sam-rockwell-film-review-2026" },
    { label: "Disney — Hoppers theatrical date, premise and production", url: "https://thewaltdisneycompany.com/news/pixar-hoppers/" },
    { label: "Disney+ — Hoppers runtime and viewing", url: films[3].url },
    { label: "Warner Bros. — The End of Oak Street release, credits and viewing", url: films[4].url },
    { label: "Apple TV Store US — The End of Oak Street runtime and title listing", url: "https://tv.apple.com/us/movie/the-end-of-oak-street/umc.cmc.zgc43vpna42wfgfi645em0sm" },
    { label: "Saban Films — Redux Redux US release and distribution", url: "https://www.sabanfilms.com/news/" },
    { label: "Apple TV Store US — Redux Redux premise, runtime and title listing", url: films[5].url },
    { label: "SXSW — Redux Redux 2025 festival premiere", url: "https://schedule.sxsw.com/2025/events/FS18450" },
    { label: "AMC — Redux Redux theatrical runtime", url: "https://www.amctheatres.com/movies/redux-redux-82656" },
    { label: "Rose of Nevada official US release site — theatrical date and premise", url: "https://roseofnevada.film/" },
    { label: "MUBI — Rose of Nevada US viewing", url: films[6].url },
    { label: "Apple TV Store US — Rose of Nevada runtime and title listing", url: "https://tv.apple.com/us/movie/rose-of-nevada/umc.cmc.rosiiib6g1zh9lljugh2v0m6" },
    { label: "BFI — Rose of Nevada festival premiere and filmmaking", url: "https://www.bfi.org.uk/news/mark-jenkin-rose-nevada-bfi-distribution" },
    { label: "RogerEbert.com — Redux Redux review", url: "https://www.rogerebert.com/reviews/redux-redux-thriller-movie-review-2026" },
    { label: "RogerEbert.com — Rose of Nevada review", url: "https://www.rogerebert.com/reviews/rose-of-nevada-film-review-2026" },
  ],
  content: () => <>
    <p>A spaceship is a setting. The more interesting question is what somebody does after the setting stops obeying the rules. A teacher has to devise an experiment, a grieving mother gets another chance at the same revenge, and a girl in a robotic beaver body has to hear the other side of an argument. Those changes in behaviour are what earn these seven 2026 sci-fi films a place here.</p>
    <p><strong>Our broadest recommendation is <a href="#project-hail-mary">Project Hail Mary</a> for problem-solving that makes room for friendship.</strong> Choose <a href="#hoppers">Hoppers</a> for a family evening, <a href="#the-end-of-oak-street">The End of Oak Street</a> for the shortest creature adventure, or <a href="#rose-of-nevada">Rose of Nevada</a> when you want a familiar place to become strange slowly. The viewing table records US home-viewing routes checked on November 3; follow its links for current offers.</p>

    <figure>
      <ArticleImage src={cover} width={1200} height={675} priority alt="Hard Quiz’s original 2026 sci-fi watchlist graphic with symbols for space, artificial intelligence, alternate worlds and survival." />
    </figure>

    <section className="hq-release-index" aria-labelledby="quick-picks">
      <h2 id="quick-picks" tabIndex={-1}>Which 2026 sci-fi movie should you watch?</h2>
      <table>
        <caption>Seven standalone films, with US viewing options checked November 3, 2026.</caption>
        <thead><tr><th scope="col">Film</th><th scope="col">What it feels like</th><th scope="col">US viewing</th></tr></thead>
        <tbody>{films.map(film => <tr key={film.id}>
          <th scope="row"><a href={`#${film.id}`}>{film.title}</a></th>
          <td>{film.mood}<span className="hq-release-note">{film.runtime}</span></td>
          <td><ExternalLink href={film.url}>{film.viewing}</ExternalLink></td>
        </tr>)}</tbody>
      </table>
    </section>

    {films.map(film => <section className="hq-watchlist-entry" key={film.id} aria-labelledby={film.id}>
      <h2 id={film.id} tabIndex={-1}>{film.title}</h2>
      <p className="hq-watchlist-facts"><strong>{film.angle}</strong> · US release {film.release} · {film.runtime} · <ExternalLink href={film.url}>{film.viewing}</ExternalLink></p>
      {filmContent(`sci-fi-2026-${film.id}`, <>
        <p>{film.premise}</p>
        <p>{film.reason}</p>
      </>)}
    </section>)}

    <h2 id="choose-an-idea" tabIndex={-1}>Choose the question you want to spend the evening with</h2>
    <p><strong>Can understanding change the relationship?</strong> <em>Project Hail Mary</em> and <em>Hoppers</em> make communication practical work. One gives it a space mission; the other gives a would-be protector access to the animals she means to help. That is a useful pair for viewers who want the speculative idea to open up somebody's perspective.</p>
    <p><strong>What if another chance leaves you stuck?</strong> Put <em>Redux Redux</em> beside <em>Rose of Nevada</em>. Irene pursues a purpose across realities; the Cornish harbour makes a different life feel uncomfortably close to the one its characters know. Choose the former for a revenge-thriller premise, the latter for an uncertain place and a slower pace. The shared territory is what a changed world asks of a person.</p>
    <p><strong>Who gets to explain the emergency?</strong> <em>Disclosure Day</em> puts an inexplicable event in front of a television audience. <em>Good Luck, Have Fun, Don’t Die</em> begins with a stranger trying to persuade diners. Choose the scale and comic temperature you want; neither invitation is interchangeable with the family-survival problem on Oak Street.</p>

    <h2 id="how-we-chose" tabIndex={-1}>How we chose and checked the films</h2>
    <p>A film qualifies if it reached US audiences in regular theatrical or home release in 2026 by November 3. Earlier festival premieres are allowed. <em>Redux Redux</em> played SXSW in 2025, and <em>Rose of Nevada</em> premiered at Venice that year. <em>Good Luck, Have Fun, Don’t Die</em> also screened at a festival in 2025. All three reached US theaters in regular release in 2026, which explains why the year can differ across listings.</p>
    <p>Our selection rule is a speculative idea with a visible consequence for how people act, work or relate to somebody else. The entries compare those consequences, then the pace and kind of evening they suggest. Distributor materials and published reviews inform the factual setups and craft details; the comparisons are our editorial reasoning, without claims of firsthand screenings. Each film can be watched on its own.</p>
    <p>We checked US distributor and catalog listings on <time dateTime="2026-11-03">November 3, 2026</time>. The table gives one way to watch each film. Rental and purchase require a separate transaction. Catalogs, plans and running times can vary by service, and we didn’t test playback or checkout. This guide was prepared with AI assistance using the sources below.</p>
    <p>For more films with the tension of <em>Disclosure Day</em>, browse our <Link to="/blog/best-thriller-movies-2026">2026 thriller watchlist</Link>. If you’re choosing a cinema trip, see our <Link to="/blog/november-2026-movie-releases">November US release calendar</Link>.</p>

    <section className="hq-article-faq" aria-labelledby="sci-fi-questions">
      <h2 id="sci-fi-questions" tabIndex={-1}>Questions before you watch</h2>
      <div><h3>What’s the best 2026 sci-fi movie to start with?</h3><p>Choose <em>Project Hail Mary</em> for space travel, problem-solving and a hopeful tone. For a shorter, more unsettling pick, go with <em>The End of Oak Street</em>.</p></div>
      <div><h3>Which of these sci-fi movies are on subscription services?</h3><p>Start with <em>Project Hail Mary</em> on Prime Video, <em>Disclosure Day</em> on Peacock or <em>Hoppers</em> on Disney+. <em>Good Luck, Have Fun, Don’t Die</em> is on Hulu, and <em>Rose of Nevada</em> is on MUBI. The other two picks have digital rental and purchase options.</p></div>
      <div><h3>Why isn’t Dune: Part Three on the list?</h3><p>It hadn’t reached its US release by November 3. This watchlist covers films you can already choose for tonight.</p></div>
    </section>
  </>,
};

export default post;
