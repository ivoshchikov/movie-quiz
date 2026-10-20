import { RadioGroup } from "@headlessui/react";
import SiteIcon from "./SiteIcon";

import { GAME_MODES } from "../games/modes";
import type { GameMode } from "../games/modes";

export default function ModeSwitcher({ value, onChange, label = "Game mode" }: {
  value: GameMode; onChange: (mode: GameMode) => void; label?: string;
}) {
  return <RadioGroup value={value} onChange={onChange} aria-label={label} className="hq-mode-switcher">
    {GAME_MODES.map(mode => <RadioGroup.Option as="button" type="button" key={mode.key} value={mode.key} className="hq-mode-option">
      <SiteIcon name={mode.icon} /><span>{mode.label}</span>
    </RadioGroup.Option>)}
  </RadioGroup>;
}
