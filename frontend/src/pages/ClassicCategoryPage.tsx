import { Link } from "react-router-dom";
import { ClassicSetup } from "../components/StartScreen";
import Seo from "../components/Seo";
import ModePreview from "../components/ModePreview";
import GameModeLinks from "../components/GameModeLinks";
import QuizCategoryLinks from "../components/QuizCategoryLinks";
import { categoryMetadata, type ClassicCategory } from "../games/classicCategories";
import "../quiz-categories.css";

export default function ClassicCategoryPage({ category }: { category: ClassicCategory }) {
  return <div className="hq-category-page"><Seo {...categoryMetadata(category)} />
    <nav className="hq-category-breadcrumb" aria-label="Breadcrumb"><Link to="/">Quiz games</Link><span aria-hidden="true">/</span><span aria-current="page">{category.label}</span></nav>
    <header className="hq-hero"><h1>{category.heading}</h1><p>{category.intro}</p></header>
    <section className="hq-panel hq-mode-panel" aria-labelledby="category-play-title">
      <div className="hq-mode-content"><header className="hq-mode-heading"><h2 id="category-play-title">Play {category.label}</h2><p>Choose a difficulty. Your quiz starts when you press Play.</p></header><ClassicSetup key={category.slug} fixedCategoryName={category.catalogName} /></div>
      <ModePreview mode="classic" questionLabel="Example question" />
    </section>
    <div className="hq-category-guide">
      <section aria-labelledby="category-how-title"><h2 id="category-how-title">How to play</h2><ol><li>Choose Easy, Medium or Hard. The setup shows the current time limit and lives for each level.</li><li>Look at the image and choose one of four answers before Time left reaches zero.</li><li>Earn one point for a correct answer. A wrong answer or a timeout costs one life. Your run ends when you run out of lives, finish the available questions or exit.</li></ol><p>All Classic levels use the same questions within your category. Sign in before starting if you want to save an eligible record.</p><Link className="hq-inline-action" to="/how-to-play#classic">Full Classic rules and scoring</Link></section>
      <section aria-labelledby="category-guide-title"><h2 id="category-guide-title">{category.guideHeading}</h2>{category.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<ul>{category.tips.map(tip => <li key={tip}>{tip}</li>)}</ul></section>
      <section aria-labelledby="category-questions-title"><h2 id="category-questions-title">Before you play</h2>{category.questions.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
    </div>
    <QuizCategoryLinks exclude={category.slug} /><GameModeLinks current="classic" />
  </div>;
}
