import { Link } from "react-router-dom";
import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";

const coverPath = "/blog-assets/best-horror-movies-2026-cover.webp";
const official = {
  residentEvil: "https://www.sonypictures.com/movies/residentevil8",
  obsession: "https://www.focusfeatures.com/obsession",
  hokum: "https://www.neonrated.com/film/hokum",
  sendHelp: "https://www.20thcenturystudios.com/movies/send-help",
  backrooms: "https://a24films.com/films/backrooms",
  boneTemple: "https://www.sonypictures.com/movies/28yearslaterthebonetemple",
  primate: "https://paramountglobalcontent.com/title/primate",
};

const picks = [
  { id: "resident-evil", title: "Resident Evil (2026)", mood: "Action and survival horror", preparation: "New story; start here" },
  { id: "obsession", title: "Obsession", mood: "A wish with a terrible price", preparation: "None" },
  { id: "hokum", title: "Hokum", mood: "Haunted rooms and folk tales", preparation: "None" },
  { id: "send-help", title: "Send Help", mood: "Survival with dark comedy", preparation: "None" },
  { id: "backrooms", title: "Backrooms", mood: "Uncanny spaces and disorientation", preparation: "No online lore required" },
  { id: "the-bone-temple", title: "28 Years Later: The Bone Temple", mood: "Infection, cults and human cruelty", preparation: "Watch 28 Years Later first" },
  { id: "primate", title: "Primate", mood: "A contained creature feature", preparation: "None" },
];

