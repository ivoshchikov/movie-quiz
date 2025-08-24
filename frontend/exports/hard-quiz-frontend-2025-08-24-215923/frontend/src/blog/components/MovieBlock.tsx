// src/blog/components/MovieBlock.tsx
import React, { ReactNode } from "react";
import { useRegisterPoster } from "./GalleryCollector";

type Props = {
  title: string;
  posterUrl: string;
  alt: string;
  release: string;          // e.g. "August 8, 2025 (US)"
  director?: string;
  cast?: string[];          // optional
  reverse?: boolean;        // poster on the right (desktop)
  children?: ReactNode;     // main description
};

export default function MovieBlock({
  title,
  posterUrl,
  alt,
  release,
  director,
  cast,
  reverse,
  children,
}: Props) {
  // Автоматически регистрируем постер для коллажа обложки
  useRegisterPoster(posterUrl);

  return (
    <section className="mt-8">
      <div className="grid gap-4 md:gap-6 md:grid-cols-[320px,1fr]">
        {/* POSTER */}
        <figure
          className={`rounded-xl border border-white/10 bg-black/20 p-2 ${
            reverse ? "md:order-2" : ""
          }`}
        >
          <img
            src={posterUrl}
            alt={alt}
            className="h-auto w-full rounded-lg object-contain"
            style={{ aspectRatio: "2 / 3" }}
            loading="lazy"
          />
          <figcaption className="mt-2 px-1 text-xs opacity-70">{title}</figcaption>
        </figure>

        {/* INFO */}
        <div className={`${reverse ? "md:order-1" : ""}`}>
          <h2 className="text-2xl font-semibold">{title}</h2>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-80">
            <div>
              <span className="opacity-70">Release:&nbsp;</span>
              {release}
            </div>
            {director && (
              <div>
                <span className="opacity-70">Director:&nbsp;</span>
                {director}
              </div>
            )}
            {cast && cast.length > 0 && (
              <div>
                <span className="opacity-70">Cast:&nbsp;</span>
                {cast.join(", ")}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="prose prose-invert mt-3 max-w-none">{children}</div>
        </div>
      </div>
    </section>
  );
}
