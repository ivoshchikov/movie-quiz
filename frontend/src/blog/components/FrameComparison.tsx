import ArticleImage from "./ArticleImage";

export default function FrameComparison({ src }: { src: string }) {
  return <figure className="hq-frame-comparison">
    <div className="hq-frame-pair">
      <div><p className="hq-frame-label">Wide frame · 2.39:1</p><ArticleImage src={src} alt="Wide frame showing several dancers and a helicopter across the scene" width={2390} height={1000} crop priority /></div>
      <div><p className="hq-frame-label">Centered crop · 16:9</p><ArticleImage src={src} alt="The same scene cropped to 16:9, with less space visible at the sides" width={1778} height={1000} crop priority /></div>
    </div>
    <figcaption>The same scene in both panels. The narrower crop removes the sides; it does not stretch the people. Letterboxing would preserve the complete wide frame instead.</figcaption>
  </figure>;
}
