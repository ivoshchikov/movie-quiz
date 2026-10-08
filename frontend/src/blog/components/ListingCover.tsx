import { useState } from "react";

/** Reserved space and a finite fallback chain keep failed covers quiet. */
export default function ListingCover({ images, priority = false }: { images: string[]; priority?: boolean }) {
  const [index, setIndex] = useState(0);
  const src = images[index];
  return <div className="hq-blog-cover" aria-hidden="true">
    <span className="hq-blog-cover-fallback">Hard Quiz</span>
    {src && <img key={src} src={src} alt="" width="640" height="360" loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setIndex(value => value + 1)} />}
  </div>;
}
