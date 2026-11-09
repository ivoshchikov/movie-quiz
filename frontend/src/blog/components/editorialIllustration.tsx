import ArticleImage from "./ArticleImage";
import { originalArtwork } from "../originalArtwork";

export default function editorialIllustration(id: string, compact = false) {
  const { caption, ...image } = originalArtwork(id);
  return <figure className="hq-film-still hq-editorial-illustration" style={compact ? { maxWidth: Math.round(image.width / image.height * 360) } : undefined}>
    <ArticleImage {...image} />
    <figcaption>{caption}</figcaption>
  </figure>;
}
