import type { ReactNode } from "react";
import { useTheme } from "../theme";
import "../halloween.css";

const art = {
  web: <g fill="none" stroke="currentColor" strokeWidth="1"><path d="M1 1h78M1 1v78M1 1l78 78M1 1l78 32M1 1l32 78M1 1l78 13M1 1l13 78" /><path d="M1 19q8-4 15-3t3-15M1 39q12-5 15-3 10-14 20-20-2-8 3-15M1 59q12-5 22-4 7-16 14-18 2-7 18-14-1-10 4-22M1 79q14-5 31-4 4-15 18-25 10-14 25-18-1-17 4-31" /></g>,
  spider: <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M40 0v26m-6 9-12-7-7 6m18 6-15-1-7 8m23 0-13 7-3 10m28-29 12-7 7 6m-18 6 15-1 7 8m-23 0 13 7 3 10" fill="none" /><ellipse cx="40" cy="44" rx="12" ry="16" fill="currentColor" /><circle cx="36" cy="39" r="2" fill="#ffbc78" stroke="none" /><circle cx="44" cy="39" r="2" fill="#ffbc78" stroke="none" /></g>,
  pumpkin: <><path d="M39 22c-9-13-33-3-31 20-2 24 19 31 31 24 13 7 35 0 32-24 2-23-22-33-32-20Z" fill="#d66a2b" stroke="#ffbc78" strokeWidth="2" /><path d="M39 24c-5-12 0-17 8-18m-11 18c-13-2-18 34 0 42m7-42c14-2 18 34 0 42" fill="none" stroke="#ffbc78" strokeWidth="2" /><path d="m22 35 10 10H19Zm35 0 4 10H48ZM22 51l10 6 7-4 8 4 11-6-6 11H28Z" fill="#26132c" /></>,
  potion: <><path d="M30 10h20v8h-4v17l19 24c8 14-3 17-25 17S7 73 15 59l19-24V18h-4Z" fill="#372343" stroke="#c2a0de" strokeWidth="2" /><path d="M24 49c10 5 21-4 32 0l7 13c3 8-7 9-23 9s-26-1-23-9Z" fill="#8fc481" /><path d="m31 10-2-7h22l-2 7" fill="#b77d50" /><circle cx="37" cy="59" r="3" fill="#d7efac" /><circle cx="49" cy="52" r="2" fill="#d7efac" /></>,
  cauldron: <><path d="M13 42h54c3 28-9 33-27 33S10 70 13 42Z" fill="#302039" stroke="#bb98d2" strokeWidth="2" /><ellipse cx="40" cy="42" rx="28" ry="7" fill="#8fc481" stroke="#bb98d2" strokeWidth="2" /><path d="M13 47C0 43 0 62 14 62m53-15c13-4 13 15-1 15M21 72l-3 7m41-7 3 7M31 31c-12-9 12-11 0-22m18 22c-10-7 10-9 0-18" fill="none" stroke="#bb98d2" strokeWidth="2" /><circle cx="40" cy="30" r="3" fill="#b7db8e" /><circle cx="57" cy="18" r="4" fill="#b7db8e" /></>,
  witch: <><path d="M10 63 73 48m-10 3 9-9m-9 9 14 1m-14-1 12 7" stroke="#d7aa6f" strokeWidth="3" strokeLinecap="round" /><path d="m31 44 16-17 9 27-24 4 7-12-13-1Z" fill="#b295d2" /><path d="m41 28 8-8 9 8 7 3-9 3-7 8Z" fill="#f0c4a7" /><path d="M31 27 47 4l6 10-4-1 8 14Z" fill="#593b70" stroke="#c2a0de" strokeWidth="1.5" /><path d="M30 28h31m-16 8-9 8m11 8 6 9-9 2" fill="none" stroke="#c2a0de" strokeWidth="3" strokeLinecap="round" /><path d="m10 19 2-4 2 4 4 2-4 2-2 4-2-4-4-2Zm57-7 2-4 2 4 4 2-4 2-2 4-2-4-4-2Z" fill="#ffbc78" /></>,
  skeleton: <g fill="none" stroke="#ded1c4" strokeWidth="2.5" strokeLinecap="round"><path d="M26 20c-1-22 29-22 28 0v7l-8 5H34l-8-5ZM40 32v30m-12-24 24 0m-24 8 24 0m-24 8 24 0m-23-17-9 7-2 16m35-23 9 7 2 16M40 61 29 71l-5 8m16-18 11 10 5 8m-20-63-5-1m13 1 5-1m-13 8h8m-6-3 2-2 2 2" /><circle cx="33" cy="16" r="3" fill="#ded1c4" /><circle cx="47" cy="16" r="3" fill="#ded1c4" /></g>,
  bat: <path d="M39 33 34 25l-2 11C20 20 9 23 3 15c1 16 0 26 12 32 1-10 12-5 11 4 6-6 10-3 14 4 4-7 8-10 14-4-1-9 10-14 11-4 12-6 11-16 12-32-6 8-17 5-29 21l-2-11-5 8Z" fill="currentColor" />,
} satisfies Record<string, ReactNode>;

function Glyph({ name, className = "" }: { name: keyof typeof art; className?: string }) {
  return <svg className={`hq-haunt-glyph ${className}`} viewBox="0 0 80 80" aria-hidden="true" focusable="false">{art[name]}</svg>;
}

export default function HalloweenDecorations({ compact }: { compact: boolean }) {
  const { theme } = useTheme();
  if (theme !== "halloween") return null;
  return <div className={`hq-haunt${compact ? " hq-haunt-compact" : ""}`} aria-hidden="true">
    <div className="hq-haunt-edges"><Glyph name="web" className="hq-haunt-web-left" /><Glyph name="web" className="hq-haunt-web-right" /><Glyph name="spider" className="hq-haunt-spider" /><Glyph name="skeleton" className="hq-haunt-skeleton" /><Glyph name="witch" className="hq-haunt-witch" /><Glyph name="bat" className="hq-haunt-bat" /></div>
    {!compact && <div className="hq-haunt-band"><div className="hq-haunt-still-life"><Glyph name="potion" /><Glyph name="cauldron" /></div><div className="hq-haunt-season"><Glyph name="pumpkin" /><span>Halloween at Hard Quiz<small>A little spooky. A lot of cinema.</small></span></div><div className="hq-haunt-still-life"><Glyph name="skeleton" /><Glyph name="witch" /></div></div>}
  </div>;
}
