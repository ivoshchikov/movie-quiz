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
    reason: "Start here if you like seeing a character work a problem from first principles. One of the film’s pleasures is watching Grace figure out how to ask a question when he has no common language with the being who might answer it. Give it a full evening. The long running time buys room for the friendship and the experiments to develop.",
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
    reason: "The weather broadcast makes a good entry point for a story about disclosure. A person whose job is to calmly explain the world suddenly gives the audience something it can see and hear without knowing how to interpret. Pick this for the size of that public reaction and the conspiracy around it. If you’d rather watch two characters learn to communicate in relative quiet, start with Project Hail Mary.",
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
    reason: "The diner gives the movie an immediate test for its outlandish premise. How convincing would a warning from the future have to be before you put down your fork and follow the person delivering it? Verbinski takes the ensemble on several detours, so this works best if you enjoy a restless satire with room for odd jokes. There’s violence amid the comedy.",
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
    reason: "It’s the easiest pick here for a mixed-age movie night. The beaver is a funny way into a good question about technology. If it suddenly let you hear from everyone affected by a decision, whose interests would you discover you’d been ignoring? The movie has plenty of noisy animal business along the way.",
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
    reason: "This is the quickest watch on the list. The pleasure is in seeing ordinary landmarks acquire new stakes. A driveway or the end of the block looks different when you can no longer assume what lies beyond it. Choose it for family survival and creature suspense. You’ll get more out of the change in scenery if you go in with only the setup.",
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
    reason: "The machine gives Irene another opportunity every time she uses it. That makes the idea unusually well suited to a story about a habit she has trouble breaking. Choose it if the part of a multiverse story that interests you is what repetition does to the traveler. The violence and the loss of a child make this one of the harsher choices here.",
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
    reason: "Pick this when you have the patience to watch faces, rooms and routines for clues. The rough 16mm texture and the way Jenkin builds the sound make the harbor feel like a working place before you have to decide what’s happening there. It pairs well with Redux Redux if you want two films that ask what you’d do with another version of your life. This one moves at the pace of a village, with much less interest in explaining the machinery.",
  },
];

const post: BlogPost = {
  slug: "best-sci-fi-movies-2026",
  title: "Best Sci-Fi Movies of 2026 So Far: A Spoiler-Free Watchlist",
  seoTitle: "Best Sci-Fi Movies of 2026 So Far: What to Watch",
  excerpt: "Seven 2026 sci-fi movies to match your mood, from Project Hail Mary to Rose of Nevada, with spoiler-free picks, runtimes and US viewing links.",
  date: "2026-11-03",
  modified: "2026-11-09",
  tags: ["Streaming & New Releases", "Sci-Fi", "2020s"],
  coverUrl: "https://hard-quiz.com" + cover,
  listingCoverUrl: "https://hard-quiz.com/blog-assets/best-sci-fi-movies-2026-640.webp",
  socialImagePath: "/blog-assets/best-sci-fi-movies-2026-social.webp",
  contents: [
    { id: "quick-picks", label: "Compare the seven picks" },
    ...films.map(film => ({ id: film.id, label: film.title })),
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
    <p><strong><a href="#project-hail-mary">Project Hail Mary</a> is our first pick for a sci-fi movie night in 2026.</strong> If you have less than two hours, try <a href="#the-end-of-oak-street">The End of Oak Street</a> for a fast creature adventure or <a href="#rose-of-nevada">Rose of Nevada</a> for something quiet and strange. For a family watch, start with <a href="#hoppers">Hoppers</a>.</p>
    <p>All seven films are available to watch at home in the US through at least one of the routes below. The recommendations stick to the setup, so you can pick a film without finding out what happens when its big idea starts to pay off.</p>

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

    <h2 id="how-we-chose" tabIndex={-1}>How we chose and checked the films</h2>
    <p>A film qualifies if it reached US audiences in regular theatrical or home release in 2026 by November 3. Earlier festival premieres are allowed. <em>Redux Redux</em> played SXSW in 2025, and <em>Rose of Nevada</em> premiered at Venice that year. <em>Good Luck, Have Fun, Don’t Die</em> also screened at a festival in 2025. All three reached US theaters in regular release in 2026, which explains why the year can differ across listings.</p>
    <p>We chose features in which a speculative idea drives the story. A robot body changes what Mabel can do in <em>Hoppers</em>, just as travel between realities gives Irene choices she would never have in an ordinary revenge film. We used distributor materials and published reviews to compare the premises, tone and approach. The order is editorial, and each film can be watched on its own.</p>
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
