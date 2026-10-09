import type { BlogPost } from "../types";
import ArticleImage from "../components/ArticleImage";
import FrameComparison from "../components/FrameComparison";
import OpticsIllustration from "../components/OpticsIllustration";

const CDN = "https://vgjfbcihppxbtrjcxoci.supabase.co/storage/v1/object/public/blog/Trivia/239";
const staging = CDN + "/composition-staging.webp";
const negative = CDN + "/composition-negative.webp";

const post: BlogPost = {
  slug: "why-2-39-1-feels-more-cinematic",
  title: "Why 2.39:1 Feels More Cinematic",
  excerpt: "See how 2.39:1 changes composition, what a 16:9 crop removes, and why a wide frame and anamorphic lens characteristics are different things.",
  date: "2025-08-15", modified: "2026-10-09",
  tags: ["Explainers & Trivia", "Aspect Ratio"],
  coverUrl: CDN + "/flat-vs-scope.webp",
  gallery: [staging, negative],
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
    <p>A wide frame gives a filmmaker more horizontal space to work with. That can make a landscape, a group of characters or an empty stretch of a room feel very different. The familiar shape of 2.39:1 also carries an association with theatrical cinema. It is a compositional choice, however, rather than a guarantee of a better image.</p>

    <h2 id="compare-frames" tabIndex={-1}>Compare 2.39:1 and 16:9</h2>
    <p>Start with one scene. In the second panel, a centered 16:9 crop removes information from the sides. Look at the space around the people, rather than just the black borders.</p>
    <FrameComparison src={staging} />
    <p>A 16:9 television does not have to crop a Scope film. Fitting the full wide image across the screen leaves letterbox bars above and below it. Our comparison deliberately crops the sides to show the difference between preserving and trimming the composition.</p>

    <h2 id="what-scope-means" tabIndex={-1}>What Scope means</h2>
    <p>An aspect ratio describes image width relative to height. At 2.39:1, the picture is about 2.39 times as wide as it is tall. The term Scope is commonly used for this theatrical widescreen shape; you may also encounter the older 2.35:1 convention and the rounded 2.40:1 notation.</p>
    <p>Widescreen processes such as CinemaScope became prominent in the 1950s. Today's ratio describes the delivered frame, not necessarily the camera, lens or recording format used to make it. A spherical-lens image can be cropped to the same shape.</p>

    <h2 id="composition" tabIndex={-1}>Composition and negative space</h2>
    <h3>Keep several things in view</h3>
    <p>More horizontal space can hold a conversation, movement and the surrounding setting in one shot. A director can place people at opposite edges or let action unfold across the frame. Whether that works depends on the staging; simply adding width does not make a scene clearer.</p>
    <h3>Let the surroundings matter</h3>
    <p>Space around a character can suggest distance, isolation or scale. A wide composition gives you room to build those relationships, while also asking viewers to choose where to look.</p>
    <figure><ArticleImage src={negative} alt="A wide view of a crowded highway with distant landscape visible around the people" width={3420} height={1342} /><figcaption>Look at the people in relation to the surrounding road and landscape. Negative space and scale come from the composition, not the aspect ratio alone.</figcaption></figure>

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
    <p>A tall space, a face filling the frame or a video intended for vertical viewing may call for a different shape. Neither 16:9 nor 1.85:1 prevents expressive cinematic composition. The useful question is what the scene needs viewers to see.</p>
    <div className="hq-article-takeaway"><h3>Choose the frame for the story</h3><p>Use 2.39:1 when the horizontal relationships help the scene. Keep the full composition when presenting it on a different screen, unless a deliberate crop serves a clear purpose.</p></div>
  </>,
};
export default post;
