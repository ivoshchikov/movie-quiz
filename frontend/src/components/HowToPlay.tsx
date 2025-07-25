// frontend/src/components/HowToPlay.tsx
import { Link } from "react-router-dom";
import Seo from "./Seo";

/**
 * Страница «Как играть» — базовые правила и демонстрашка.
 * GIF/SVG/PNG положи в `public/how-to-play.webp` (или .png).
 */
export default function HowToPlay() {
  return (
    <>
      <Seo
        title="How to play | Hard Quiz"
        description="Learn the rules of Hard Quiz: time limits, lives, scoring and difficulties."
      />

      <div className="prose prose-invert lg:prose-lg mx-auto px-4 py-8 leading-relaxed">
        <h1 className="mb-4 font-extrabold">How&nbsp;to&nbsp;play</h1>

        <p>
          Your goal is simple: <strong>guess the movie by its poster</strong>{' '}
          before the timer reaches zero. Each quiz has&nbsp;4 options —
          only&nbsp;one is correct.
        </p>

        {/* демонстрационный Webp */}
        <img
          src="/how-to-play.webp"
          alt="Gameplay demonstration of Hard Quiz"
          className="rounded-xl shadow-lg my-8 w-full max-w-3xl mx-auto"
        />

        <h2>Rules</h2>
        <ul>
          <li>🕑 Time limit &nbsp;— defined by difficulty level.</li>
          <li>❤️ Lives &nbsp;— every wrong answer costs <em>one</em>.</li>
          <li>✨ Score &nbsp;— +1 for each correct poster in a row.</li>
          <li>🚫 No skips – think fast!</li>
        </ul>

        <h2>Difficulty levels</h2>
        <p>
          • <b>Easy</b> — 30 s per poster, 5 lives<br />
          • <b>Normal</b> — 20 s, 3 lives<br />
          • <b>Hard</b> — 15 s, 2 lives
        </p>

        <h2>Tips</h2>
        <ol className="list-decimal pl-6">
          <li>Don’t overthink the first instinct — go with your gut.</li>
          <li>Use category filters on the start screen to play to your strengths.</li>
          <li>Wrong answer? Focus, you still have time for a come-back.</li>
        </ol>

        <div className="mt-10 flex gap-4">
          <Link to="/" className="btn-primary">
            Back to start
          </Link>
        </div>
      </div>
    </>
  );
}
