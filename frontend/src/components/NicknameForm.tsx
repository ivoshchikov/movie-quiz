import { useEffect, useRef, useState } from "react";
import { chooseInitialNickname } from "../api";
import { READ_TIMEOUT } from "../hooks/useReadRequest";

export default function NicknameForm({ userId, prefill = "", onSaved, onCancel, onBusyChange }: {
  userId: string; prefill?: string; onSaved: (nickname: string) => void; onCancel?: () => void; onBusyChange?: (busy: boolean) => void;
}) {
  const [nickname, setNickname] = useState(prefill);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); }; }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const nick = nickname.trim();
    if (request.current || nick.length < 3 || nick.length > 20) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), READ_TIMEOUT);
    setBusy(true); onBusyChange?.(true); setError(null);
    try {
      const confirmed = await chooseInitialNickname(userId, nick, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      try { localStorage.removeItem("pre_nickname"); } catch { /* The nickname is already confirmed. */ }
      onBusyChange?.(false); onSaved(confirmed.nickname!);
    } catch (cause: unknown) {
      if (mounted.current) setError(cause instanceof Error && cause.message === "nickname-taken" ||
        typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505"
        ? "This nickname is taken. Choose another one." : "Your nickname could not be confirmed. Try saving again.");
    } finally {
      window.clearTimeout(timeout); request.current = null;
      if (mounted.current) { setBusy(false); onBusyChange?.(false); }
    }
  };
  return <form onSubmit={save} className="flex flex-col gap-4">
    <p id="nickname-help" className="hq-status !mb-0">Your nickname appears in leaderboards. Choose 3–20 characters; it cannot be changed later.</p>
    <label className="flex flex-col gap-2 text-sm">Nickname<input className="rounded-md p-3 bg-white text-black w-full" value={nickname} onChange={event => setNickname(event.target.value)} maxLength={20} autoComplete="nickname" aria-describedby="nickname-help" disabled={busy} /></label>
    {error && <p role="alert" className="hq-status !mb-0">{error}</p>}
    <button type="submit" className="hq-primary" disabled={busy || nickname.trim().length < 3}>{busy ? "Saving…" : "Save"}</button>
    {onCancel && <button type="button" className="hq-secondary" onClick={onCancel} disabled={busy}>Cancel</button>}
  </form>;
}
