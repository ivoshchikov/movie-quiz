import frames from "../filmFrames.json";
import ExternalLink from "./ExternalLink";

export type FilmFrameId = keyof typeof frames;

export default function FilmFrameCredit({ id, cropped = false }: { id: FilmFrameId; cropped?: boolean }) {
  const frame = frames[id];
  return <><ExternalLink href={frame.sourcePage}>{frame.title}</ExternalLink>, © {frame.creator}, <ExternalLink href={frame.licenseUrl}>CC BY 3.0</ExternalLink>. Resized and compressed{cropped ? "; centered crops shown" : ""}.</>;
}
