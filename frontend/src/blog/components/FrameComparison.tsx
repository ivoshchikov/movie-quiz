import ArticleImage from "./ArticleImage";

export default function FrameComparison({ src }: { src: string }) {
  return <figure className="hq-frame-comparison">
    <div className="hq-frame-pair">
      <div><p className="hq-frame-label">Wide frame · 2.39:1</p><ArticleImage src={src} alt="Original geometric station illustration with three figures and a clock across the wide frame" width={2390} height={1000} crop priority /></div>
      <div><p className="hq-frame-label">Centered crop · 16:9</p><ArticleImage src={src} alt="The same original illustration cropped to 16:9, with less space visible at the sides" width={1778} height={1000} crop priority /></div>
    </div>
    <figcaption>Original Hard Quiz illustration, not a film still. The same scene appears in both panels. The narrower crop removes the sides; it does not stretch the figures. Letterboxing would preserve the complete wide frame instead.</figcaption>
  </figure>;
}
