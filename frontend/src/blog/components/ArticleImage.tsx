import { useState } from "react";
import { articleImageSizes, responsiveImage } from "../imageSources";

type Props = { src: string; alt: string; width: number; height: number; priority?: boolean; crop?: boolean; sizes?: string };

/** Key the inner component by src so navigation cannot inherit a failed image. */
export default function ArticleImage(props: Props) {
  return <ImageWithFallback key={props.src} {...props} />;
}

function ImageWithFallback({ src, alt, width, height, priority = false, crop = false, sizes = articleImageSizes }: Props) {
  const [failed, setFailed] = useState(false);
  const image = responsiveImage(src);
  return <div className={`hq-article-image${crop ? " hq-article-image-crop" : ""}`} style={{ aspectRatio: `${width} / ${height}` }}>
    {failed ? <div className="hq-article-image-fallback" role="img" aria-label={`${alt}. Image unavailable.`}><span>Image unavailable</span></div>
      : <img {...image} {...(priority ? { fetchpriority: "high" } : {})} alt={alt} width={image.width ?? width} height={image.height ?? height} sizes={image.srcSet ? sizes : undefined} loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />}
  </div>;
}
