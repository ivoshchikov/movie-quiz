import type { ReactNode } from "react";
import filmPoster from "./filmPoster";

/** Keep the whole description beside its poster, including in prerendered HTML. */
export default function filmContent(id: string, copy: ReactNode) {
  const poster = filmPoster(id);
  if (!poster) return copy;
  return <div className="hq-film-layout">
    {poster}
    <div className="hq-film-copy">{copy}</div>
  </div>;
}
