import type { CSSProperties } from "react";
import { themes, useTheme } from "../theme";
import SiteIcon from "./SiteIcon";
import "../theme-slider.css";

const labels = { light: "Light", dark: "Dark", halloween: "Halloween" };
const icons = { light: "sun", dark: "moon", halloween: "pumpkin" } as const;

export default function ThemeSlider() {
  const { theme, setTheme } = useTheme();
  return <div className="hq-theme-slider" style={{ "--hq-theme-position": themes.indexOf(theme) } as CSSProperties} title={`Theme: ${labels[theme]} · Light / Dark / Halloween (seasonal)`}>
    <span className="hq-theme-thumb" aria-hidden="true" />
    <span className="hq-theme-stops" aria-hidden="true">{themes.map(value => <span key={value} data-selected={theme === value}><SiteIcon name={icons[value]} /></span>)}</span>
    <input type="range" min="0" max="2" step="1" value={themes.indexOf(theme)} aria-label="Color theme" aria-valuetext={labels[theme]}
      onChange={event => setTheme(themes[Number(event.currentTarget.value)])} />
  </div>;
}
