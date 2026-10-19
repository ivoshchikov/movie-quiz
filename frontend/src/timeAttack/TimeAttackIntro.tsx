import { Link } from "react-router-dom";

export default function TimeAttackIntro() {
  return <header className="hq-attack-intro">
    <p className="hq-eyebrow">Every second counts</p><h1>Time Attack</h1>
    <p>How many movies or faces can you recognize before the clock runs out?</p>
    <ul className="hq-attack-rules"><li><strong>+2 points</strong>Correct answer</li><li><strong>−1 point</strong>Wrong answer</li><li><strong>−3 seconds</strong>Skip a question</li></ul>
    <p>Easy: 120 seconds · Medium: 90 seconds · Hard: 60 seconds. No lives, no repeated questions, and your score can go below zero.</p>
    <p>All levels use the same mix of question difficulties. The clock keeps running during loading, feedback and time away. An unanswered final question costs no points. <Link className="hq-inline-action" to="/how-to-play#time-attack">All rules</Link></p>
  </header>;
}
