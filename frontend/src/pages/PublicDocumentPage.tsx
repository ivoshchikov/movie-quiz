import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { publicContact, publicContactHref, publicDocumentMetadata, publicSiteDetails } from "../publicDocuments";
import type { PublicDocument } from "../publicDocuments";
import { getConsent, getServerConsent, subscribeConsent, withdrawAnalytics } from "../privacy/consent";
import "../public-documents.css";

type Section = { id: string; title: string; content: ReactNode };

function ProjectContact({ subject = "Hard Quiz enquiry" }: { subject?: string }) {
  if (!publicContact) return null;
  return <div className="hq-info-contact-address">
    <p>Hard Quiz is a {publicContact.projectBrand} project.</p>
    <p>For general enquiries and privacy requests, contact <a href={publicContactHref(subject)}>{publicContact.email}</a>.</p>
  </div>;
}

function AnalyticsChoices() {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  return <div className="hq-info-choice" aria-label="Analytics choices">
    <p>Optional analytics is off until you give permission. These controls cover Google Analytics and our separate visitor and page-view counters. Declining does not prevent you from playing.</p>
    <p className="hq-info-choice-state" role="status">Analytics is off on this policy page.</p>
    <div className="hq-info-actions">
      <button className="hq-secondary" onClick={withdrawAnalytics}>Turn off analytics</button>
      <a className="hq-text-action" href="/?privacy=settings">Privacy settings</a>
    </div>
    <p className="hq-info-small">Privacy settings opens the consent controls on the home page. This policy page does not load the CMP or Google Analytics. Turning off analytics applies immediately to this browser and informs other open tabs; it does not erase earlier server measurements.</p>
    {consent.status === "unavailable" && <p>When privacy controls are unavailable, optional analytics stays off.</p>}
  </div>;
}

