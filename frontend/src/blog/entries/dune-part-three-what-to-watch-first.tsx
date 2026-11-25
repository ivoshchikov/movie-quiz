import { Link } from "react-router-dom";
import ArticleImage from "../components/ArticleImage";
import ExternalLink from "../components/ExternalLink";
import type { BlogPost } from "../types";

const checkedOn = "2026-11-25";
const cover = "/blog-assets/dune-viewing-guide.webp";
const movieSite = "https://www.dunemovie.com/";
const imax = "https://www.imax.com/news/dune-part-three-in-imax-70mm-film";
const appleDune = "https://tv.apple.com/us/movie/dune/umc.cmc.2l7qj9p33t3jww1roxi8cgiw5";
const applePartTwo = "https://tv.apple.com/us/movie/dune-part-two/umc.cmc.363aycnv6vy9qgekvew6fveb9";
const watchDune = "https://www.justwatch.com/us/movie/dune-2021";
const watchPartTwo = "https://www.justwatch.com/us/movie/dune-part-two-2023";
const director = "https://www.gq.com/video/watch/one-more-question-denis-villeneuve";
const voice = "https://www.vanityfair.com/video/watch/notes-on-a-scene-dune-director-denis-villenueve-breaks-down-the-gom-jabbar-scene";
const sound = "https://www.mixonline.com/post-and-broadcast/the-dynamic-sound-of-dune-part-two";
const book = "https://www.penguinrandomhouse.com/books/854497/dune-messiah-movie-tie-in-by-frank-herbert/";
const bookOrder = "https://www.penguinrandomhouse.com/series/AU8/dune/";
const lynch = "https://www.universalpicturesathome.com/movies/dune";
const miniseries = "https://www.syfy.com/syfy-wire/remembering-syfys-children-of-dune-miniseries";
const prophecy = "https://press.wbd.com/us/media-release/max-original-drama-series-dune-prophecy-debuts-fall";

