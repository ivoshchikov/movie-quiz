import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import SiteIcon from "../components/SiteIcon";
import ThemeSlider from "../components/ThemeSlider";
import "../game.css";
import Seo from "../components/Seo";
import { getPublicUrl } from "../supabase";
import type { Choice, Comparison } from "../thisThat/api";
import { uuid } from "../thisThat/api";
import { readRun } from "../thisThat/storage";
import type { Run } from "../thisThat/storage";
import { useComparison } from "../thisThat/useComparison";
import PersonalTop from "../thisThat/PersonalTop";
import "../this-that.css";
function Pair({ game, disabled, onChoose }: { game: Comparison; disabled: boolean; onChoose: (c: Choice) => void }) {
  const r = game.round!;
  const [loaded, setLoaded] = useState<boolean[]>([false, false]), [failed, setFailed] = useState(false), [imageTry, setImageTry] = useState(0), [unknown, setUnknown] = useState(false);
  const held = useRef(new Set<string>()), choose = useRef(onChoose); choose.current = onChoose;
  const ready = loaded.every(Boolean) && !failed && !disabled && r.outcome === null;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!["1", "2"].includes(e.key) || e.repeat || held.current.has(e.key)) return;
      held.current.add(e.key);
      const target = e.target as HTMLElement | null;
      if (e.ctrlKey || e.altKey || e.metaKey || target?.closest("input,textarea,select,[contenteditable=true]")) return;
      if (ready && document.visibilityState === "visible") { e.preventDefault(); choose.current(e.key === "1" ? "left" : "right"); }
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.key);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [ready]);
  return <><div className="hq-pick-cards" aria-label="Choose the actor you like more">{r.cards.map((p, i) => {
    const picked = r.winner === p.id;
    return <button key={p.id} className={`hq-pick-card${picked ? " is-picked" : ""}`} aria-label={`Choose ${p.name}`} aria-pressed={picked} disabled={!ready} onClick={() => onChoose(i ? "right" : "left")}><span className="hq-pick-portrait"><img key={imageTry} src={getPublicUrl(p.image_url) + (imageTry ? `${p.image_url.includes("?") ? "&" : "?"}retry=${imageTry}` : "")} alt={p.name} onLoad={() => setLoaded(values => values.map((v, n) => n === i || v))} onError={() => setFailed(true)} /></span><span className="hq-pick-name">{p.name}<span aria-hidden="true">{picked ? "✓" : i + 1}</span></span></button>;
  })}</div>
    {!loaded.every(Boolean) && !failed && <p role="status">Loading both photos…</p>}
    {failed && <p role="alert">A photo could not load. <button className="hq-inline-action" onClick={() => { setFailed(false); setLoaded([false, false]); setImageTry(n => n + 1); }}>Retry photos</button> or skip this pair below.</p>}
    <div className="hq-pick-feedback" role="status" aria-live="polite">{r.outcome && <><strong>{r.outcome === "withdrawn" ? "This pair was withdrawn. Your vote wasn’t counted." : r.winner ? "Choice saved" : r.outcome === "equal" ? "Both equally — saved" : "Pair skipped"}</strong>{r.community ? <span>Other players: {Math.round(r.community.left / r.community.total * 100)}% {r.cards[0].name} · {Math.round(r.community.right / r.community.total * 100)}% {r.cards[1].name}</span> : null}</>}</div>
    <div className="hq-pick-options"><button className="hq-secondary" disabled={disabled || !!r.outcome || !loaded.every(Boolean) || failed} onClick={() => onChoose("equal")}>Like both equally</button><button className="hq-text-action" aria-expanded={unknown} disabled={disabled || !!r.outcome} onClick={() => setUnknown(v => !v)}>Don’t know someone?</button><button className="hq-text-action" disabled={disabled || !!r.outcome} onClick={() => onChoose("skip")}>Skip this pair</button></div>
    {unknown && !r.outcome && <div className="hq-pick-unknown" aria-label="Who is unfamiliar?"><button className="hq-secondary" disabled={disabled} onClick={() => onChoose("unknown_left")}>Don’t know {r.cards[0].name}</button><button className="hq-secondary" disabled={disabled} onClick={() => onChoose("unknown_right")}>Don’t know {r.cards[1].name}</button><button className="hq-secondary" disabled={disabled} onClick={() => onChoose("unknown_both")}>Don’t know either</button></div>}
  </>;
}
function Session({ run }: { run: Run }) {
  const { game, busy, error, notice, choose, next, more, retry } = useComparison(run);
  const [visible, setVisible] = useState(() => document.visibilityState === "visible"), [summary, setSummary] = useState<string | null>(null);
  const nextRef = useRef(next); nextRef.current = next;
  useEffect(() => { const changed = () => setVisible(document.visibilityState === "visible"); document.addEventListener("visibilitychange", changed); return () => document.removeEventListener("visibilitychange", changed); }, []);
  const roundId = game?.round?.id, outcome = game?.round?.outcome, version = game?.version, complete = game?.complete;
  useEffect(() => {
    if (!outcome || !roundId || !visible || busy || error) return;
    const t = window.setTimeout(() => { if (document.visibilityState !== "visible") return; if (complete) setSummary(roundId); else void nextRef.current(); }, 1200);
    return () => window.clearTimeout(t);
  }, [roundId, outcome, version, complete, visible, busy, error]);
  const showSummary = game?.complete && summary === game.round?.id;
  return <section className="hq-panel hq-pick-play" aria-busy={busy}>
    <header className="hq-pick-play-heading"><Link className="hq-text-action" to="/this-or-that">← This or That</Link><p aria-live="polite">{game?.round ? `Pair ${game.round.number} of 10` : "Your next pair"}</p></header>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">Your last action could not be confirmed. <button className="hq-inline-action" disabled={busy} onClick={() => void retry()}>Retry</button> Your accepted choices are saved.</p>}
    {!game && !error && <p role="status">Preparing your pair…</p>}
    {game && (showSummary ? <div className="hq-pick-summary"><h1>Ten pairs. All yours.</h1><p>{game.summary.choices} {game.summary.choices === 1 ? "favourite chosen" : "favourites chosen"}. {10 - game.summary.choices} {10 - game.summary.choices === 1 ? "pair" : "pairs"} left neutral. Every choice was saved along the way.</p><PersonalTop id={game.id} owner={game.owner} refresh={game.version} /><div className="hq-pick-summary-actions"><button className="hq-primary" disabled={busy || error} onClick={() => void more()}>Another 10 pairs</button><Link className="hq-secondary" to="/">Choose another game</Link><Link className="hq-text-action" to="/leaderboard?mode=this-or-that">See community favourites</Link></div></div> : game.round ? <><h1 className="hq-pick-question">Who do you like more?</h1><Pair key={game.round.id} game={game} disabled={busy || error || !visible} onChoose={c => void choose(c)} />{busy && <p role="status">{game.round.outcome ? "Preparing the next pair…" : "Saving your choice…"}</p>}{!game.round.outcome && <p className="hq-pick-keyboard">You can also press 1 or 2 to choose.</p>}</> : <p>Your next pair is being prepared. <button className="hq-inline-action" onClick={() => void retry()}>Retry pair</button></p>)}

  </section>;
}
function PlaySession({ owner }: { owner: string | null }) {
  const location = useLocation();
  const [run] = useState(() => {
    const saved = readRun(owner); if (saved) return saved;
    const candidate = (location.state as { run?: Run } | null)?.run;
    return candidate && uuid(candidate.id) && candidate.owner === owner && ["actors", "actresses"].includes(candidate.board) ? candidate : null;
  });
  return run ? <Session run={run} /> : <section className="hq-panel hq-pick-panel"><h1>Ready to choose?</h1><p>Start a set of random actor pairs.</p><Link className="hq-primary" to="/this-or-that">Choose my first pair</Link></section>;
}
export default function ThisThatPlayPage() {
  const { user, loading, error, retrySession } = useAuth();
  return <div className="hq-pick-page"><header className="hq-play-header"><Link to="/" className="hq-brand"><span className="hq-brand-mark"><SiteIcon name="cinema" /></span><span className="hq-brand-label">Hard Quiz</span></Link><div className="hq-play-actions"><ThemeSlider /></div></header><Seo title="This or That — Your choices | Hard Quiz" noindex />{loading ? <p role="status">Checking account…</p> : error ? <p role="alert">Your account could not be checked. <button className="hq-inline-action" onClick={retrySession}>Retry sign-in check</button></p> : <PlaySession key={user?.id ?? "guest"} owner={user?.id ?? null} />}</div>;
}
