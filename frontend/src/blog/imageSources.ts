import manifest from "./responsiveImages.json";

type ImageSources = { src: string; srcSet: string; width: number; height: number };
const images: Record<string, ImageSources> = manifest;

/** Keep editorial source URLs intact; serve existing images at display sizes. */
export function responsiveImage(src: string): { src: string; srcSet?: string; width?: number; height?: number } {
  return images[src] ?? { src };
}

export const articleImageSizes = "(max-width: 620px) calc(100vw - 36px), (max-width: 800px) calc(100vw - 48px), (max-width: 832px) calc(100vw - 72px), 760px";
export const listingImageSizes = "(max-width: 580px) calc(100vw - 36px), (max-width: 620px) calc((100vw - 54px) / 2), (max-width: 800px) calc((100vw - 66px) / 2), (max-width: 850px) calc((100vw - 90px) / 2), (max-width: 1016px) calc((100vw - 108px) / 3), 303px";
