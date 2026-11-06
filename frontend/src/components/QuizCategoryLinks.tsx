import { Link } from "react-router-dom";
import { classicCategories } from "../games/classicCategories";
import "../quiz-categories.css";

export default function QuizCategoryLinks({ exclude }: { exclude?: string }) {
  return <nav className="hq-category-links" aria-label="Quiz categories">
    <h2>{exclude ? "Try another quiz" : "Choose a quiz category"}</h2>
    <div className="hq-category-links-grid">{classicCategories.filter(category => category.slug !== exclude).map(category =>
      <Link key={category.slug} to={`/${category.slug}`}><strong>{category.label}</strong><span>{category.summary}</span></Link>
    )}</div>
  </nav>;
}