const post: BlogPost = {
  slug: "best-horror-movies-2026",
  title: "Best Horror Movies of 2026 So Far: A Spoiler-Free Watchlist",
  seoTitle: "Best Horror Movies of 2026 So Far",
  excerpt: "Seven horror films worth watching in 2026, from Resident Evil and Obsession to Hokum. Pick by mood, check sequel requirements, and avoid spoilers.",
  date: "2026-10-12",
  tags: ["Streaming & New Releases", "Horror", "Thriller", "2020s"],
  coverUrl: "https://hard-quiz.com" + coverPath,
  listingCoverUrl: "https://hard-quiz.com" + coverPath,
  socialImagePath: "/blog-assets/best-horror-movies-2026-social.webp",
  contents: [
    { id: "quick-picks", label: "Choose a film by mood" },
    ...picks.map(({ id, title }) => ({ id, label: title })),
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
    <p><strong>Start with <a href="#resident-evil">Resident Evil</a> for an action-driven nightmare, <a href="#hokum">Hokum</a> for haunted-house dread, or <a href="#send-help">Send Help</a> for survival horror with a vicious sense of humor.</strong> If a supernatural wish going wrong sounds more unsettling than a monster chasing you, make <a href="#obsession">Obsession</a> your first pick.</p>
    <p>This spoiler-free shortlist covers seven of the best horror movies released in the US in 2026 so far, checked on October 12. It is organized around the kind of film you want tonight, with sequel requirements and reasons to choose each one. No endings, surprise appearances or late-film revelations follow.</p>

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

    <section className="hq-watchlist-entry" aria-labelledby="resident-evil">
      <h2 id="resident-evil" tabIndex={-1}>Resident Evil (2026): for survival-horror momentum</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Zach Cregger · <strong>Lead:</strong> Austin Abrams · <strong>US theatrical release:</strong> September 18, 2026</p>
      <p>A medical courier named Bryan gets caught in a night that becomes a struggle to stay alive. That is the starting point of Cregger's new <em>Resident Evil</em>, rather than another chapter following Alice from the earlier films. Sony describes it as an original story within a reinvented franchise.</p>
      <p><strong>Why choose it:</strong> this is the recent release to put near the top of an October horror watchlist if you want action, escalating danger and some dark comic relief. Its favorable critical reception makes it a stronger starting point than choosing a familiar franchise name on recognition alone. The appeal is the experience of surviving the nightmare; you do not need a recap of the previous film series.</p>
      <p><strong>Choose something else if:</strong> you want a quiet ghost story or little graphic violence. The US rating cites bloody violence and gore. <a href={official.residentEvil}>Sony's official film page</a> has the correct 2026 version, release details and viewing information.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="obsession">
      <h2 id="obsession" tabIndex={-1}>Obsession: for a wish that should never come true</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Curry Barker · <strong>Leads:</strong> Michael Johnston, Inde Navarrette · <strong>US theatrical release:</strong> May 15, 2026</p>
      <p>A young man uses a mysterious wish-granting object to make his crush return his feelings. The wish works, but its consequences turn a romantic fantasy into something sinister. That premise is enough to go in with; the less you know about what happens next, the better.</p>
      <p><strong>Why choose it:</strong> the unsettling question is what happens when someone treats another person's affection as something he can obtain. This is a useful pick for viewers drawn to psychological discomfort and supernatural horror together. In her <a href="https://www.rogerebert.com/reviews/obsession-curry-barker-movie-review-2026">RogerEbert.com review</a>, Katie Rife singles out Navarrette's performance while also questioning how fully the film gives her character a perspective. That tension is worth keeping in mind, rather than reducing the film to a clever curse.</p>
      <p><strong>Choose something else if:</strong> coercive relationships and loss of autonomy are subjects you would rather avoid. The <a href={official.obsession}>Focus Features page</a> confirms the release and credits. Some databases label the film 2025 because it played festivals before its 2026 US theatrical run.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="hokum">
      <h2 id="hokum" tabIndex={-1}>Hokum: for haunted rooms and Irish folklore</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Damian McCarthy · <strong>Lead:</strong> Adam Scott · <strong>US theatrical release:</strong> May 1, 2026</p>
      <p>Novelist Ohm Bauman visits a remote inn to scatter his parents' ashes. Stories of a witch haunting the honeymoon suite begin to intrude on his stay. The setting is familiar in the best way: a guest, a room and a local warning he cannot comfortably dismiss.</p>
      <p><strong>Why choose it:</strong> this is our haunted-house pick for a Halloween evening. McCarthy's setup links the supernatural threat to a character carrying his own history into the building. Brian Tallerico's <a href="https://www.rogerebert.com/reviews/hokum-adam-scott-film-review-2026">review of Hokum</a> praises that serious treatment of the character alongside the scares. It gives you a clearer reason to try the film than simply looking for a haunted location.</p>
      <p><strong>Choose something else if:</strong> you are in the mood for an action horror film rather than a story built around an ominous place. <em>Hokum</em> is a standalone film; there is no franchise homework. <a href={official.hokum}>NEON's page</a> provides the official premise and viewing options.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="send-help">
      <h2 id="send-help" tabIndex={-1}>Send Help: for dark comedy and a survival power struggle</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Sam Raimi · <strong>Leads:</strong> Rachel McAdams, Dylan O'Brien · <strong>US theatrical release:</strong> January 30, 2026</p>
      <p>Two colleagues survive a plane crash and become stranded on an island. Their working relationship comes with them, even though the rules that governed it have become useless. Getting food and shelter is one problem; deciding who holds power is another.</p>
      <p><strong>Why choose it:</strong> a horror night does not have to mean two hours of solemn dread. <em>Send Help</em> pairs a survival premise with antagonistic characters and dark comedy. It is the pick here for a group that wants tension and laughs in the same film. The central question is easy to grasp without an explanation of supernatural rules: how long can two people cooperate when they already resent each other?</p>
      <p><strong>Choose something else if:</strong> you want a grounded wilderness survival drama. The studio lists comedy, horror and thriller together, and that mixture is the reason to pick it. <a href={official.sendHelp}>20th Century Studios</a> confirms the release, cast and premise. There are no earlier films to catch up on.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="backrooms">
      <h2 id="backrooms" tabIndex={-1}>Backrooms: for places that feel wrong</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Kane Parsons · <strong>Leads:</strong> Chiwetel Ejiofor, Renate Reinsve · <strong>US theatrical release:</strong> May 29, 2026</p>
      <p>A doorway in the basement of a furniture showroom opens onto something it should not. The film builds on the internet's Backrooms concept: ordinary-looking spaces made frightening by emptiness, repetition and the suspicion that you cannot find the way out.</p>
      <p><strong>Why choose it:</strong> this is the visual-atmosphere pick. If an empty corridor can unsettle you before anything appears in it, the concept has already found its audience. Brian Tallerico's <a href="https://www.rogerebert.com/reviews/backrooms-chiwetel-ejiofor-renate-reinsve-a24-film-review-2026">review</a> praises Ejiofor and Reinsve for making the situation believable. Their reactions give the unfamiliar space a human point of reference.</p>
      <p><strong>Choose something else if:</strong> your priority is a neatly explained mythology. You can start with the film without studying online lore. <a href={official.backrooms}>A24's page</a> has official credits and viewing links. If the use of empty space interests you, our <Link to="/blog/why-2-39-1-feels-more-cinematic">guide to aspect ratios and composition</Link> explains how framing changes what a viewer notices.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="the-bone-temple">
      <h2 id="the-bone-temple" tabIndex={-1}>28 Years Later: The Bone Temple: for the horror of the survivors</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Nia DaCosta · <strong>Key cast:</strong> Ralph Fiennes, Jack O'Connell, Alfie Williams · <strong>US theatrical release:</strong> January 16, 2026</p>
      <p>The Rage Virus has already remade the world. This chapter continues Spike's story while bringing Dr. Kelson and Jimmy Crystal into focus. The infected remain dangerous, but the beliefs and actions of the living are central to its threat.</p>
      <p><strong>Why choose it:</strong> this is the franchise pick for viewers who want more than an outbreak and a chase. A doctor trying to understand the infected and a cult leader imposing his own worldview offer very different responses to the same ruined society. That conflict gives the sequel a distinct reason to exist. It also makes this a poor choice for someone who wants to avoid cruelty or graphic violence.</p>
      <p><strong>Before you watch:</strong> start with <em>28 Years Later</em> (2025). Sony's <a href="https://www.sonypictures.com/movies/28yearslaterthebonetemple/official-faqs">official FAQs</a> confirm that <em>The Bone Temple</em> continues directly after it. The earlier <em>28 Days Later</em> films provide wider context, but the 2025 film is the immediate lead-in. The <a href={official.boneTemple}>official film page</a> supplies credits and viewing links.</p>
    </section>

    <section className="hq-watchlist-entry" aria-labelledby="primate">
      <h2 id="primate" tabIndex={-1}>Primate: for a straightforward creature-feature night</h2>
      <p className="hq-watchlist-facts"><strong>Director:</strong> Johannes Roberts · <strong>Key cast:</strong> Johnny Sequoyah, Jessica Alexander, Troy Kotsur · <strong>US theatrical release:</strong> January 9, 2026</p>
      <p>A gathering at an isolated Hawaiian home turns dangerous when the family's pet chimpanzee contracts rabies. The vacation setting becomes a trap, and the threat is close enough to turn a familiar place into a survival problem.</p>
      <p><strong>Why choose it:</strong> sometimes the right horror film is the one with the clearest setup. <em>Primate</em> is the option here for a contained creature feature rather than a curse, a puzzle or a long-running story. Favorable reviews point to its effectiveness as a chiller, although the appeal depends on your appetite for exaggerated carnage. Treat its animal-attack premise as genre fiction.</p>
      <p><strong>Choose something else if:</strong> gore is a deal-breaker. Its <a href="https://www.rottentomatoes.com/m/primate_2025">US rating advisory</a> includes strong violence and gore. <a href={official.primate}>Paramount's listing</a> confirms the January 2026 release; a 2025 label on a review site refers to its earlier festival debut, not a different horror film.</p>
    </section>

    <h2 id="how-we-chose" tabIndex={-1}>How we chose these horror films</h2>
    <p>We started with released films that had favorable critical reception, cross-checking the <a href="https://editorial.rottentomatoes.com/guide/best-new-horror-movies-2026/">Rotten Tomatoes 2026 horror guide</a> against individual reviews and official distributor pages. Then we chose a range of viewing experiences: supernatural unease, folk horror, dark comedy, uncanny spaces, action and creature horror. This is a selective watchlist, rather than a claim that every reader will agree on one winner.</p>
    <p>“2026” means a US theatrical release by October 12, 2026. Festival dates can be earlier, and release dates elsewhere can differ. Unreleased films are not ranked alongside films audiences can already see. Credits and dates are checked against the sources below; recommendations are editorial judgments based on that research, not claims of firsthand screenings. This article was prepared with AI assistance.</p>

    <section className="hq-article-faq" aria-labelledby="watchlist-questions">
      <h2 id="watchlist-questions" tabIndex={-1}>Questions before you build your watchlist</h2>
      <div><h3>Which 2026 horror movie should I watch first?</h3><p>For a standalone ghost-story evening, pick <em>Hokum</em>. For survival horror with comedy, choose <em>Send Help</em>. Try <em>Obsession</em> for a disturbing supernatural premise, or the new <em>Resident Evil</em> for action and horror together. Pick by the kind of tension you enjoy; a single score cannot make that decision for you.</p></div>
      <div><h3>Do I need to watch the old Resident Evil movies?</h3><p>No film-series recap is needed for this pick. Sony presents the 2026 film as an all-new story with Bryan as its protagonist. Knowing the games can add context, but this watchlist recommends it as a starting point, rather than as a continuation of the earlier Alice films.</p></div>
      <div><h3>Where can I watch these movies?</h3><p>Use the official film pages linked in each entry to find cinema tickets or home-viewing options. At the October 12 check, Sony listed <em>Resident Evil</em> as playing in theaters; A24, NEON and Focus provided home-viewing links for their films. Subscription catalogs and rental offers depend on your country and can change, so an offer in the US is not a promise of availability elsewhere.</p></div>
      <div><h3>Is this a list of low-gore horror movies?</h3><p>No. <em>Primate</em>, <em>Resident Evil</em> and <em>The Bone Temple</em> have US rating advisories that explicitly include gore. A supernatural or psychological premise also does not guarantee mild content. If you have a specific limit, check the film's detailed content advisory before choosing it.</p></div>
    </section>

    <div className="hq-article-takeaway"><h3>Make it a movie night</h3><p>Choose one film that fits your mood, then see how much movie knowledge sticks: <Link to="/">Hard Quiz's movie and actor quizzes</Link> test recognition from images. You can also explore the <Link to="/daily">Daily Challenge</Link>, or read <Link to="/how-to-play">how the quizzes work</Link> before playing.</p></div>
  </>,
};

export default post;
