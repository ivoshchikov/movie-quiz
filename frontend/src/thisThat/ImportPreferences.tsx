import { useEffect, useRef, useState } from "react";
import { gameplayRpc } from "../game/server";
import { finishImport, guestPreferences, importBatch } from "./storage";
export default function ImportPreferences({ owner, onSaved }: { owner: string; onSaved: () => void }) {
  const [count, setCount] = useState(() => guestPreferences().length), [busy, setBusy] = useState(false), [error, setError] = useState(false), [done, setDone] = useState(false);
  const lock = useRef(false), alive = useRef(true), controller = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  async function save() {
    if (lock.current) return; lock.current = true; setBusy(true); setError(false);
    try { for (;;) { if (!alive.current) return; const job = importBatch(owner); if (!job) break; controller.current = new AbortController(); await gameplayRpc("this_that_import", { p_operation: job.operation, p_choices: job.items, p_owner: owner }, controller.current.signal); if (!alive.current) return; finishImport(owner, job.items); setCount(guestPreferences().length); } setDone(true); onSaved(); }
    catch { if (alive.current) setError(true); } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  if (!count && !done) return null;
  return <aside className="hq-pick-import">{done ? <p role="status">Your guest favourites are saved privately to this account.</p> : <><p>You have guest favourites on this device. Save them to your personal top? They won’t be added to the community vote, and your existing account choices take priority.</p><button className="hq-secondary" disabled={busy} onClick={() => void save()}>{busy ? "Saving favourites…" : "Save my guest favourites"}</button>{error && <p role="alert">Some favourites could not be saved. Retry to continue safely.</p>}</>}</aside>;
}
