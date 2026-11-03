import { RadioGroup } from "@headlessui/react";
import type { Category } from "../api";
import { categoryLabel } from "../hooks/useQuizCatalog";
import SiteIcon from "./SiteIcon";

interface Props<LevelId extends number | string> {
  categories: Category[];
  difficulties: { id: LevelId; name: string }[];
  categoryId?: number;
  difficultyId?: LevelId;
  difficultyLabel?: string;
  labelCategory?: (category: Category) => string;
  describeLevel?: (id: LevelId) => string | undefined;
  onCategoryChange: (id: number) => void;
  onDifficultyChange: (id: LevelId) => void;
}

export default function QuizFilters<LevelId extends number | string>({
  categories, difficulties, categoryId, difficultyId, difficultyLabel = "Difficulty",
  onCategoryChange, onDifficultyChange, labelCategory = categoryLabel, describeLevel,
}: Props<LevelId>) {
  return <div className="hq-filters">
    <RadioGroup value={categoryId ?? null} onChange={onCategoryChange} aria-label="Select category" className="hq-fieldset">
      <RadioGroup.Label className="hq-legend">Category</RadioGroup.Label>
      <div className="hq-category-grid">
        {categories.map(category => <RadioGroup.Option as="button" type="button" key={category.id} value={category.id} className="hq-category-option">
          {({ checked }) => <><SiteIcon name={/actor|actress/i.test(category.name) ? "people" : "film"} />
          <span><span className="hq-category-name">{labelCategory(category)}</span></span>
          {checked && <SiteIcon name="check" className="hq-category-check" />}</>}
        </RadioGroup.Option>)}
      </div>
    </RadioGroup>
    <RadioGroup value={difficultyId ?? null} onChange={onDifficultyChange} aria-label="Select level" className="hq-fieldset">
      <RadioGroup.Label className="hq-legend">{difficultyLabel}</RadioGroup.Label>
      <div className="hq-level-grid" style={{ gridTemplateColumns: `repeat(${Math.max(difficulties.length, 1)}, minmax(0, 1fr))` }}>
        {difficulties.map(level => {
          const description = describeLevel?.(level.id);
          return <RadioGroup.Option as="button" type="button" key={level.id} value={level.id} className="hq-difficulty-option"
            aria-label={description ? level.name : undefined}>
            {({ checked }) => <><span>{level.name}{description && <RadioGroup.Description as="small" className="hq-classic-level-description">{description}</RadioGroup.Description>}</span>{checked && <SiteIcon name="check" />}</>}
          </RadioGroup.Option>;
        })}
      </div>
    </RadioGroup>
  </div>;
}
