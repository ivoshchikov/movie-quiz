import type { ReactNode } from "react";
import filmPoster from "./filmPoster";
import { formatBlogDate } from "../presentation";
import { moviePoster } from "../moviePosters";

type Props = {
  id: string; title: string; posterId: string;
  releaseDate: string; releaseNote?: string; genre: string;
  director: string; cast: string[]; castLabel?: string; children?: ReactNode;
};

export default function MovieBlock({ id, title, posterId, releaseDate, releaseNote, genre, director, cast, castLabel = "Cast", children }: Props) {
  const hasPoster = Boolean(moviePoster(posterId));
  return <section className={`hq-movie${hasPoster ? "" : " hq-movie-no-image"}`} aria-labelledby={id}>
    <header className="hq-movie-heading"><h2 id={id} tabIndex={-1}>{title}</h2><p>{genre}</p></header>
    {filmPoster(posterId, true)}
    <div className="hq-movie-info">
      <dl className="hq-movie-facts">
        <div><dt>US release</dt><dd><time dateTime={releaseDate}>{formatBlogDate(releaseDate)}</time>{releaseNote && <> · {releaseNote}</>}</dd></div>
        <div><dt>Director</dt><dd>{director}</dd></div>
        <div><dt>{castLabel}</dt><dd>{cast.join(", ")}</dd></div>
      </dl>
      <div className="hq-movie-copy">{children}</div>
    </div>
  </section>;
}
