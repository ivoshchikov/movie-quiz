import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import filmContent from "../components/filmContent";
import ExternalLink from "../components/ExternalLink";

const coverPath = "/blog-assets/best-horror-movies-2026-cover.webp";

const official = {
  residentEvil: "https://www.sonypictures.com/movies/residentevil8",
  obsession: "https://www.focusfeatures.com/obsession",
  hokum: "https://www.neonrated.com/film/hokum",
  sendHelp: "https://www.20thcenturystudios.com/movies/send-help",
  backrooms: "https://a24films.com/films/backrooms",
  boneTemple: "https://www.sonypictures.com/movies/28yearslaterthebonetemple",
  primate: "https://paramountglobalcontent.com/title/primate",
  obsessionPeacock: "https://www.peacocktv.com/stream-movies/obsession",
  obsessionStreaming: "https://www.peacocktv.com/blog/when-is-obsession-streaming-on-peacock",
  hokumHulu: "https://www.hulu.com/movie/hokum-0e6c86c5-34e4-485a-8be9-71bf90d044b3",
  primateStreaming: "https://www.paramountplus.com/sneak-peak/where-to-watch-primate-2026/",
};

const picks = [
  {
    id: "resident-evil", title: "Resident Evil (2026)", mood: "Action and survival horror", preparation: "New story; start here",
    viewing: <>In theaters. <ExternalLink href={official.residentEvil}>Sony's 2026 film page</ExternalLink></>,
  },
  {
    id: "obsession", title: "Obsession", mood: "A wish with a terrible price", preparation: "None",
    viewing: <>Peacock lists it for subscription streaming. <ExternalLink href={official.obsessionPeacock}>Peacock's US listing</ExternalLink><ExternalLink href={official.obsession}>Focus home-viewing options</ExternalLink></>,
  },
  {
    id: "hokum", title: "Hokum", mood: "Haunted rooms and folk tales", preparation: "None",
    viewing: <>Hulu subscription. <ExternalLink href={official.hokumHulu}>Watch Hokum on Hulu</ExternalLink></>,
  },
  {
    id: "send-help", title: "Send Help", mood: "Survival with dark comedy", preparation: "None",
    viewing: <>Hulu subscription or digital purchase. <ExternalLink href={official.sendHelp}>20th Century viewing options</ExternalLink></>,
  },
  {
    id: "backrooms", title: "Backrooms", mood: "Uncanny spaces and disorientation", preparation: "No online lore required",
    viewing: <>Digital rental or purchase, including the A24 App. <ExternalLink href={official.backrooms}>A24 home-viewing options</ExternalLink></>,
  },
  {
    id: "the-bone-temple", title: "28 Years Later: The Bone Temple", mood: "Infection, cults and human cruelty", preparation: "Watch 28 Years Later first",
    viewing: <>Digital purchase, 4K UHD or Blu-ray. <ExternalLink href={official.boneTemple}>Sony home-viewing options</ExternalLink></>,
  },
  {
    id: "primate", title: "Primate", mood: "A contained creature feature", preparation: "None",
    viewing: <>Paramount+ subscription. <ExternalLink href={official.primateStreaming}>Paramount+ viewing guide</ExternalLink></>,
  },
];

