import type { CSSProperties } from "react";
import { themes, useTheme } from "../theme";
import SiteIcon from "./SiteIcon";
import "../theme-slider.css";

const labels = { light: "Light", dark: "Dark", christmas: "Christmas" };
const icons = { light: "sun", dark: "moon", christmas: "tree" } as const;

export default function ThemeSlider() {
  const { theme, setTheme } = useTheme();
  const selected = themes.find(value => value === theme) ?? "dark";
  return <div className="hq-theme-slider" style={{ "--hq-theme-position": themes.indexOf(selected) } as CSSProperties} title={`Theme: ${labels[selected]} · Light / Dark / Christmas (seasonal)`}>
    <span className="hq-theme-thumb" aria-hidden="true" />
    <span className="hq-theme-stops" aria-hidden="true">{themes.map(value => <span key={value} data-selected={theme === value}><SiteIcon name={icons[value]} /></span>)}</span>
    <input type="range" min="0" max={themes.length - 1} step="1" value={themes.indexOf(selected)} aria-label="Color theme" aria-valuetext={labels[selected]}
      onChange={event => setTheme(themes[Number(event.currentTarget.value)])} />
  </div>;
}
