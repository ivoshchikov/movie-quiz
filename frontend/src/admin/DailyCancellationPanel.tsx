import { useEffect, useRef, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { cancelDaily } from "./dailyApi";
import type { DailyCancellation } from "./dailyApi";
import { dailyDateLabel } from "../daily/time";
import { READ_TIMEOUT } from "../hooks/useReadRequest";

export default function DailyCancellationPanel({ owner, date, today, version, status, loading, error, retry, confirmed }: {
  owner: string; date: string; today: string; version: number | undefined;
  status: DailyCancellation | undefined; loading: boolean; error: boolean;
  retry: () => void; confirmed: (value: DailyCancellation) => void;
}) {
  const [reason, setReason] = useState("");
  const [dialog, setDialog] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "unknown">("idle");
  const operation = useRef<string | null>(null);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  async function submit() {
    if (phase === "saving" || version === undefined) return;
    operation.current ??= crypto.randomUUID();
    setPhase("saving");
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), READ_TIMEOUT);
    try {
      const result = await cancelDaily(date, reason, version, operation.current, owner, abort.signal);
      if (active.current) { confirmed(result); setDialog(false); setPhase("idle"); }
    } catch {
      if (active.current) { setPhase("unknown"); retry(); }
    } finally { window.clearTimeout(timeout); }
  }
  const valid = Array.from(reason.trim()).length >= 10 && Array.from(reason.trim()).length <= 500;
  return <section className="hq-admin-section" aria-labelledby="daily-cancellation-title">
    <h2 id="daily-cancellation-title">Cancel an incorrect Daily</h2>
    <p>Use only for an incorrect question or another problem affecting everyone. The date becomes neutral: it adds no correct day and does not break streaks. Accepted answers stay in the audit history. Cancellation cannot be undone.</p>
    {loading && <p role="status">Checking cancellation status…</p>}
    {error && <p role="alert">Cancellation status is unavailable. <button className="hq-inline-action" onClick={retry}>Retry cancellation check</button></p>}
    {status?.cancelled ? <p role="status">Cancelled for everyone: {status.reason}</p> : date > today ? <p>Future dates cannot be cancelled. Change their assignment instead.</p> : <>
      <div className="hq-admin-field"><label htmlFor="daily-cancel-reason">Reason shown to players</label><textarea id="daily-cancel-reason" value={reason} disabled={phase !== "idle"} onChange={e => setReason(e.target.value)} rows={3} /></div>
      <p className="hq-admin-help">10–500 characters. Applies to {dailyDateLabel(date)}.</p>
      {phase === "unknown" && <p role="alert">Cancellation could not be confirmed. Check its status or retry the same cancellation. The reason is locked to keep this retry safe.</p>}
      <button className="hq-secondary" disabled={!valid || !status || loading || error || version === undefined || phase === "saving"} onClick={() => phase === "unknown" ? void submit() : setDialog(true)}>{phase === "saving" ? "Cancelling…" : phase === "unknown" ? "Retry same cancellation" : "Review cancellation"}</button>
    </>}
    <Dialog open={dialog} onClose={() => { if (phase !== "saving") setDialog(false); }} className="hq-admin-dialog">
      <div className="hq-admin-dialog-backdrop" aria-hidden="true" />
      <div className="hq-admin-dialog-wrap"><DialogPanel className="hq-admin-dialog-panel">
        <DialogTitle>Cancel Daily for {dailyDateLabel(date)}?</DialogTitle>
        <p>This affects every player. This date will not count as correct, and will not break a streak. This cannot be undone.</p><p>{reason.trim()}</p>
        <div className="hq-admin-dialog-actions"><button className="hq-secondary" disabled={phase === "saving"} onClick={() => setDialog(false)}>Keep Daily</button><button className="hq-primary" disabled={phase === "saving"} onClick={() => void submit()}>{phase === "saving" ? "Cancelling…" : "Confirm cancellation for everyone"}</button></div>
      </DialogPanel></div>
    </Dialog>
  </section>;
}
