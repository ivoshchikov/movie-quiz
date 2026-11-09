import ArticleImage from "./ArticleImage";
import FilmFrameCredit from "./FilmFrameCredit";
import frames from "../filmFrames.json";

export default function FrameComparison() {
  const frame = frames["tears-of-steel-conversation"];
  return <figure className="hq-frame-comparison">
    <div className="hq-frame-pair">
      <div><p className="hq-frame-label">Wide frame · 2.39:1</p><ArticleImage src={frame.src} alt={frame.alt} width={2390} height={1000} crop priority /></div>
      <div><p className="hq-frame-label">Centered crop · 16:9</p><ArticleImage src={frame.src} alt="The same Tears of Steel frame cropped to 16:9, with less of the setting visible at the sides" width={1778} height={1000} crop priority /></div>
    </div>
    <figcaption><FilmFrameCredit id="tears-of-steel-conversation" cropped /> The source frame is 2.40:1, shown here at 2.39:1 and 16:9. The narrower crop removes the sides; it does not stretch the image. Letterboxing would preserve the complete wide frame instead.</figcaption>
  </figure>;
}
