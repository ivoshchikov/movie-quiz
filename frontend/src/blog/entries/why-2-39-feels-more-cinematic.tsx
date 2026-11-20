import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import FrameComparison from "../components/FrameComparison";
import OpticsIllustration from "../components/OpticsIllustration";
import FilmFrameCredit from "../components/FilmFrameCredit";
import frames from "../filmFrames.json";

const negative = frames["tears-of-steel-launch"];

const post: BlogPost = {
  slug: "why-2-39-1-feels-more-cinematic",
  title: "Why 2.39:1 Feels More Cinematic",
  excerpt: "Follow a hand, a machine and the space around them: a practical 2.39:1 versus 16:9 comparison, with crop arithmetic and a separate look at anamorphic lenses.",
  date: "2025-08-15", modified: "2026-11-21",
  tags: ["Explainers & Trivia", "Aspect Ratio"],
  coverUrl: "https://hard-quiz.com/blog-assets/original/scope-guide-cover.webp",
  listingCoverUrl: "https://hard-quiz.com/blog-assets/original/scope-guide-cover-640.webp",
  socialImagePath: "/blog-assets/original/scope-guide-social.webp",
  gallery: [],
  contents: [
    { id: "compare-frames", label: "Compare 2.39:1 and 16:9" },
    { id: "what-scope-means", label: "What Scope means" },
    { id: "composition", label: "Composition and negative space" },
    { id: "anamorphic", label: "The lens is a separate choice" },
    { id: "scope-today", label: "Getting a Scope image" },
    { id: "when-to-use", label: "When another ratio works better" },
    { id: "sources", label: "Sources" },
  ],
  sources: [
    { label: "RED — video aspect ratios", url: "https://www.reddigitalcinema.com/red-101/video-aspect-ratios" },
    { label: "RED — anamorphic lenses", url: "https://www.reddigitalcinema.com/red-101/anamorphic-lenses" },
    { label: "ARRI — why 6:5 instead of the full 4:3 frame for 2× anamorphic", url: "https://www.arri.com/en/learn/camera-systems/frequently-asked-questions/alexa-sxt-faq/why-6-5-i-thought-you-needed-4-3-for-anamorphic--41676" },
  ],
  content: () => <>
    <p>The useful part of a wide frame is often beside the face you noticed first. A second person may be listening, a machine may dwarf its operator, or an empty stretch of a room may make two people seem reluctant to approach each other. <strong>2.39:1 feels cinematic partly through its theatrical associations and partly through what filmmakers do with those horizontal relationships.</strong> We can test the second part with one image.</p>

    <h2 id="compare-frames" tabIndex={-1}>Compare 2.39:1 and 16:9</h2>
    <p>Start with one scene. In the second panel, a centered 16:9 crop removes information from the sides. Look at how much of the setting remains around the man and the machine.</p>
    <FrameComparison />
    <p>Follow the man's hand to the machine. That contact survives the centered crop: you can still understand the immediate action. Now look away from the hand. The wide version gives the railing at the left and the machine at the right more space, placing the man inside an environment. The narrower panel gives that environment less room. The subject remains recognisable; the amount of surrounding information changes.</p>
    <p>There is arithmetic behind the difference. At the same image height, a 16:9 frame holds about <strong>74% of the width</strong> of a 2.39:1 frame: (16 ÷ 9) ÷ 2.39 ≈ 0.744. A centered crop therefore removes roughly 13% from each side. A face near an edge would need a different crop decision from this central figure.</p>
    <p>A 16:9 television does not have to crop a Scope film. Fitting the full wide image across the screen leaves letterbox bars above and below it. Our comparison deliberately crops the sides to show the difference between preserving and trimming the composition.</p>

    <h2 id="what-scope-means" tabIndex={-1}>What Scope means</h2>
    <p>An aspect ratio describes image width relative to height. At 2.39:1, the picture is about 2.39 times as wide as it is tall. The term Scope is commonly used for this theatrical widescreen shape; you may also encounter the older 2.35:1 convention and the rounded 2.40:1 notation.</p>
    <p>Widescreen processes such as CinemaScope became prominent in the 1950s. Today's ratio describes the delivered frame, not necessarily the camera, lens or recording format used to make it. A spherical-lens image can be cropped to the same shape.</p>

    <h2 id="composition" tabIndex={-1}>Composition and negative space</h2>
    <h3>Keep several things in view</h3>
    <p>Try reading a shot in three passes: find the face, find what it is looking toward, then inspect the space between them. A wide composition can keep all three available at once. In a conversation, that might let a listener's reaction remain visible while another person speaks. The width creates an opportunity; staging decides whether the extra information earns its place.</p>
    <h3>Let the surroundings matter</h3>
    <p>In the launch image below, find the rocket before scanning the structures on either side. The central light makes the first task easy; the crowded skyline supplies the scale around it. Calling the picture “wide” tells us its shape. Following that sequence of attention explains something about its composition.</p>
    <figure><ArticleImage src={negative.src} alt={negative.alt} width={negative.width} height={negative.height} /><figcaption><FilmFrameCredit id="tears-of-steel-launch" /> The open sky and small rocket set the scale against the dense city. The aspect ratio alone does not create that relationship.</figcaption></figure>

    <h2 id="anamorphic" tabIndex={-1}>The lens is a separate choice</h2>
    <p>An anamorphic lens compresses the image horizontally during capture; it is expanded again for viewing. Some anamorphic designs produce vertically oval out-of-focus highlights and horizontal streak flares. Their strength and appearance vary with the optics, lighting and focus.</p>
    <OpticsIllustration />
    <p>Those characteristics do not automatically appear when you crop a spherical image to 2.39:1. Conversely, an anamorphic capture need not be delivered at exactly 2.39:1. Frame shape and lens character are related decisions, not interchangeable terms.</p>

    <h2 id="scope-today" tabIndex={-1}>Getting a Scope image</h2>
    <ul>
      <li><strong>Spherical capture and crop:</strong> compose for the intended 2.39:1 frame, then remove the unused top and bottom area as needed. You keep the lens's own character.</li>
      <li><strong>2× anamorphic capture:</strong> the recorded frame shape matters. Expanding a full 4:3 image by 2 gives about 2.67:1, so reaching 2.39:1 requires a further crop. ARRI's approximately 6:5 recording area avoids much of that unused width.</li>
      <li><strong>A smaller squeeze factor:</strong> 1.3× applied to a 16:9 image gives about 2.31:1. The final ratio depends on both the capture area and the crop, rather than the lens factor alone.</li>
    </ul>
    <p>In every case, decide which part of the captured image will remain in the finished film before composing important details near the edges.</p>

    <h2 id="when-to-use" tabIndex={-1}>When another ratio works better</h2>
    <p>A tall doorway, a face filling the image or a video meant to be held vertically may need a different shape. Ask which relationship the scene needs to preserve. A wide room may matter in one shot; the height above a person may matter in the next. 16:9 and 1.85:1 leave filmmakers plenty of expressive choices.</p>
    <div className="hq-article-takeaway"><h3>A question for the next film you watch</h3><p>When you notice a wide shot, look at both edges before calling it cinematic. What would disappear in a centered crop, and would losing it change your reading of the scene? That is a more useful test than the presence of black bars.</p></div>
  </>,
};
export default post;
