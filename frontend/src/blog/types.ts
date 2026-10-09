// src/blog/types.ts
import type { ReactNode } from "react";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;            // ISO
  tags: string[];          // e.g. ["Streaming & New Releases"]
  coverUrl?: string;       // editorial / preview image; content owns inline illustrations
  listingCoverUrl?: string; // compact cover for the article list
  archiveYear?: number;     // explicit archive marker for time-bound guides
  gallery?: string[];      // existing images available to listing fallbacks
  readingMinutes?: number; // optional
  modified?: string;       // date of a substantive editorial update
  contents?: { id: string; label: string }[];
  sources?: { label: string; url: string }[];
  content: () => ReactNode;
};
