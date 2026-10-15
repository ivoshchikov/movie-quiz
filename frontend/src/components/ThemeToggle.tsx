import { useTheme } from "../theme";
import SiteIcon from "./SiteIcon";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return <button type="button" className="hq-theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
    <SiteIcon name={theme === "dark" ? "sun" : "moon"} />
  </button>;
}
