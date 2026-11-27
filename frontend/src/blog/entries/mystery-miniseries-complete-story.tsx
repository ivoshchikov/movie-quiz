import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import ArticleImage from "../components/ArticleImage";
import ExternalLink from "../components/ExternalLink";
import type { BlogPost } from "../types";

const checkedOn = "2026-11-27";
const cover = "/blog-assets/mystery-miniseries.webp";

const evidence = {
  evansChristie: "https://www.agathachristie.com/en/film-and-tv/why-didnt-they-ask-evans",
  evansUS: "https://www.justwatch.com/us/tv-show/why-didnt-they-ask-evans",
  evansEpisodes: "https://www.primevideo.com/detail/0QK02MVN4R645CMA3W124ZSXJ2",
  evansBritBox: "https://www.britbox.com/us/season/Why_Didnt_They_Ask_Evans_S1_10102737",
  noneChristie: "https://www.agathachristie.com/en/film-and-tv/and-then-there-were-none",
  noneApple: "https://tv.apple.com/us/show/and-then-there-were-none/umc.cmc.35st7hw3g5zbu6rkv1k0pbjl9",
  noneAcorn: "https://acorn.tv/andthennone/",
  murderFX: "https://www.fxnetworks.com/shows/a-murder-at-the-end-of-the-world",
  murderUS: "https://www.justwatch.com/us/tv-show/a-murder-at-the-end-of-the-world",
  murderEpisodes: "https://www.tvmaze.com/shows/56855/a-murder-at-the-end-of-the-world/episodeguide",
  murderCreators: "https://www.latimes.com/entertainment-arts/tv/story/2023-11-14/murder-at-the-end-of-the-world-creators-darby-hart",
  sharpHBO: "https://www.hbomaxlapress.com/programming/mini-series/262",
  sharpEpisodes: "https://thetvdb.com/series/sharp-objects/seasons/official/1",
  sharpEditors: "https://www.provideocoalition.com/aotc-sharp-objects/",
  sharpWatch: "https://www.justwatch.com/us/tv-show/sharp-objects",
  undoingHBO: "https://www.hbomax.com/show/32b441d9-77ef-4362-ad18-b1635eb8558d",
  undoingApple: "https://tv.apple.com/us/show/the-undoing/umc.cmc.75hq8eetbbl6sza2jkprggikj",
  undoingBier: "https://www.elle.com/culture/movies-tv/a34814420/susanne-bier-the-undoing-interview/",
  undoingWatch: "https://www.justwatch.com/us/tv-show/the-undoing",
  eyesNetflix: "https://www.netflix.com/title/80244630",
  dearNetflix: "https://www.netflix.com/title/81513233",
  dearTudum: "https://www.netflix.com/tudum/articles/dear-child-release-date-news",
  breakthroughNetflix: "https://www.netflix.com/title/81566970",
  breakthroughTudum: "https://www.netflix.com/tudum/articles/the-breakthrough-release-date-news",
  birdApple: "https://tv.apple.com/us/show/black-bird/umc.cmc.30gx1y8nwthydkrvhqu156p3",
  birdPress: "https://www.apple.com/tv-pr/originals/black-bird/",
  unbelievableNetflix: "https://www.netflix.com/title/80153467",
  unbelievableGrant: "https://www.harpersbazaar.com/culture/film-tv/a29093906/unbelievable-netflix-susannah-grant-interview/",
};

type Pick = {
  id: string;
  title: string;
  year: number;
  minutes: number[];
  bestFor: string;
  service: string;
  watch: string;
  note: ReactNode;
};

type Section = { id: string; title: string; intro: string; picks: Pick[] };