const post: BlogPost = {
  slug: "best-horror-movies-2026",
  title: "Best Horror Movies of 2026 So Far: A Spoiler-Free Watchlist",
  seoTitle: "Best Horror Movies of 2026 So Far",
  excerpt: "Seven 2026 horror films compared by where the fear begins: a room, a relationship, a pursuit or a community. Spoiler-free choices and dated US viewing notes.",
  date: "2026-10-12",
  modified: "2026-11-21",
  tags: ["Streaming & New Releases", "Horror", "Thriller", "2020s"],
  coverUrl: "https://hard-quiz.com" + coverPath,
  listingCoverUrl: "https://hard-quiz.com" + coverPath,
  socialImagePath: "/blog-assets/best-horror-movies-2026-social.webp",
  contents: [
    { id: "quick-picks", label: "Choose a film by mood" },
    { id: "where-to-watch", label: "Where to watch in the US" },
    ...picks.map(({ id, title }) => ({ id, label: title })),
    { id: "where-fear-starts", label: "Decide where the fear should begin" },
    { id: "how-we-chose", label: "How we chose the films" },
    { id: "watchlist-questions", label: "Viewing questions" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "Sony Pictures — Resident Evil (2026): release, credits and premise", url: official.residentEvil },
    { label: "Focus Features — Obsession: US release, credits and premise", url: official.obsession },
    { label: "NEON — Hokum: filmmaker, cast and premise", url: official.hokum },
    { label: "20th Century Studios — Send Help: US release and credits", url: official.sendHelp },
    { label: "A24 — Backrooms: credits and official viewing links", url: official.backrooms },
    { label: "Sony Pictures — 28 Years Later: The Bone Temple", url: official.boneTemple },
    { label: "Sony Pictures — The Bone Temple: official continuity FAQs", url: "https://www.sonypictures.com/movies/28yearslaterthebonetemple/official-faqs" },
    { label: "Paramount Global Content — Primate: US release and cast", url: official.primate },
    { label: "Paramount Press Express — Primate: production credits", url: "https://www.paramountpressexpress.com/paramount-plus/shows/primate/releases/?view=112558-things-are-about-to-get-wild-when-primate-streams-on-paramount-march-25" },
    { label: "Peacock — Obsession: US streaming listing", url: official.obsessionPeacock },
    { label: "Peacock — Obsession: July 17, 2026 streaming announcement", url: official.obsessionStreaming },
    { label: "Hulu — Hokum: US subscription listing", url: official.hokumHulu },
    { label: "Paramount+ — Primate: subscription viewing guide", url: official.primateStreaming },
    { label: "RogerEbert.com — Katie Rife's Obsession review", url: "https://www.rogerebert.com/reviews/obsession-curry-barker-movie-review-2026" },
    { label: "RogerEbert.com — Brian Tallerico's Hokum review and US opening date", url: "https://www.rogerebert.com/reviews/hokum-adam-scott-film-review-2026" },
    { label: "RogerEbert.com — Brian Tallerico's Backrooms review", url: "https://www.rogerebert.com/reviews/backrooms-chiwetel-ejiofor-renate-reinsve-a24-film-review-2026" },
    { label: "Rotten Tomatoes — 2026 horror guide and critical reception", url: "https://editorial.rottentomatoes.com/guide/best-new-horror-movies-2026/" },
    { label: "Rotten Tomatoes — Resident Evil (2026): content advisory", url: "https://www.rottentomatoes.com/m/resident_evil_2026" },
    { label: "Rotten Tomatoes — Backrooms: US release and content advisory", url: "https://www.rottentomatoes.com/m/backrooms" },
    { label: "Rotten Tomatoes — The Bone Temple: US release and content advisory", url: "https://www.rottentomatoes.com/m/28_years_later_the_bone_temple" },
    { label: "Rotten Tomatoes — Primate: content advisory and review roundup", url: "https://www.rottentomatoes.com/m/primate_2025" },
  ],
  content: () => <>
    <p>Some horror gives you something to run from. Other horror makes you reconsider the room, the person beside you or the wish you were pleased to have granted. Those are different contracts with an audience. We chose these seven 2026 films by the point where ordinary life becomes unsafe, then asked which kind of evening each contract suits.</p>
    <p><strong>Our ghost-story choice is <a href="#hokum">Hokum</a>; our action-first invitation is <a href="#resident-evil">Resident Evil</a>.</strong> Choose <a href="#send-help">Send Help</a> for hostile company and dark comedy, or <a href="#obsession">Obsession</a> when the disturbing part is somebody getting what he wants. The selection covers US theatrical releases through October 12. The <a href="#where-to-watch">viewing table</a> records an October 24 catalog check; confirm current offers through its links. The notes stay with the advertised setups.</p>

    <figure>
      <ArticleImage src={coverPath} alt="Original illustration of a red-lit doorway, a long shadow and a crescent moon, with the words Horror 2026" width={1200} height={675} priority />
      <figcaption>Original Hard Quiz illustration. It does not depict a scene from any of the films.</figcaption>
    </figure>

    <section className="hq-release-index" aria-labelledby="quick-picks">
      <h2 id="quick-picks" tabIndex={-1}>The quick picks: choose your kind of horror</h2>
      <table>
        <caption>Seven recommendations by mood. The order is not a numerical ranking.</caption>
        <thead><tr><th scope="col">Film</th><th scope="col">Pick it for</th><th scope="col">Before you watch</th></tr></thead>
        <tbody>{picks.map(pick => <tr key={pick.id}><th scope="row"><a href={`#${pick.id}`}>{pick.title}</a></th><td>{pick.mood}</td><td>{pick.preparation}</td></tr>)}</tbody>
      </table>
    </section>

    <section className="hq-release-index hq-viewing-index" aria-labelledby="where-to-watch">
      <h2 id="where-to-watch" tabIndex={-1}>Where to watch these horror movies in the US</h2>
      <p>For a subscription movie night, start with <em>Hokum</em> or <em>Send Help</em> on Hulu, or <em>Primate</em> on Paramount+. Peacock also lists <em>Obsession</em> for streaming. <em>Backrooms</em> has digital rental and purchase options; Sony lists <em>The Bone Temple</em> on digital and disc and the new <em>Resident Evil</em> in theaters.</p>
      <table>
        <caption>US viewing options checked October 24, 2026</caption>
        <thead><tr><th scope="col">Film</th><th scope="col">US viewing option</th></tr></thead>
        <tbody>{picks.map(pick => <tr key={pick.id}><th scope="row"><a href={`#${pick.id}`}>{pick.title}</a></th><td>{pick.viewing}</td></tr>)}</tbody>
      </table>
      <p>Subscription streaming, a digital rental and a digital purchase are different offers. Check the linked US listing and your plan before paying; catalogs, retailer offers and local showtimes can change. These are selected viewing routes, and availability outside the US can differ.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="resident-evil">
      <h2 id="resident-evil" tabIndex={-1}>Resident Evil (2026): for survival-horror momentum</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Zach Cregger · <strong>Lead:</strong> Austin Abrams · <strong>US theatrical release:</strong> September 18, 2026</p>
      {filmContent("horror-2026-resident-evil", <>
        <p>A medical courier named Bryan gets caught in a night that becomes a struggle to stay alive. That is the starting point of Cregger's new <em>Resident Evil</em>, rather than another chapter following Alice from the earlier films. Sony describes it as an original story within a reinvented franchise.</p>
        <p>Bryan's job supplies a useful starting contrast: a courier is supposed to get somewhere, while a survival nightmare makes every stretch of the journey a problem. That is our reason to choose this iteration rather than the franchise name alone. Put it near <em>Primate</em> when deciding how direct you want the danger to be. This is the action-and-escalation route, with an original protagonist and no need to reconstruct Alice's film history.</p>
        <p><strong>Choose something else if:</strong> you want a quiet ghost story or little graphic violence. The US rating cites bloody violence and gore. <ExternalLink href={official.residentEvil}>Sony's official film page</ExternalLink> has the correct 2026 version, release details and viewing information.</p>
      </>)}
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="obsession">
      <h2 id="obsession" tabIndex={-1}>Obsession: for a wish that should never come true</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Curry Barker · <strong>Leads:</strong> Michael Johnston, Inde Navarrette · <strong>US theatrical release:</strong> May 15, 2026</p>
      {filmContent("horror-2026-obsession", <>
        <p>A young man uses a mysterious wish-granting object to make his crush return his feelings. The wish works, but its consequences turn a romantic fantasy into something sinister. That premise is enough to go in with; the less you know about what happens next, the better.</p>
        <p>The wish is the revealing detail: somebody wants affection without leaving the other person a choice. The supernatural premise makes that ordinary entitlement impossible to overlook. We include it for viewers who want a desire examined as closely as a threat. Katie Rife's <ExternalLink href="https://www.rogerebert.com/reviews/obsession-curry-barker-movie-review-2026">review</ExternalLink> also questions how much perspective the film gives Navarrette's character. Keep that criticism beside the premise; a film can expose control while still inviting questions about whose experience it shows.</p>
        <p><strong>Choose something else if:</strong> coercive relationships and loss of autonomy are subjects you would rather avoid. The <ExternalLink href={official.obsession}>Focus Features page</ExternalLink> confirms the release and credits. Some databases label the film 2025 because it played festivals before its 2026 US theatrical run.</p>
      </>)}
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="hokum">
      <h2 id="hokum" tabIndex={-1}>Hokum: for haunted rooms and Irish folklore</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Damian McCarthy · <strong>Lead:</strong> Adam Scott · <strong>US theatrical release:</strong> May 1, 2026</p>
      {filmContent("horror-2026-hokum", <>
        <p>Novelist Ohm Bauman visits a remote inn to scatter his parents' ashes. Stories of a witch haunting the honeymoon suite begin to intrude on his stay. The setting is familiar in the best way: a guest, a room and a local warning he cannot comfortably dismiss.</p>
        <p>A warning about a particular room changes the map of an inn. A corridor now has a destination you would rather avoid, and the guest has brought grief of his own into the building. That combination earns <em>Hokum</em> our ghost-story recommendation. Brian Tallerico's <ExternalLink href="https://www.rogerebert.com/reviews/hokum-adam-scott-film-review-2026">review</ExternalLink> discusses its attention to character alongside the scares. Choose it over <em>Backrooms</em> when you want a haunted place with a troubled visitor and a local history, rather than disorientation as the central invitation.</p>
        <p><strong>Choose something else if:</strong> you are in the mood for an action horror film rather than a story built around an ominous place. <em>Hokum</em> is a standalone film; there is no franchise homework. <ExternalLink href={official.hokum}>NEON's page</ExternalLink> provides the official premise and viewing options.</p>
      </>)}
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="send-help">
      <h2 id="send-help" tabIndex={-1}>Send Help: for dark comedy and a survival power struggle</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Sam Raimi · <strong>Leads:</strong> Rachel McAdams, Dylan O'Brien · <strong>US theatrical release:</strong> January 30, 2026</p>
      {filmContent("horror-2026-send-help", <>
        <p>Two colleagues survive a plane crash and become stranded on an island. Their working relationship comes with them, even though the rules that governed it have become useless. Getting food and shelter is one problem; deciding who holds power is another.</p>
        <p>The island removes an office while leaving its hierarchy in the survivors' heads. That is the detail worth choosing this for: a title or a salary can keep meaning something to a person after it has lost its practical use. We recommend it for an audience ready to enjoy the argument as much as the survival problem. Its dark comedy makes it the social option beside the more directly physical danger of <em>Primate</em>.</p>
        <p><strong>Choose something else if:</strong> you want a grounded wilderness survival drama. The studio lists comedy, horror and thriller together, and that mixture is the reason to pick it. <ExternalLink href={official.sendHelp}>20th Century Studios</ExternalLink> confirms the release, cast and premise. There are no earlier films to catch up on.</p>
      </>)}
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="backrooms">
      <h2 id="backrooms" tabIndex={-1}>Backrooms: for places that feel wrong</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Kane Parsons · <strong>Leads:</strong> Chiwetel Ejiofor, Renate Reinsve · <strong>US theatrical release:</strong> May 29, 2026</p>
      {filmContent("horror-2026-backrooms", <>
        <p>A doorway in the basement of a furniture showroom opens onto something it should not. The film builds on the internet's Backrooms concept: ordinary-looking spaces made frightening by emptiness, repetition and the suspicion that you cannot find the way out.</p>
        <p>An ordinary corridor promises a destination. Repetition and emptiness can make you distrust that promise before a threat appears. That is our reason for including this as the spatial-horror pick. Notice how much of your unease can begin with a place and a missing explanation. Tallerico's <ExternalLink href="https://www.rogerebert.com/reviews/backrooms-chiwetel-ejiofor-renate-reinsve-a24-film-review-2026">review</ExternalLink> discusses how Ejiofor and Reinsve give the unfamiliar situation a human anchor. Choose this invitation when the setting itself is what you want to keep studying.</p>
        <p><strong>Choose something else if:</strong> your priority is a neatly explained mythology. You can start with the film without studying online lore. <ExternalLink href={official.backrooms}>A24's page</ExternalLink> has official credits and viewing links. If the use of empty space interests you, our <Link to="/blog/why-2-39-1-feels-more-cinematic">guide to aspect ratios and composition</Link> explains how framing changes what a viewer notices.</p>
      </>)}
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="the-bone-temple">
      <h2 id="the-bone-temple" tabIndex={-1}>28 Years Later: The Bone Temple: for the horror of the survivors</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Nia DaCosta · <strong>Key cast:</strong> Ralph Fiennes, Jack O'Connell, Alfie Williams · <strong>US theatrical release:</strong> January 16, 2026</p>
      {filmContent("horror-2026-the-bone-temple", <>
        <p>The Rage Virus has already remade the world. This chapter continues Spike's story while bringing Dr. Kelson and Jimmy Crystal into focus. The infected remain dangerous, but the beliefs and actions of the living are central to its threat.</p>
        <p>A doctor trying to understand the infected and a cult leader imposing an explanation make belief part of the threat. We choose this chapter for that social question: who gets to decide what a ruined world means, and what might that decision permit them to do? It gives the sequel a particular place beside the escape-driven <em>Resident Evil</em>. Bring the preceding film's context and an appetite for a harsh story; cruelty and graphic violence are substantial limits to the recommendation.</p>
        <p><strong>Before you watch:</strong> start with <em>28 Years Later</em> (2025). Sony's <ExternalLink href="https://www.sonypictures.com/movies/28yearslaterthebonetemple/official-faqs">official FAQs</ExternalLink> confirm that <em>The Bone Temple</em> continues directly after it. The earlier <em>28 Days Later</em> films provide wider context, but the 2025 film is the immediate lead-in. The <ExternalLink href={official.boneTemple}>official film page</ExternalLink> supplies credits and viewing links.</p>
      </>)}
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="primate">
      <h2 id="primate" tabIndex={-1}>Primate: for a straightforward creature-feature night</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Johannes Roberts · <strong>Key cast:</strong> Johnny Sequoyah, Jessica Alexander, Troy Kotsur · <strong>US theatrical release:</strong> January 9, 2026</p>
      {filmContent("horror-2026-primate", <>
        <p>A gathering at an isolated Hawaiian home turns dangerous when the family's pet chimpanzee contracts rabies. The vacation setting becomes a trap, and the threat is close enough to turn a familiar place into a survival problem.</p>
        <p>A contained creature feature makes the audience's first question practical: where could somebody go? Choose this when that physical problem is enough to organise the evening. It is the direct animal-attack route through the selection, with much less interest in the interpretation of a wish or a haunted room. The premise is genre fiction, and its exaggerated carnage is a reason to choose it only if that is the experience your group wants.</p>
        <p><strong>Choose something else if:</strong> gore is a deal-breaker. Its <ExternalLink href="https://www.rottentomatoes.com/m/primate_2025">US rating advisory</ExternalLink> includes strong violence and gore. <ExternalLink href={official.primate}>Paramount's listing</ExternalLink> confirms the January 2026 release; a 2025 label on a review site refers to its earlier festival debut, not a different horror film.</p>
      </>)}
    </section>

    <h2 id="where-fear-starts" tabIndex={-1}>Decide where you want the fear to begin</h2>
    <p>Compare <em>Hokum</em> and <em>Backrooms</em> if a place is the attraction. An inn with a forbidden room suggests a boundary and a history. Repeated unfamiliar spaces make the boundary itself hard to establish. Choose between investigating a troubled location and losing confidence in a location's ordinary rules.</p>
    <p>Put <em>Obsession</em> beside <em>Send Help</em> for a less comfortable comparison of relationships. A wish tries to secure another person's affection; an island tests whether an old hierarchy can survive new needs. One turns desire into a supernatural problem, while the other gives resentment a survival setting and a comic temperature. The people are a large part of the danger in both invitations.</p>
    <p>For a more direct physical threat, choose <em>Primate</em> or <em>Resident Evil</em>. Save <em>The Bone Temple</em> for when you want the preceding film's world and its human responses to catastrophe. The choice should follow the kind of fear you enjoy, with the content limits above settling any remaining disagreement.</p>

    <h2 id="how-we-chose" tabIndex={-1}>How we chose these horror films</h2>
    <p>We started with released films that had favorable critical reception, cross-checking the <ExternalLink href="https://editorial.rottentomatoes.com/guide/best-new-horror-movies-2026/">Rotten Tomatoes 2026 horror guide</ExternalLink> against individual reviews and official distributor pages. Then we chose a range of viewing experiences: supernatural unease, folk horror, dark comedy, uncanny spaces, action and creature horror. This is a selective watchlist, rather than a claim that every reader will agree on one winner.</p>
    <p>“2026” means a US theatrical release by October 12, 2026, the cutoff for this selection and its critical research. Festival dates can be earlier, and release dates elsewhere can differ. US viewing listings were checked again on October 24, 2026. Recommendations are editorial judgments based on the sources below, not claims of firsthand screenings. This article was prepared with AI assistance.</p>

    <section className="hq-article-faq" aria-labelledby="watchlist-questions">
      <h2 id="watchlist-questions" tabIndex={-1}>Questions before you build your watchlist</h2>
      <div><h3>Which 2026 horror movie should I watch first?</h3><p>For a standalone ghost-story evening, pick <em>Hokum</em>. For survival horror with comedy, choose <em>Send Help</em>. Try <em>Obsession</em> for a disturbing supernatural premise, or the new <em>Resident Evil</em> for action and horror together. Pick by the kind of tension you enjoy; a single score cannot make that decision for you.</p></div>
      <div><h3>Do I need to watch the old Resident Evil movies?</h3><p>No film-series recap is needed for this pick. Sony presents the 2026 film as an all-new story with Bryan as its protagonist. Knowing the games can add context, but this watchlist recommends it as a starting point, rather than as a continuation of the earlier Alice films.</p></div>
      <div><h3>Which picks can I stream with a subscription in the US?</h3><p>At the October 24 check, Hulu listed <em>Hokum</em> and the studio confirmed <em>Send Help</em> on Hulu. Paramount+'s viewing guide listed <em>Primate</em>, and Peacock's US listing and announcement identified <em>Obsession</em>. Use the <a href="#where-to-watch">viewing table and official links</a> to check your plan. An offer to rent or buy a film does not mean it is included in a subscription.</p></div>
      <div><h3>Is this a list of low-gore horror movies?</h3><p>No. <em>Primate</em>, <em>Resident Evil</em> and <em>The Bone Temple</em> have US rating advisories that explicitly include gore. A supernatural or psychological premise also does not guarantee mild content. If you have a specific limit, check the film's detailed content advisory before choosing it.</p></div>
    </section>

    <div className="hq-article-takeaway"><h3>Make it a movie night</h3><p>Choose one film that fits your mood, then see how much movie knowledge sticks: <Link to="/">Hard Quiz's movie and actor quizzes</Link> test recognition from images. You can also explore the <Link to="/daily">Daily Challenge</Link>, or read <Link to="/how-to-play">how the quizzes work</Link> before playing.</p></div>
  </>,
};

export default post;
