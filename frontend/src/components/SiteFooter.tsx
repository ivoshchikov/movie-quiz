import { NavLink } from "react-router-dom";
import { PrivacySettingsButton } from "../privacy/PrivacyControls";

export default function SiteFooter() {
  return <footer className="hq-footer"><div className="hq-shell hq-footer-inner">
    <span>© {new Date().getFullYear()} Hard Quiz</span>
    <nav className="hq-footer-links" aria-label="Site information">
      <NavLink to="/how-to-play">How to play</NavLink>
      <NavLink to="/about">About</NavLink>
      <a href="/privacy">Privacy Policy</a>
      <NavLink to="/contact">Contact</NavLink>
      <PrivacySettingsButton />
    </nav>
  </div></footer>;
}
