export const GAME_MODES = [
  { key: "classic", label: "Classic", icon: "film" },
  { key: "time-attack", label: "Time Attack", icon: "timer" },
  { key: "this-or-that", label: "This or That", icon: "people" },
  { key: "daily", label: "Daily", icon: "calendar" },
] as const;
export type GameMode = typeof GAME_MODES[number]["key"];
export function gameMode(value: string | null): GameMode {
  return GAME_MODES.find(mode => mode.key === value)?.key ?? "classic";
}
