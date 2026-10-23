import { useState } from "react";
import { listingImageSizes, responsiveImage } from "../imageSources";

/** Reserved space and a finite fallback chain keep failed covers quiet. */
export default function ListingCover({ images, priority = false }: { images: string[]; priority?: boolean }) {
  const [index, setIndex] = useState(0);
  const src = images[index];
  const image = src ? responsiveImage(src) : undefined;
  return <div className="hq-blog-cover" aria-hidden="true">
    <span className="hq-blog-cover-fallback">Hard Quiz</span>
    {image && <img key={src} {...image} {...(priority ? { fetchpriority: "high" } : {})} alt="" width={image.width ?? 640} height={image.height ?? 360} sizes={image.srcSet ? listingImageSizes : undefined} loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setIndex(value => value + 1)} />}
  </div>;
}