function privacySections(): Section[] {
  return [
    { id: "about-this-policy", title: "About this policy", content: <>
      <p>This policy explains how Hard Quiz uses personal data when you browse hard-quiz.com, play its games, sign in or contact us. The site is operated from Cyprus.</p>
      <ProjectContact subject="Hard Quiz privacy request" />
      <p>Our <Link to="/contact">Contact page</Link> explains what to include when asking about the games, your account or privacy.</p>
    </> },
    { id: "data-we-use", title: "The data we use", content: <>
      <h3>Accounts and sign-in</h3>
      <p>If you create an account, Supabase processes your email address, account identifier and sign-in information. You can request an email sign-in link or choose Google sign-in. Google sign-in can provide your Google account identifier, email address and profile information, such as a name or profile-picture URL, depending on what Google supplies.</p>
      <p>Your Hard Quiz profile stores your chosen nickname and may store a profile-picture URL. The current player interface uses your nickname and an initial. We do not ask you to create a Hard Quiz password.</p>
      <h3>Games, results and preferences</h3>
      <p>We process the category and difficulty you choose, session and round identifiers, answers or comparison choices, timing, scores and completion status. Signed-in play can be linked to your account to maintain personal bests, Daily results and streaks, game statistics and This or That preferences.</p>
      <p>Guest play also needs temporary session identifiers and game records. Some guest results and preferences are saved in your browser. Guest This or That favourites remain device-local unless you choose to import them after signing in.</p>
      <h3>Technical and usage information</h3>
      <p>Cloudflare, Supabase and other services receiving a request can process its IP address, browser information, request time, requested resource and diagnostic or security information. This happens when they deliver pages, images, sign-in and game services, including for guests.</p>
      <p>Our own visitor and page-view counters use random browser and event identifiers with server timestamps. Those counter tables do not store your email, nickname, IP address, page URL or answers. They are separate from gameplay records and Google Analytics.</p>
      <p>Google Analytics measures page visits, navigation, referral and campaign information, device or browser characteristics and game or article interactions. Our custom events can include game mode, category, difficulty, question position, outcome, timing and a separate random analytics run identifier. We do not intentionally include your email, nickname, sign-in tokens or server game-session credentials in those events.</p>
      <h3>Messages you send</h3>
      <p>If you contact us, we receive your email address and the information you include. Share only what we need to understand the request. Do not send passwords, sign-in links or authentication tokens.</p>
    </> },
    { id: "purposes-and-bases", title: "Why we use data", content: <>
      <ul>
        <li><strong>Providing the service:</strong> delivering a requested game, managing sign-in, saving account results and responding to service requests. Where the GDPR applies, processing needed to provide the service you request relies on performance of a contract or steps you request before entering one.</li>
        <li><strong>Operating and protecting Hard Quiz:</strong> validating scores, preventing abuse, investigating errors and maintaining reliable services. We rely on legitimate interests in running a fair, secure and usable site, balanced against your rights.</li>
        <li><strong>Public rankings and game statistics:</strong> showing the results and comparison rankings that are part of the service, and understanding question performance. We use the relevant service basis or our legitimate interest in maintaining and improving the games.</li>
        <li><strong>Optional audience analytics:</strong> understanding visits, referrals and which pages or games people use. We request prior consent for these optional measurements. We do not load Google Analytics, create optional measurement identifiers or send our visitor/page-view counts before the corresponding permission. Refusal, an unknown choice or a failed consent service leaves measurement off.</li>
        <li><strong>Legal requests and obligations:</strong> handling applicable privacy rights, legal obligations and disputes, using the legal basis relevant to the request.</li>
      </ul>
      <p>Providing an email address and sign-in data is necessary for an account. Classic, Time Attack and This or That can be played as a guest. Daily Challenge and account-linked records require sign-in.</p>
    </> },
    { id: "public-results", title: "What other visitors can see", content: <>
      <p>Public leaderboards can show your nickname, rank, score, quiz duration or Daily streak. Your signed-in This or That choices can contribute to aggregate community rankings; guest favourites are private to your browser until you choose to import them.</p>
      <p>Choose a nickname you are comfortable making public. Your sign-in email and private account records are not displayed as public leaderboard fields. The site operator has restricted administrative access to records needed to manage games, investigate errors and answer requests.</p>
    </> },
    { id: "browser-storage", title: "Cookies and browser storage", content: <>
      <p>The site uses local storage, session storage and service-provider technologies. These do different jobs:</p>
      <div className="hq-info-table-wrap"><table className="hq-info-table">
        <caption>Storage used by Hard Quiz</caption>
        <thead><tr><th scope="col">Purpose</th><th scope="col">What it supports</th><th scope="col">How long it remains</th></tr></thead>
        <tbody>
          <tr><th scope="row">Sign-in</th><td>Supabase session and refresh information to keep you signed in.</td><td>Until expiry, sign-out or removal, depending on the session and browser.</td></tr>
          <tr><th scope="row">Game continuity</th><td>Game references, local results, Daily progress and device-local favourites.</td><td>Until the game replaces or clears it, or you clear browser data.</td></tr>
          <tr><th scope="row">Interface choices</th><td>Theme, return navigation and scroll position.</td><td>For the tab session or until browser data is cleared, depending on the setting.</td></tr>
          <tr><th scope="row">Privacy choices</th><td>Consent records from Google Privacy &amp; messaging, analytics preferences and opt-out instructions. These remember your decision and do not require analytics permission.</td><td>Our separate analytics choice outside Europe lasts 180 days, unless changed or cleared. Google applies the lifetime of its consent records and requests a new choice when needed. A legacy opt-out remains until you change it or clear storage.</td></tr>
          <tr><th scope="row">Audience measurement</th><td>A random first-party visitor identifier, short-lived event deduplication and Google Analytics identifiers or cookies.</td><td>First-party identifiers remain until cleared; session data expires or is replaced. Google applies its cookie and retention settings.</td></tr>
        </tbody>
      </table></div>
      <p>Blocking or clearing storage can sign you out, remove local results or preferences, and reset saved choices. It does not automatically erase records already stored on our servers.</p>
    </> },
    { id: "analytics-choices", title: "Your analytics choices", content: <>
      <AnalyticsChoices />
      <p>In the EEA, UK and Switzerland, Google Privacy &amp; messaging presents the applicable purposes and vendor choices through the IAB Transparency and Consent Framework. Our own counters require consent to device storage and content measurement; Google Analytics also requires audience analysis and Google's explicit analytics consent signal. Advertising choices do not override our current decision to keep all advertising off.</p>
      <p>Outside that European consent flow, we ask separately for site audience counters and Google Analytics. Neither is preselected. An inapplicable regional rule is not treated as permission. We conservatively keep optional analytics off when the browser sends Global Privacy Control. Google provides a Do Not Sell or Share link in supported US states.</p>
      <p>Use Privacy settings to change or withdraw your choice. Opening it stops optional measurement immediately. If a game is already running, the full controls wait until it ends so a consent window cannot cover the game while its timer runs. We do not replay events from before consent or during refusal.</p>
      <p>This control applies to this browser and device. If you clear site data or use another browser, make the choice again. Essential hosting, security, sign-in and gameplay processing is separate from optional audience measurement.</p>
      <p>For more about Google's processing, see <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">How Google uses information from sites or apps that use its services</a>. Google also provides an <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Analytics opt-out browser add-on</a>.</p>
    </> },
    { id: "service-providers", title: "Service providers and disclosures", content: <>
      <ul>
        <li><strong>Cloudflare:</strong> website delivery, caching, network protection and operational diagnostics. See <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare's Privacy Policy</a>.</li>
        <li><strong>Supabase:</strong> account authentication, database, images and backend game services. Our application database is hosted in the European Union. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase's privacy information</a>.</li>
        <li><strong>Google:</strong> Google sign-in when you choose it, Privacy &amp; messaging for consent records and regional privacy choices, and Google Analytics after the relevant permission. The consent service receives technical requests needed to present and remember choices; those are separate from optional analytics. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.</li>
        <li><strong>Email services:</strong> delivery and handling of requested sign-in links and messages you send to the site operator.</li>
      </ul>
      <p>We may also disclose information when legally required, to address abuse or security incidents, or to establish, exercise or defend legal claims. External links take you to services with their own privacy practices.</p>
    </> },
    { id: "international-processing", title: "International processing", content: <>
      <p>Although the application database is in the EU, our providers operate international infrastructure. Delivery, support, analytics and security processing can take place outside your country, including outside the European Economic Area.</p>
      <p>Where a transfer requires safeguards, applicable provider agreements and transfer arrangements must support it. Contact us for information about the arrangements relevant to your data. The database region alone does not mean every service processes data only in the EU.</p>
    </> },
    { id: "retention", title: "How long data is kept", content: <>
      <ul>
        <li><strong>Account records, personal bests and signed-in preferences:</strong> kept to provide your account and its history, unless removed or anonymised following a valid request or another applicable reason. There is currently no automatic deletion simply because an account is inactive.</li>
        <li><strong>Guest server sessions:</strong> scheduled cleanup targets Classic, Time Attack and This or That guest session records after about one day. Some local guest preferences remain in your browser until you clear them.</li>
        <li><strong>Detailed guessing-game round snapshots:</strong> scheduled cleanup targets completed Classic and Time Attack snapshots after 30 days. Session summaries, signed-in answer history, Daily records and aggregate question statistics can remain for their service and integrity purposes.</li>
        <li><strong>First-party visitor and page-view records:</strong> daily cleanup removes records outside the 35-day retention window. Records can remain until the next cleanup run.</li>
        <li><strong>Google Analytics:</strong> retention depends on the property's configured data-retention settings and Google's processing terms. Aggregated reports can remain longer than user-level or event-level data.</li>
        <li><strong>Operational logs and correspondence:</strong> kept according to provider settings and for as long as reasonably needed to investigate an issue, respond to you, protect the service or meet a legal obligation.</li>
      </ul>
      <p>Cleanup runs in batches and is not an exact deletion deadline. Backups and records needed for a legal or security reason can follow different retention periods. We assess requests for deletion against the applicable requirements and the data we actually hold.</p>
    </> },
    { id: "your-rights", title: "Your privacy rights", content: <>
      <p>Depending on the law that applies, you can ask to access or correct personal data, request erasure or restriction, object to processing, and receive a portable copy where that right applies. Where processing relies on consent, you can withdraw it without affecting the lawfulness of earlier processing.</p>
      <p>Send a request through the <Link to="/contact#privacy-requests">privacy contact instructions</Link>. We may need information to verify that the data or account belongs to you. Do not send a password or a sign-in link. Requests are assessed under the applicable law; some records may need to be retained for legal or security reasons.</p>
      <p>You can complain to your local supervisory authority. In Cyprus this is the <a href="https://www.gov.cy/dataprotection/en/information-for-the-public/lodge-a-complaint/" target="_blank" rel="noopener noreferrer">Office of the Commissioner for Personal Data Protection</a>.</p>
    </> },
    { id: "advertising", title: "Advertising", content: <>
      <p>Third-party advertising is not currently enabled on Hard Quiz. We are preparing the site for a possible Google AdSense launch. That preparation does not mean ads or personalised advertising are already active.</p>
      <p>Before enabling advertising, we will update this policy and the relevant consent controls to explain the actual providers, purposes and choices. Advertising services can use cookies, web beacons, IP addresses and other identifiers to deliver, measure or personalise ads where permitted and, where required, with consent.</p>
    </> },
    { id: "security-and-children", title: "Security and children's data", content: <>
      <p>We use access controls and service-provider security features to protect data, but no online service can guarantee absolute security. Keep your sign-in links and account access private.</p>
      <p>Hard Quiz is a general-audience movie quiz. We do not ask for a date of birth. If you are a parent or guardian with a concern about a child's data, contact us so we can assess the situation and take appropriate action.</p>
    </> },
    { id: "policy-updates", title: "Updates to this policy", content: <>
      <p>We update this page when the site's processing or the relevant information changes. The date at the top identifies the latest update. Material changes, including an advertising launch, will be reflected in the policy and the relevant controls.</p>
    </> },
  ];
}