const post: BlogPost = {
  slug: "dune-part-three-what-to-watch-first",
  title: "Before Dune: Part Three: What to Watch and Read",
  excerpt: "Plan your Dune catch-up in 5 hours and 21 minutes, get two spoiler-free rewatch cues, and decide whether to read Dune Messiah before the film.",
  date: "2026-11-25",
  tags: ["Streaming & New Releases", "Sci-Fi", "2020s"],
  coverUrl: `https://hard-quiz.com${cover}`,
  listingCoverUrl: "https://hard-quiz.com/blog-assets/dune-viewing-guide-640.webp",
  socialImagePath: cover,
  contents: [
    { id: "choose-your-route", label: "Choose your viewing route" },
    { id: "what-to-notice", label: "Two scenes worth revisiting" },
    { id: "read-dune-messiah", label: "Read Dune Messiah before or after?" },
    { id: "optional-adaptations", label: "When to watch the other adaptations" },
    { id: "us-viewing-and-release", label: "U.S. viewing and release details" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Apple TV U.S. listing for Dune (2021)", url: appleDune },
    { label: "Apple TV U.S. listing for Dune: Part Two (2024)", url: applePartTwo },
    { label: "Vanity Fair | Denis Villeneuve on the Gom Jabbar scene", url: voice },
    { label: "Mix | The Part Two sound team on sandwalking and worm riding", url: sound },
    { label: "Penguin Random House | Dune series in reading order", url: bookOrder },
    { label: "Penguin Random House | U.S. Dune Messiah tie-in edition (plot details)", url: book },
    { label: "GQ | Denis Villeneuve on adapting the first two novels (plot details)", url: director },
    { label: "Universal Pictures | Dune (1984)", url: lynch },
    { label: "Syfy | The two television miniseries (plot details)", url: miniseries },
    { label: "HBO | Dune: Prophecy and the Bene Gesserit", url: prophecy },
    { label: "JustWatch U.S. availability for Dune (2021)", url: watchDune },
    { label: "JustWatch U.S. availability for Dune: Part Two", url: watchPartTwo },
    { label: "Warner Bros. | Dune: Part Three opening and tickets (plot details)", url: movieSite },
    { label: "IMAX | Part Three 70mm venues (plot details)", url: imax },
  ],
  content: () => <>
    <p>In the first <em>Dune</em>, a woman can move someone across a room with a word. In <em>Part Two</em>, walking across sand safely takes a lesson. Those are the two scenes we would bring into a rewatch. One makes you feel what it is like to obey an order before you can think. The other asks you to learn the rhythm of someone else's home.</p>
    <p><strong>The essential watch order is <em>Dune</em> (2021), then <em>Dune: Part Two</em> (2024). Allow 5 hours and 21 minutes for both, plus breaks.</strong> If you have seen both and can spare one evening, spend it on <em>Part Two</em>. Read <em>Dune Messiah</em> afterward if you want the new film to deliver the story first. This guide discusses early scenes and premises and leaves the films' endings and the novel's plot for you to discover.</p>

    <section className="hq-release-index hq-viewing-index" aria-labelledby="choose-your-route">
      <h2 id="choose-your-route" tabIndex={-1}>How much Dune do you need?</h2>
      <table>
        <caption>Pick a route based on what you remember and what you want to discover in the theater.</caption>
        <thead><tr><th scope="col">If you are…</th><th scope="col">Make this your plan</th></tr></thead>
        <tbody>
          <tr><th scope="row">New to Villeneuve's films</th><td>Give <em>Dune</em> 2h 35m on night one, then <em>Part Two</em> 2h 46m on night two. Start with the first film if you can only fit one in tonight.</td></tr>
          <tr><th scope="row">Returning with one evening</th><td>If you remember why Paul's family went to Arrakis and what spice is worth, rewatch <em>Part Two</em> (2h 46m). It brings Paul and the Fremen back into focus.</td></tr>
          <tr><th scope="row">Keeping the story a surprise</th><td>Watch the two films at your own pace. <a href="#read-dune-messiah">Save <em>Dune Messiah</em></a> and the 2003 <em>Children of Dune</em> miniseries for after <em>Part Three</em>.</td></tr>
          <tr><th scope="row">Curious about the source first</th><td>Finish both films before starting <em>Dune Messiah</em>, or read Frank Herbert's <em>Dune</em> first for the material the two films cover. The sequel is the point where reading ahead begins.</td></tr>
        </tbody>
      </table>
    </section>
    <p>Villeneuve explains <ExternalLink href={director}>in his GQ interview (plot details)</ExternalLink> that he split Herbert's first novel across his first two films and turned to the second novel for <em>Part Three</em>. That's why the 2021 film comes first even for newcomers who only want the essentials. It gives you the terms of the conflict. The 2024 film follows the same people as those terms change.</p>

    <figure>
      <ArticleImage src={cover} alt="Original illustration of a closed book and a loop of film on a sandstone ledge above a dune" width={1200} height={675} />
      <figcaption>A book for later or a film for tonight. Original Hard Quiz illustration, made with AI.</figcaption>
    </figure>

    <h2 id="what-to-notice" tabIndex={-1}>Two scenes worth revisiting</h2>
    <h3><em>Dune</em> (2021) and the instant after a command</h3>
    <p>The Emperor assigns House Atreides to govern Arrakis, the source of the spice that makes it worth fighting over. The film introduces the politics on a grand scale. For a smaller demonstration of power, watch Paul's meeting with the Reverend Mother. When she uses the Voice, look for the brief loss of focus and the cut that brings Paul toward her. <ExternalLink href={voice}>Villeneuve's scene breakdown</ExternalLink> explains how the camera move and blink-fast edit were designed to disorient the audience. The moment goes by so quickly that your eyes have to catch up with Paul. Remember that sensation when someone later tells him what his future ought to be.</p>
    <h3><em>Dune: Part Two</em> (2024) and two ways to use rhythm</h3>
    <p>Listen to the difference between Chani's sandwalking lesson and the thumper Paul uses when learning to ride a worm. Sandwalking breaks the rhythm of an ordinary stride. The thumper supplies a regular pulse. During the worm sequence, wait for the thumper to drop out. The film's sound team <ExternalLink href={sound}>described narrowing the track to Paul's breathing and footsteps</ExternalLink> before the worm closes in. The comparison makes a long rewatch earn its time. You can hear the same bit of Fremen knowledge used first to stay unnoticed and then to draw something closer.</p>
    <p>Keep one question for the third film. <strong>Who can tell Paul what to do, and who can teach him something he needs to know?</strong> The Reverend Mother and Chani give you two very different answers to carry forward.</p>

    <h2 id="read-dune-messiah" tabIndex={-1}>Should you read <em>Dune Messiah</em> before the film?</h2>
    <p><strong>Watch first if surprise matters to you.</strong> Penguin Random House puts <em>Dune Messiah</em> second in <ExternalLink href={bookOrder}>Herbert's book series</ExternalLink>. It continues beyond the ground covered by the first two films and supplies source material for the third. The book and movie can make different choices about what to show and when, so reading ahead can give away developments without telling you exactly how the film will unfold. Skip the publisher's synopsis until you are ready.</p>
    <p><strong>Read first if you want Herbert's version in your head before you see Villeneuve's.</strong> Pay attention to how Herbert lets you sit with a character's reasoning on the page. At the cinema, look for what carries that work when a shot, a pause or another character's reaction has to do it. The current <ExternalLink href={book}>U.S. movie tie-in paperback (plot details)</ExternalLink> runs to 304 pages, about 30 pages a day over ten days. Its November 17, 2026 date is for that edition. A copy you already own will do the job.</p>

    <h2 id="optional-adaptations" tabIndex={-1}>When the other adaptations are worth your time</h2>
    <ul>
      <li><strong>For a second take on the first book, try David Lynch's <em>Dune</em> (1984).</strong> <ExternalLink href={lynch}>Universal's feature</ExternalLink> covers Paul's original story in a single film. Save it until after <em>Part Two</em> if you want Villeneuve's two-film version to unfold in order. The 2000 <em>Frank Herbert's Dune</em> miniseries is another way to compare how an adaptation allocates time to that first book.</li>
      <li><strong>For the Bene Gesserit, try <em>Dune: Prophecy</em>.</strong> <ExternalLink href={prophecy}>HBO places it roughly 10,000 years before Paul's era</ExternalLink>. Pick it if the order's beginnings are the part you want to explore. A free evening before the new film is better spent with the contemporary characters if their relationships are hazy.</li>
      <li><strong>For a look at the later books, bookmark <em>Frank Herbert's Children of Dune</em> (2003).</strong> <ExternalLink href={miniseries}>Syfy's account (plot details)</ExternalLink> explains that it combines books two and three. The similar miniseries titles are easy to mistake for interchangeable versions. Choose the 2000 series for book one and leave the 2003 series for after the film if you are protecting the surprises.</li>
    </ul>

    <h2 id="us-viewing-and-release" tabIndex={-1}>Where to watch the first two and when to book the third</h2>
    <p>As of <time dateTime={checkedOn}>November 25, 2026</time>, JustWatch U.S. listed <ExternalLink href={watchDune}><em>Dune</em> (2021)</ExternalLink> and <ExternalLink href={watchPartTwo}><em>Part Two</em></ExternalLink> on HBO Max and for digital rental or purchase. Use the links to check your subscription or rental options before planning the evening. Our running times are from the U.S. Apple TV listings for <ExternalLink href={appleDune}><em>Dune</em></ExternalLink> and <ExternalLink href={applePartTwo}><em>Part Two</em></ExternalLink>.</p>
    <p><em>Dune: Part Three</em> opens in U.S. theaters and IMAX on <time dateTime="2026-12-18">December 18, 2026</time>, with select Dune Insider screenings on <time dateTime="2026-12-14">December 14</time> and <time dateTime="2026-12-15">15</time>. The studio date and <ExternalLink href={imax}>IMAX's 70mm venue list (plot details)</ExternalLink> were checked on <time dateTime={checkedOn}>November 25</time>. For the format and date at a particular cinema, check the actual showtime. See our <Link to="/blog/december-2026-movie-releases#dune-part-three">December U.S. release calendar</Link> for the wider holiday schedule.</p>
  </>,
};

export default post;
