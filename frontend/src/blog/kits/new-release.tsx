// src/blog/kits/new-release.tsx
import React from "react";
import type { BlogPost } from "../types";
import MovieBlock from "../components/MovieBlock";

export type NewReleaseFilm = {
  title: string;
  posterUrl: string;
  alt?: string;
  release: string;      // "August 8, 2025 (US)" или просто "August 2025 (US)"
  director?: string;
  cast?: string[];
  reverse?: boolean;    // если не задано — чередуем автоматически
  body: React.ReactNode; // основной текст (пара абзацев), без спойлеров
};

export type NewReleaseConfig = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;          // ISO (YYYY-MM-DD)
  monthLabel: string;    // "August 2025"
  tags?: string[];       // по умолчанию ["Streaming & New Releases"]
  coverUrl?: string;     // можно не задавать — коллаж соберётся из gallery
  gallery?: string[];    // если не задано — возьмём постеры из films
  readingMinutes?: number;

  films: NewReleaseFilm[];

  // Кастомные секции (необязательно)
  tips?: React.ReactNode;
  faq?: React.ReactNode;
};

function fitForCollage(arr: string[]) {
  const L = arr.length;
  if (L >= 8) return arr.slice(0, 8);
  if (L === 7) return arr.slice(0, 6);
  if (L === 6) return arr;
  if (L === 5) return arr.slice(0, 4);
  if (L === 4) return arr;
  if (L === 3) return arr.slice(0, 2);
  if (L === 2) return arr;
  return arr.slice(0, 1);
}

export function buildNewReleasesPost(cfg: NewReleaseConfig): BlogPost {
  const galleryBase =
    cfg.gallery && cfg.gallery.length > 0
      ? cfg.gallery
      : cfg.films.map((f) => f.posterUrl).filter(Boolean);

  const gallery = fitForCollage(galleryBase);

  const Tips = () =>
    cfg.tips ?? (
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-lg font-semibold">How to pick your showing</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Go early in the run</strong> for the best crowds and energy.
          </li>
          <li>
            <strong>Choose premium sound</strong> for horror/action — bass and
            dynamics matter.
          </li>
          <li>
            <strong>Avoid spoilers</strong>: mute keywords on social before the
            weekend.
          </li>
        </ul>
      </section>
    );

  const FAQ = () =>
    cfg.faq ?? (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">
          FAQ: {cfg.monthLabel} movies
        </h2>
        <h3 className="mt-3 font-medium">What’s the best family pick?</h3>
        <p className="opacity-90">
          Look for the most upbeat PG/PG-13 title opening early in the month.
        </p>
        <h3 className="mt-4 font-medium">What’s the scariest title?</h3>
        <p className="opacity-90">
          The buzzy thriller/horror benefits from a big-screen sound mix and
          crowd reactions.
        </p>
        <h3 className="mt-4 font-medium">Full-throttle action?</h3>
        <p className="opacity-90">
          Pick the stunt-driven entry with practical-forward choreography and
          tight runtimes.
        </p>
      </section>
    );

  return {
    slug: cfg.slug,
    title: cfg.title,
    excerpt: cfg.excerpt,
    date: cfg.date,
    tags: cfg.tags ?? ["Streaming & New Releases"],
    coverUrl: cfg.coverUrl,
    gallery,
    readingMinutes: cfg.readingMinutes ?? 7,
    content: () => (
      <>
        <p className="opacity-90">
          Planning a Friday night watch or weekend matinee? {cfg.monthLabel} brings
          a compact, diverse lineup. Below are the key new theatrical releases to
          keep on your radar — spoiler-free and easy to skim.
        </p>

        {cfg.films.map((f, i) => (
          <MovieBlock
            key={f.title}
            title={f.title}
            posterUrl={f.posterUrl}
            alt={f.alt ?? `${f.title} — theatrical poster`}
            release={f.release}
            director={f.director}
            cast={f.cast}
            reverse={f.reverse ?? i % 2 === 1}
          >
            {f.body}
          </MovieBlock>
        ))}

        <Tips />
        <FAQ />
      </>
    ),
  };
}
