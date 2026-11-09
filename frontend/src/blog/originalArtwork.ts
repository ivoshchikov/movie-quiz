import artwork from "./originalArtwork.json";

export type OriginalArtwork = { src: string; width: number; height: number; alt: string; caption: string; listing?: string; social?: string };
const records: Record<string, OriginalArtwork> = artwork;

export function originalArtwork(id: string): OriginalArtwork {
  const image = records[id];
  if (!image) throw new Error(`Missing original editorial artwork: ${id}`);
  return image;
}