function aboutSections(): Section[] {
  return [
    { id: "the-games", title: "Four ways to play", content: <div className="hq-info-modes">
      {[
        ["/movie-quiz", "Classic", "Choose movies, TV series, actors or actresses, then identify each image from four answers. Play as a guest or sign in before starting to save eligible records."],
        ["/daily", "Daily Challenge", "One shared challenge per day, with one signed-in attempt. Correct answers build your streak. The day resets at midnight US Central."],
        ["/time-attack", "Time Attack", "Keep identifying images against one continuous timer. Your choice of difficulty sets the time available."],
        ["/this-or-that", "This or That", "Compare actors or actresses to build a personal favourites list. Signed-in eligible choices can contribute to the community ranking."],
      ].map(([to,title,description])=><Link key={to} className="hq-info-mode" to={to}><h3>{title}</h3><p>{description}</p><span>Explore {title} →</span></Link>)}
      <p className="hq-info-wide">The <Link to="/how-to-play">How to play guide</Link> explains the rules, timers, guest play and saved results.</p>
    </div> },
    { id: "editorial-approach", title: "Our movie guides", content: <>
      <p>The <Link to="/blog">Hard Quiz blog</Link> covers movie recommendations, release guides and film explainers. Articles bring together research, official announcements and linked sources to help you choose something to watch or explore a film topic.</p>
      <p>Research, drafting and maintenance can use AI-assisted tools. We check factual claims against the sources linked in the articles and update substantive information when it changes. Publication and update dates help you judge how current a guide is.</p>
      <p>Viewing availability, release plans and regional offers can change. Follow the linked provider for its current details. Recommendations aim to avoid major plot solutions; source links may contain their own spoilers.</p>
      <p>If a fact needs correcting, send the article URL and a reliable source through our <Link to="/contact#editorial-corrections">editorial contact instructions</Link>.</p>
    </> },
    { id: "about-the-project", title: "An independent project", content: <>
      <p>Hard Quiz is an independent movie-game and editorial project. It is not affiliated with or endorsed by the performers, studios or streaming services mentioned on the site.</p>
      <ProjectContact />
      <p>For questions about the games, your account, privacy or an image, visit <Link to="/contact">Contact</Link>. Our <Link to="/privacy">Privacy Policy</Link> explains the data used to run the site.</p>
    </> },
  ];
}

