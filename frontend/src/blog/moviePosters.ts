import posters from "./moviePosters.json";

export type MoviePoster = { src: string; width: number; height: number; title: string; alt: string; storeUrl: string };
const records: Record<string, MoviePoster | null> = posters;

/** A reviewed absence is intentional; an unknown slot is a publication error. */
export function moviePoster(id: string): MoviePoster | null {
  if (!Object.prototype.hasOwnProperty.call(records, id)) throw new Error(`Unreviewed movie poster slot: ${id}`);
  return records[id];
}
