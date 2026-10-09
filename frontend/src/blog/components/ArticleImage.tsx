import { useState } from "react";

type Props = { src: string; alt: string; width: number; height: number; priority?: boolean; crop?: boolean };

/** Key the inner component by src so navigation cannot inherit a failed image. */
export default function ArticleImage(props: Props) {
  return <ImageWithFallback key={props.src} {...props} />;
}

function ImageWithFallback({ src, alt, width, height, priority = false, crop = false }: Props) {
  const [failed, setFailed] = useState(false);
  return <div className={`hq-article-image${crop ? " hq-article-image-crop" : ""}`} style={{ aspectRatio: `${width} / ${height}` }}>
    {failed ? <div className="hq-article-image-fallback" role="img" aria-label={`${alt}. Image unavailable.`}><span>Image unavailable</span></div>
      : <img src={src} alt={alt} width={width} height={height} loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />}
  </div>;
}
