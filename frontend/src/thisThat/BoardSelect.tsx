import { RadioGroup } from "@headlessui/react";
import SiteIcon from "../components/SiteIcon";
import { boards, boardName } from "./boards";
import type { Board } from "./boards";
import "../time-attack.css";

export default function BoardSelect({ value, onChange }: { value: Board; onChange: (board: Board) => void }) {
  return <RadioGroup value={value} onChange={onChange} aria-label="This or That category">
    <RadioGroup.Label className="hq-legend">Category</RadioGroup.Label>
    <div className="hq-attack-choices hq-pick-categories">{boards.map(board =>
      <RadioGroup.Option as="button" type="button" key={board} value={board} className="hq-category-option">
        {({ checked }) => <><span>{boardName(board)}</span>{checked && <SiteIcon name="check" />}</>}
      </RadioGroup.Option>)}
    </div>
  </RadioGroup>;
}