// Timings are whole-minute episode listings for the editions linked in Sources.
const sections: Section[] = [
  {
    id: "play-along", title: "When you want to name a suspect",
    intro: "Start here if your favorite part is pausing to compare theories. Two versions of Christie can fit the same evening and leave the room in very different moods.",
    picks: [
      {
        id: "why-didnt-they-ask-evans", title: "Why Didn't They Ask Evans?", year: 2022,
        minutes: [58, 58, 58], bestFor: "A clue hunt with company", service: "BritBox", watch: evidence.evansUS,
        note: <>
          <p>A dying man leaves Bobby Jones a question with somebody else's name in it. A photograph and a conversation with his friend Frankie turn the question into a trail they can follow. <ExternalLink href={evidence.evansChristie}>Agatha Christie's estate describes the setup and Hugh Laurie's adaptation</ExternalLink>.</p>
          <p>This is the Christie we would put on with somebody who likes to trade guesses aloud. Bobby has a clue and Frankie gives him someone to argue it over with. Follow the little shifts in their theories as the two amateurs meet people who already know the social rules of the rooms they enter. You get a full answer to the opening question and room for a laugh along the way.</p>
        </>,
      },
      {
        id: "and-then-there-were-none", title: "And Then There Were None", year: 2015,
        minutes: [56, 56, 57], bestFor: "An isolated suspect circle", service: "Acorn TV", watch: evidence.noneAcorn,
        note: <>
          <p>Ten invitees arrive at a house on an island. Their host is absent, and a rhyme makes a sinister schedule out of their stay. Pick Sarah Phelps's 2015 adaptation if you want to see what happens when each person you might ask for help is also someone you have to suspect. The house gives suspicion nowhere to go except around the table.</p>
          <p>Choose it over <em>Evans</em> for dread. The three-part version takes almost the same time and goes to a much colder place. <ExternalLink href={evidence.noneChristie}>The Christie estate confirms this adaptation uses the novel's original ending</ExternalLink>. The answer arrives in this run, even if your preferred theory takes a beating.</p>
        </>,
      },
      {
        id: "a-murder-at-the-end-of-the-world", title: "A Murder at the End of the World", year: 2023,
        minutes: [71, 63, 65, 56, 75, 47, 41], bestFor: "A remote retreat with two timelines", service: "Hulu", watch: evidence.murderUS,
        note: <>
          <p>Darby Hart can hold a crowd at a bookstore reading, yet she has to earn the attention of people at a tech billionaire's retreat where a guest dies. <ExternalLink href={evidence.murderCreators}>Creators Brit Marling and Zal Batmanglij describe the two timelines</ExternalLink> that follow Darby as she learns to investigate and as she puts that knowledge to work. Watch how her authority changes from room to room.</p>
          <p>This is the longer choice for a Christie reader who wants a modern closed circle. The gathering gives you suspects you can keep track of, while the jumps in time ask for your full attention. The retreat case reaches an explanation in the seventh episode.</p>
        </>,
      },
    ],
  },
  {
    id: "look-closer", title: "When the answer changes how you see someone",
    intro: "These cases turn on the distance between knowing someone and having a good explanation for what they do. Each central plot reaches its answer. Some answers leave a longer aftertaste than others.",
    picks: [
      {
        id: "the-undoing", title: "The Undoing", year: 2020,
        minutes: [54, 51, 54, 50, 60, 67], bestFor: "A courtroom and a marriage", service: "HBO Max", watch: evidence.undoingWatch,
        note: <>
          <p>At a school fundraiser, Grace Fraser already knows the people and the rules of the room. A murder makes that familiarity a poor guide to what anyone is capable of. Director Susanne Bier <ExternalLink href={evidence.undoingBier}>describes how the series mixes what Grace imagines with what she knows (plot details)</ExternalLink>. When an image seems to settle a suspicion, ask whether Grace was there to see it.</p>
          <p>Choose this one if you want the investigation to press on a marriage and move into a courtroom. <em>Sharp Objects</em> asks you to spend longer inside the rhythms of a town and a family.</p>
        </>,
      },
      {
        id: "sharp-objects", title: "Sharp Objects", year: 2018,
        minutes: [62, 55, 52, 49, 52, 53, 53, 49], bestFor: "A slow return to a hometown", service: "HBO Max", watch: evidence.sharpWatch,
        note: <>
          <p>Reporter Camille Preaker returns to Wind Gap to cover the case of two girls. On the drive, watch a red truck give way to a brief image of a red caboose. <ExternalLink href={evidence.sharpEditors}>Director Jean-Marc Vallée and his editors discuss the cut</ExternalLink>. The town starts coming back to Camille before she reaches it. Where <em>The Undoing</em> makes you question what Grace is picturing, the short intrusions here let you feel how little distance Camille has from the story she is supposed to report.</p>
          <p>This is the pick for an evening when you have patience for silence, memory and family history. It deals with abuse and self-harm. The central case comes to a definite conclusion. <strong>Stay through the credits of the last episode.</strong></p>
        </>,
      },
      {
        id: "dear-child", title: "Dear Child", year: 2023,
        minutes: [45, 47, 50, 50, 48, 46], bestFor: "A missing-person case reopened", service: "Netflix", watch: evidence.dearNetflix,
        note: <>
          <p>A woman escapes captivity and lands in a hospital. A girl who accompanies her offers details that sound ordinary to her and alarming to the adults in the room. <ExternalLink href={evidence.dearTudum}>Netflix's introduction</ExternalLink> connects the escape to a disappearance thirteen years earlier. Those first conversations are a reason to choose this over a detective-led mystery. You are listening to people whose idea of ordinary life has been shaped by confinement.</p>
          <p>The six-episode German series gives the disappearance and the captivity a shared explanation and makes room for the people left with the consequences. Pick it for a direct, unsettling story about survival. It features kidnapping and children in distress.</p>
        </>,
      },
      {
        id: "behind-her-eyes", title: "Behind Her Eyes", year: 2021,
        minutes: [50, 50, 50, 53, 46, 50], bestFor: "An ending that reorders the clues", service: "Netflix", watch: evidence.eyesNetflix,
        note: <>
          <p>Louise starts an affair with her boss and a friendship with his wife. Each relationship gives her a partial account of the same household. When a dream journal enters the story, give it the same attention you give to the conversations. <ExternalLink href={evidence.eyesNetflix}>Netflix's episode list</ExternalLink> identifies it as a source of questions for Louise.</p>
          <p>This is the pick if you enjoy a last episode that sends you back through earlier scenes in your head. Its explanation takes a speculative turn. If you prefer a mystery that stays within the rules of an ordinary criminal investigation, choose <em>Dear Child</em>.</p>
        </>,
      },
    ],
  },
  {
    id: "real-investigations", title: "When you want to see how a real case moves",
    intro: "One investigation needs a new technique, one needs a conversation a detective could never have, and one needs two detectives to compare cases. All three dramatize real events.",
    picks: [
      {
        id: "the-breakthrough", title: "The Breakthrough", year: 2025,
        minutes: [40, 35, 40, 42], bestFor: "A cold case and the shortest run", service: "Netflix", watch: evidence.breakthroughNetflix,
        note: <>
          <p>After a double murder in Linköping, a detective makes the families a promise. The Swedish drama follows the years between that promise and the collaboration with a genealogist that moves the case forward. <ExternalLink href={evidence.breakthroughTudum}>Writer Oskar Söderlund says the relatives waiting for answers mattered to him as much as the new technique</ExternalLink>.</p>
          <p>Pick it if you want the shortest total on this list and the feeling of work continuing long after the attention has moved elsewhere. Four episodes make the passage of time part of the case. The first pair lasts 75 minutes and the second pair 82 minutes.</p>
        </>,
      },
      {
        id: "black-bird", title: "Black Bird", year: 2022,
        minutes: [58, 60, 59, 60, 54, 61], bestFor: "The tension of a conversation", service: "Apple TV", watch: evidence.birdApple,
        note: <>
          <p>Jimmy Keene can shorten his prison sentence if he gets a suspected killer to talk. <ExternalLink href={evidence.birdPress}>Apple's series notes</ExternalLink> spell out the bargain early. Watch the work Jimmy has to do to keep a conversation going when a direct question could end it. In <em>The Breakthrough</em>, investigators need a new way to look. Here somebody needs a reason to keep talking.</p>
          <p>The finale resolves the assignment the series sets up. It deals with real violence, and the limits of what was established are part of the story. Expect a quieter kind of pressure than an all-suspects-in-a-room reveal.</p>
        </>,
      },
      {
        id: "unbelievable", title: "Unbelievable", year: 2019,
        minutes: [58, 46, 51, 44, 43, 45, 53, 45], bestFor: "Two investigations and the cost of disbelief", service: "Netflix", watch: evidence.unbelievableNetflix,
        note: <>
          <p>The first episode follows Marie through repeated questions about a sexual assault. The second introduces a detective in another state approaching a similar report. <ExternalLink href={evidence.unbelievableGrant}>Showrunner Susannah Grant describes designing those first two episodes to work together (plot details)</ExternalLink>. Set aside 104 minutes for the pair if you can. Notice which parts of an account an interviewer gives someone room to describe and which parts get pressed into a predetermined shape.</p>
          <p>This is the heaviest recommendation here for a group watch. The series gives the investigation an outcome and follows what that outcome means for Marie. It depicts sexual assault and its aftermath, and the first episode asks a lot of the viewer.</p>
        </>,
      },
    ],
  },
];

