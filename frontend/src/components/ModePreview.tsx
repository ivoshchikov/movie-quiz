import { useState } from "react";
import type { GameMode } from "../games/modes";
import SiteIcon from "./SiteIcon";

// Public images only. No question payloads, answer keys or gameplay requests.
const images = "https://vgjfbcihppxbtrjcxoci.supabase.co/storage/v1/object/public/movies/";
function Photo({ path }: { path: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="hq-preview-photo-fallback"><SiteIcon name="film" /></span>
    : <img src={images + path} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
const descriptions: Record<GameMode, string> = {
  classic: "A film still with four answer choices.",
  "time-attack": "A film still, four answer choices and one continuous countdown.",
  "this-or-that": "Two actor portraits side by side. Choose the one you prefer.",
  daily: "A daily calendar with one mystery question. Today’s question is revealed only after you start.",
};
export default function ModePreview({ mode }: { mode: GameMode }) {
  return <figure className={`hq-mode-preview hq-preview-${mode}`} aria-label={`${mode === "daily" ? "Daily" : mode === "classic" ? "Classic" : mode === "time-attack" ? "Time Attack" : "This or That"} preview: ${descriptions[mode]}`}>
    <div className="hq-preview-label" aria-hidden="true">Preview</div>
    <div className="hq-preview-scene" aria-hidden="true">
      {mode === "this-or-that" ? <div className="hq-preview-pair">
        <div><Photo path="actors/act_00001.webp" /><span>This</span></div><span className="hq-preview-or">or</span><div><Photo path="actors/act_00002.webp" /><span>That</span></div>
      </div> : mode === "daily" ? <div className="hq-preview-calendar">
        <div className="hq-preview-calendar-top"><SiteIcon name="calendar" /><span>Daily Challenge</span></div>
        <strong>?</strong><span>One question. One attempt.</span>
        <div className="hq-preview-days">{Array.from({ length: 7 }, (_, i) => <span key={i} className={i === 3 ? "is-today" : ""}>{i === 3 ? <SiteIcon name="calendar" /> : "·"}</span>)}</div>
      </div> : <div className="hq-preview-quiz">
        <div className="hq-preview-hud">{mode === "time-attack" ? <><span><SiteIcon name="timer" />01:24</span><span>+2 / −1</span></> : <><span>Which movie is this?</span><span><SiteIcon name="heart" /><SiteIcon name="heart" /><SiteIcon name="heart" /></span></>}</div>
        <div className="hq-preview-frame"><Photo path="general/g_00001.webp" /></div>
        <div className="hq-preview-answers">{["A", "B", "C", "D"].map(letter => <span key={letter}><b>{letter}</b><i /></span>)}</div>
        {mode === "time-attack" && <div className="hq-preview-clock-track"><span /></div>}
      </div>}
    </div>
    <figcaption className="sr-only">Illustration only. No game has started.</figcaption>
  </figure>;
}
