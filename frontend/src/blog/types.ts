// src/blog/types.ts
import type { ReactNode } from "react";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;            // ISO
  tags: string[];          // e.g. ["Streaming & New Releases"]
  coverUrl?: string;       // optional 16:9 (если нет — на странице поста покажем коллаж)
  listingCoverUrl?: string; // compact cover for the article list
  archiveYear?: number;     // explicit archive marker for time-bound guides
  gallery?: string[];      // список постеров для коллажа и/или внутри поста
  readingMinutes?: number; // optional
  content: () => ReactNode;
};
