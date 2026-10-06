import { RadioGroup } from "@headlessui/react";
import type { Category, DifficultyLevel } from "../api";
import { categoryLabel } from "../hooks/useQuizCatalog";
import SiteIcon from "./SiteIcon";

interface Props {
  categories: Category[];
  difficulties: DifficultyLevel[];
  categoryId?: number;
  difficultyId?: number;
  onCategoryChange: (id: number) => void;
  onDifficultyChange: (id: number) => void;
}

export default function QuizFilters({ categories, difficulties, categoryId, difficultyId, onCategoryChange, onDifficultyChange }: Props) {
  return <div className="hq-filters">
    <RadioGroup value={categoryId ?? null} onChange={onCategoryChange} aria-label="Select category" className="hq-fieldset">
      <RadioGroup.Label className="hq-legend">Category</RadioGroup.Label>
      <div className="hq-category-grid">
        {categories.map(category => <RadioGroup.Option as="button" type="button" key={category.id} value={category.id} className="hq-category-option">
          <SiteIcon name={/actor|actress/i.test(category.name) ? "people" : "film"} />
          <span><span className="hq-category-name">{categoryLabel(category)}</span><span className="hq-category-hint">{/actor|actress/i.test(category.name) ? "Recognize the faces" : "Guess from a frame"}</span></span>
        </RadioGroup.Option>)}
      </div>
    </RadioGroup>
    <RadioGroup value={difficultyId ?? null} onChange={onDifficultyChange} aria-label="Select level" className="hq-fieldset">
      <RadioGroup.Label className="hq-legend">Difficulty</RadioGroup.Label>
      <div className="hq-level-grid" style={{ gridTemplateColumns: `repeat(${Math.max(difficulties.length, 1)}, minmax(0, 1fr))` }}>
        {difficulties.map(level => <RadioGroup.Option as="button" type="button" key={level.id} value={level.id} className="hq-difficulty-option">{level.name}</RadioGroup.Option>)}
      </div>
    </RadioGroup>
  </div>;
}
