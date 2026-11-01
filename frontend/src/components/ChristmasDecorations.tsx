import { useEffect, useState, type CSSProperties } from "react";
import { useTheme } from "../theme";
import { McCallisterHouse, SantaSleigh, WinterGarland, WinterGifts, WinterSanta, WinterTree } from "./ChristmasArt";
import "../christmas.css";

function ChristmasMotion({ paused }: { paused: boolean }) {
  const [snowing, setSnowing] = useState(false);
  const [sleigh, setSleigh] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        setSleigh(true);
        timer = window.setTimeout(() => { setSleigh(false); schedule(48000); }, 7000);
      }, delay);
    };
    const sync = () => {
      window.clearTimeout(timer);
      setSleigh(false);
      const active = !paused && !document.hidden && !reduced.matches;
      setSnowing(active);
      if (active) schedule(18000);
    };
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [paused]);
  return <>
    {snowing && <div className="hq-winter-snow" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => <span key={i} className={i % 6 === 0 ? "hq-winter-flake hq-winter-crystal" : "hq-winter-flake"} style={{
        "--snow-x": `${(i * 37 + 7) % 100}vw`, "--snow-drift": `${i % 3 - 1}vw`,
        "--snow-duration": `${11 + i * 7 % 13}s`, "--snow-delay": `${-(i * 5 % 23)}s`,
        "--snow-size": `${3 + i % 3}px`,
      } as CSSProperties}>
        {i % 6 === 0 && <svg viewBox="0 0 24 24" focusable="false"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>}
      </span>)}
    </div>}
    {sleigh && <div className="hq-winter-flight" aria-hidden="true"><SantaSleigh /></div>}
  </>;
}

export default function ChristmasDecorations({ compact }: { compact: boolean }) {
  const { theme } = useTheme();
  const [paused, setPaused] = useState(false);
  if (theme !== "christmas") return null;
  const motionAction = paused ? "Resume Christmas animations" : "Pause Christmas animations";
  return <div className={`hq-winter${compact ? " hq-winter-compact" : ""}`}>
    <div className="hq-winter-backdrop" aria-hidden="true">
      <WinterGarland className="hq-winter-corner-left" /><WinterGarland className="hq-winter-corner-right" />
      {!compact && <><McCallisterHouse /><WinterTree className="hq-winter-edge-tree" /></>}
    </div>
    {!compact && <>
      <ChristmasMotion paused={paused} />
      <div className="hq-winter-band">
        <div className="hq-winter-tree-gifts" aria-hidden="true"><WinterTree /><WinterGifts /></div>
        <div className="hq-winter-season"><span>Holiday movie nights</span><small>Christmas &amp; New Year at Hard Quiz</small></div>
        <div className="hq-winter-band-house" aria-hidden="true"><McCallisterHouse /></div>
        <WinterSanta />
        <button type="button" className="hq-winter-motion" aria-label={motionAction} title={motionAction} onClick={() => setPaused(value => !value)}>
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            {paused ? <path d="m7 4 9 6-9 6Z" fill="currentColor" /> : <path d="M6 4v12M14 4v12" stroke="currentColor" strokeWidth="3" />}
          </svg>
        </button>
      </div>
    </>}
  </div>;
}
