import type { ReactNode } from "react";
import { useRegisterPoster } from "./galleryContext";
import ArticleImage from "./ArticleImage";
import { formatBlogDate } from "../presentation";

type Props = {
  id: string; title: string; posterUrl: string; alt: string;
  releaseDate: string; releaseNote?: string; genre: string;
  director: string; cast: string[]; castLabel?: string; children?: ReactNode;
};

export default function MovieBlock({ id, title, posterUrl, alt, releaseDate, releaseNote, genre, director, cast, castLabel = "Cast", children }: Props) {
  useRegisterPoster(posterUrl);
  return <section className="hq-movie" aria-labelledby={id}>
    <header className="hq-movie-heading"><h2 id={id} tabIndex={-1}>{title}</h2><p>{genre}</p></header>
    <figure className="hq-movie-poster"><ArticleImage src={posterUrl} alt={alt} width={2} height={3} /><figcaption>Theatrical poster</figcaption></figure>
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