const picks = sections.flatMap(section => section.picks);
const totalMinutes = (pick: Pick) => pick.minutes.reduce((total, minutes) => total + minutes, 0);

function viewingTime(pick: Pick) {
  const minutes = totalMinutes(pick);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const sources = [
  { label: "Agatha Christie | Why Didn't They Ask Evans? adaptation and premise", url: evidence.evansChristie },
  { label: "BritBox US | Why Didn't They Ask Evans? three-part edition", url: evidence.evansBritBox },
  { label: "Prime Video | BritBox edition of Why Didn't They Ask Evans? episode lengths", url: evidence.evansEpisodes },
  { label: "JustWatch US | Why Didn't They Ask Evans? streaming options", url: evidence.evansUS },
  { label: "Agatha Christie | And Then There Were None and its adaptation ending", url: evidence.noneChristie },
  { label: "Apple TV US | And Then There Were None three-part episode lengths", url: evidence.noneApple },
  { label: "Acorn TV | And Then There Were None viewing page", url: evidence.noneAcorn },
  { label: "FX | A Murder at the End of the World episodes (plot details)", url: evidence.murderFX },
  { label: "JustWatch US | A Murder at the End of the World Hulu listing", url: evidence.murderUS },
  { label: "TVmaze | A Murder at the End of the World episode lengths (plot details)", url: evidence.murderEpisodes },
  { label: "Los Angeles Times | A Murder at the End of the World creators on Darby Hart", url: evidence.murderCreators },
  { label: "HBO press | Sharp Objects premise and eight episodes", url: evidence.sharpHBO },
  { label: "TheTVDB | Sharp Objects episode lengths", url: evidence.sharpEpisodes },
  { label: "ProVideo Coalition | Sharp Objects director and editors on the cuts", url: evidence.sharpEditors },
  { label: "JustWatch US | Sharp Objects viewing options", url: evidence.sharpWatch },
  { label: "HBO Max | The Undoing episodes and premise", url: evidence.undoingHBO },
  { label: "Apple TV US | The Undoing episode lengths", url: evidence.undoingApple },
  { label: "Elle | Susanne Bier on The Undoing (plot details)", url: evidence.undoingBier },
  { label: "JustWatch US | The Undoing viewing options", url: evidence.undoingWatch },
  { label: "Netflix | Behind Her Eyes viewing page and episode lengths", url: evidence.eyesNetflix },
  { label: "Netflix | Dear Child viewing page and episode lengths", url: evidence.dearNetflix },
  { label: "Netflix Tudum | Dear Child premise and completion", url: evidence.dearTudum },
  { label: "Netflix | The Breakthrough viewing page and episode lengths", url: evidence.breakthroughNetflix },
  { label: "Netflix Tudum | The Breakthrough and writer Oskar Söderlund", url: evidence.breakthroughTudum },
  { label: "Apple TV US | Black Bird episode lengths and series finale", url: evidence.birdApple },
  { label: "Apple TV Press | Black Bird premise and source memoir", url: evidence.birdPress },
  { label: "Netflix | Unbelievable viewing page and episode lengths", url: evidence.unbelievableNetflix },
  { label: "Harper's Bazaar | Susannah Grant on Unbelievable (plot details)", url: evidence.unbelievableGrant },
];

const post: BlogPost = {
  slug: "mystery-miniseries-complete-story",
  title: "10 Mystery Miniseries with a Complete Story",
  excerpt: "Find a mystery miniseries that answers its central question. Compare ten finished cases by the kind of mystery, total viewing time and U.S. streaming options.",
  date: "2026-11-27",
  tags: ["Streaming & New Releases", "Thriller", "Drama"],
  coverUrl: `https://hard-quiz.com${cover}`,
  listingCoverUrl: "https://hard-quiz.com/blog-assets/mystery-miniseries-640.webp",
  socialImagePath: cover,
  contents: [
    { id: "compare-the-cases", label: "Compare the ten cases by viewing time" },
    ...sections.map(section => ({ id: section.id, label: section.title })),
    { id: "how-we-checked", label: "How we checked completion and viewing time" },
    { id: "sources", label: "Sources" },
  ],
  sources,
  content: () => <>
    <p>A dying man's last question can give you a puzzle to share. A detective's promise to a grieving family can give you a case you want to see through for a very different reason. Both stories can end in a few episodes. The better choice for tonight depends on what you want the answer to do.</p>
    <p><strong>For a three-part whodunit to watch with a friend, start with <em>Why Didn't They Ask Evans?</em></strong> Choose <em>And Then There Were None</em> for the darker version of a Christie evening, or <em>The Breakthrough</em> for a short real-case drama. Every pick below completes its central investigation or story in the episodes listed. The guide keeps the answers off the page.</p>

    <section className="hq-release-index" aria-labelledby="compare-the-cases">
      <h2 id="compare-the-cases" tabIndex={-1}>Compare the ten cases by viewing time</h2>
      <table>
        <caption>Shortest to longest. Times are the sum of the listed episode lengths.</caption>
        <thead><tr><th scope="col">Miniseries</th><th scope="col">Episodes and time</th><th scope="col">Pick it for</th></tr></thead>
        <tbody>{[...picks].sort((a, b) => totalMinutes(a) - totalMinutes(b)).map(pick => (
          <tr key={pick.id}>
            <th scope="row"><a href={`#${pick.id}`}>{pick.title}</a></th>
            <td>{pick.minutes.length} episodes<br />{viewingTime(pick)}</td>
            <td>{pick.bestFor}</td>
          </tr>
        ))}</tbody>
      </table>
    </section>

    <figure>
      <ArticleImage src={cover} alt="Original illustration of closed archival folders and contact sheets on a desk" width={1200} height={675} />
      <figcaption>Three case files for three kinds of mystery. Original Hard Quiz illustration, made with AI.</figcaption>
    </figure>

    {sections.map(section => <section key={section.id} aria-labelledby={section.id}>
      <h2 id={section.id} tabIndex={-1}>{section.title}</h2>
      <p>{section.intro}</p>
      {section.picks.map(pick => <section key={pick.id} aria-labelledby={pick.id}>
        <h3 id={pick.id} tabIndex={-1}>{pick.title}</h3>
        <p className="hq-watchlist-facts"><strong>{pick.year}</strong> · {pick.minutes.length} episodes · {viewingTime(pick)} · <ExternalLink href={pick.watch}>{pick.service}: U.S. viewing</ExternalLink></p>
        {pick.note}
      </section>)}
    </section>)}

    <h2 id="how-we-checked" tabIndex={-1}>How we checked completion and viewing time</h2>
    <p>We compared released episode lists with coverage of the endings to check that the full run is out and brings the central question to a resolution. A fictional culprit, the outcome of a real investigation and the consequences for a family are different kinds of answers. We kept the details of those answers out of the recommendations. Where a source includes plot details, the link flags them.</p>
    <p>U.S. viewing routes were checked on <time dateTime={checkedOn}>November 27, 2026</time>. Times use the published whole-minute listings, with no added time for breaks or advertising. A player may show slightly different lengths, including for <em>Sharp Objects</em>. These are catalog checks and the guide was prepared with AI assistance. For both Christie adaptations, use the named three-part version. Check your service's episode list before relying on the timing if it offers a different cut.</p>
    <p>For more genres, see our <Link to="/blog/completed-miniseries-to-watch">completed miniseries for a weekend</Link>. If you want the suspects introduced and the case closed in a single film, try our <Link to="/blog/movies-like-knives-out">guide to movies like <em>Knives Out</em></Link>.</p>
  </>,
};

export default post;
