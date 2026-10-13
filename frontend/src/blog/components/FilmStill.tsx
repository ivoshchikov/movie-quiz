import ArticleImage from "./ArticleImage";

type Props = { src: string; alt: string; width: number; height: number; caption: string };

export default function FilmStill({ caption, ...image }: Props) {
  return <figure className="hq-film-still" style={{ maxWidth: Math.round(image.width / image.height * 360) }}>
    <ArticleImage {...image} />
    <figcaption>{caption}</figcaption>
  </figure>;
}
