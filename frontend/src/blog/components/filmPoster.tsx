import ArticleImage from "./ArticleImage";
import { moviePoster } from "../moviePosters";

/** Store art stays with its own purchase link; it never enters a fallback gallery. */
export default function filmPoster(id: string, archive = false) {
  const image = moviePoster(id);
  if (!image) return null;
  return <figure className={`hq-store-poster hq-film-poster ${archive ? "hq-movie-poster" : "hq-film-still"}`}>
    <a href={image.storeUrl} aria-label={`View ${image.title} in the US Apple TV Store`}>
      <ArticleImage src={image.src} alt={image.alt} width={image.width} height={image.height} sizes={archive ? "(max-width: 600px) 120px, 152px" : "240px"} />
    </a>
    <figcaption>{image.title}. Promotional store poster via Apple iTunes. Film artwork © its respective rights holders.</figcaption>
    <a className="hq-store-badge" href={image.storeUrl} aria-label={`Get ${image.title} on iTunes — US store`}>
      <img src="/blog-assets/itunes-store-get-badge.svg" width={140} height={41} alt="Get it on iTunes" loading="lazy" decoding="async" />
    </a>
  </figure>;
}