function contactSections(): Section[] {
  return [
    { id: "game-and-account-help", title: "Game and account help", content: <>
      <p>Tell us which page or game mode you were using, what happened and which browser or device you used. For an error, the wording of the message and approximate time can help.</p>
      <p>You can include your player nickname when it is relevant. Do not send passwords, sign-in links or authentication tokens.</p>
    </> },
    { id: "privacy-requests", title: "Privacy requests", content: <>
      <p>For access, correction or deletion of your personal data, describe the request and, when it concerns an account, contact us from the email address used for that account where possible. We may ask for proportionate information to verify the request.</p>
      <p>See the <Link to="/privacy#your-rights">Privacy Policy</Link> for more about your rights and how data is used.</p>
    </> },
    { id: "editorial-corrections", title: "Editorial corrections", content: <>
      <p>Include the article URL, the detail you believe needs correcting and a reliable source. For a viewing link, mention the country or region and when you checked it.</p>
    </> },
    { id: "image-rights", title: "Image and rights enquiries", content: <>
      <p>Include the page URL or another clear way to identify the material, explain your connection to it and describe the concern. Provide links or documentation that help us understand the relevant rights and the action you are requesting.</p>
    </> },
  ];
}

export default function PublicDocumentPage({ document }: { document: PublicDocument }) {
  const metadata = publicDocumentMetadata[document];
  const sections = document === "privacy" ? privacySections() : document === "about" ? aboutSections() : contactSections();
  const date = new Date(`${publicSiteDetails.privacyUpdatedOn}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return <article className={`hq-info-page hq-info-${document}`}>
    <Seo title={metadata.title} description={metadata.description} url={metadata.url} jsonLd={metadata.jsonLd} />
    <header className="hq-info-header">
      <p className="hq-eyebrow">Hard Quiz</p><h1>{metadata.heading}</h1><p className="hq-info-intro">{metadata.intro}</p>
      {document === "privacy" && <p className="hq-info-updated">Last updated <time dateTime={publicSiteDetails.privacyUpdatedOn}>{date}</time></p>}
      {document === "contact" && <ProjectContact />}
    </header>
    <div className="hq-info-layout">
      <nav className="hq-info-contents" aria-label="On this page"><h2>On this page</h2><ol>{sections.map(section=><li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav>
      <div className="hq-info-content">{sections.map(section=><section key={section.id} aria-labelledby={section.id}><h2 id={section.id} tabIndex={-1}>{section.title}</h2>{section.content}</section>)}</div>
    </div>
  </article>;
}
