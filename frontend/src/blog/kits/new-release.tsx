import type { ReactNode } from "react";
import type { BlogPost } from "../types";
import MovieBlock from "../components/MovieBlock";
import { formatBlogDate, validBlogDate } from "../presentation";

export type NewReleaseFilm = {
  id: string; title: string; posterUrl: string; releaseDate: string; releaseNote?: string;
  genre: string; director: string; cast: string[]; castLabel?: string; body: ReactNode;
};

type NewReleaseConfig = Omit<BlogPost, "content" | "contents" | "readingMinutes"> & {
  monthLabel: string; intro: string; films: NewReleaseFilm[];
  faq: { question: string; answer: ReactNode }[];
};

export function buildNewReleasesPost({ films, faq, monthLabel, intro, ...post }: NewReleaseConfig): BlogPost {
  for (const film of films) {
    if (!validBlogDate(film.releaseDate) || !film.genre.trim() || !film.director.trim() || !film.cast.length || film.cast.some(name => !name.trim())) {
      throw new Error(`Invalid release facts for ${film.title} in ${post.slug}`);
    }
  }
  return {
    ...post,
    gallery: post.gallery ?? films.map(film => film.posterUrl),
    contents: [{ id: "release-dates", label: "Release dates at a glance" }, ...films.map(film => ({ id: film.id, label: film.title })), { id: "faq", label: "Questions about this lineup" }, { id: "sources", label: "Sources" }],
    content: () => <>
      <p>{intro}</p>
      <section className="hq-release-index" aria-labelledby="release-dates">
        <h2 id="release-dates" tabIndex={-1}>Release dates at a glance</h2>
        <table>
          <caption>{monthLabel} · selected US theatrical releases</caption>
          <thead><tr><th scope="col">Movie</th><th scope="col">US release</th><th scope="col">Genre</th></tr></thead>
          <tbody>{films.map(film => <tr key={film.id}><th scope="row"><a href={`#${film.id}`}>{film.title}</a></th><td><time dateTime={film.releaseDate}>{formatBlogDate(film.releaseDate)}</time>{film.releaseNote && <span className="hq-release-note">{film.releaseNote}</span>}</td><td>{film.genre}</td></tr>)}</tbody>
        </table>
      </section>
      {films.map(film => <MovieBlock key={film.id} {...film} alt={`${film.title} theatrical poster`}>{film.body}</MovieBlock>)}
      <section className="hq-article-faq" aria-labelledby="faq">
        <h2 id="faq" tabIndex={-1}>Questions about this lineup</h2>
        {faq.map(item => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
      </section>
    </>,
  };
}
