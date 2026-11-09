import frames from "../filmFrames.json";

export type FilmFrameId = keyof typeof frames;

export default function FilmFrameCredit({ id, cropped = false }: { id: FilmFrameId; cropped?: boolean }) {
  const frame = frames[id];
  return <><a href={frame.sourcePage}>{frame.title}</a>, © {frame.creator}, <a href={frame.licenseUrl}>CC BY 3.0</a>. Resized and compressed{cropped ? "; centered crops shown" : ""}.</>;
}
