import { Link } from "react-router-dom";
import type { GameMode } from "../games/modes";

const links = [
  { mode: "classic", to: "/", label: "Classic quiz" },
  { mode: "time-attack", to: "/time-attack", label: "Time Attack" },
  { mode: "this-or-that", to: "/this-or-that", label: "This or That" },
  { mode: "daily", to: "/daily", label: "Daily Challenge" },
] as const;

/** Ordinary links expose each landing page without starting a game. */
export default function GameModeLinks({ current }: { current: GameMode }) {
  return <nav className="hq-game-mode-links" aria-label="More games">
    <span>More games</span>
    {links.filter(link => link.mode !== current).map(link => <Link key={link.mode} to={link.to}>{link.label}</Link>)}
  </nav>;
}
