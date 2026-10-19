import { Link } from "react-router-dom";
export default function ThisThatIntro() {
  return <header className="hq-pick-intro"><p className="hq-eyebrow">Two faces. Your choice.</p><h1>This or That</h1><p>Which actor do you like more? Go with your instinct and help shape the community’s favourites.</p><ul className="hq-pick-rules"><li><strong>10 pairs</strong>A little set, whenever you like</li><li><strong>Your taste</strong>No right or wrong answers</li><li><strong>No timer</strong>Take a moment. Pick a favourite.</li></ul><p>Every pair is random. Choose a face and the next pair appears automatically. Like both equally, don’t know someone, or want to skip? There’s a choice for that too. <Link className="hq-inline-action" to="/how-to-play#this-or-that">How it works</Link></p></header>;
}
