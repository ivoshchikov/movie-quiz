import { useEffect, useId, useRef, useState } from "react";
import { chooseInitialNickname, getProfile, isNicknameTaken, NicknameSelectionError } from "../api";
import { READ_TIMEOUT } from "../hooks/useReadRequest";
import { clearNicknameDraft, nicknameDestination, nicknameDraft, storeNicknameDraft } from "../profile/nickname";
import SiteIcon from "./SiteIcon";

type Availability = { nickname: string; state: "checking" | "available" | "taken" | "error" };
type FormError = { text: string; taken?: boolean };

export default function NicknameForm({ userId, destination, onSaved, onCancel, onBusyChange }: {
  userId: string; destination: string; onSaved: (nickname: string, alreadyChosen: boolean) => void;
  onCancel: () => void; onBusyChange?: (busy: boolean) => void;
}) {
  const [nickname, setNickname] = useState(() => nicknameDraft(userId));
  const [busy, setBusy] = useState(false), [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<FormError | null>(null), [uncertain, setUncertain] = useState(false);
  const [touched, setTouched] = useState(false), [availability, setAvailability] = useState<Availability | null>(null);
  const [checkAttempt, retryCheck] = useState(0);
  const request = useRef<AbortController | null>(null), mounted = useRef(false), input = useRef<HTMLInputElement>(null);
  const id = useId(), nick = nickname.trim();
  const valid = nick.length >= 3 && nick.length <= 20;
  const checkState = valid && availability?.nickname === nick ? availability.state : valid ? "checking" : null;
  const taken = !!error?.taken || checkState === "taken";
  const lengthError = nick.length > 20 ? "Use no more than 20 characters." : touched && nick.length < 3 ? "Use at least 3 characters." : null;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); }; }, []);
  useEffect(() => { storeNicknameDraft(userId, nickname); }, [userId, nickname]);
  useEffect(() => { if (error && !busy) input.current?.focus(); }, [error, busy]);
  useEffect(() => {
    if (!valid || busy || uncertain) return;
    let active = true;
    const controller = new AbortController();
    let deadline: number | undefined;
    const fail = () => { if (active) setAvailability({ nickname: nick, state: "error" }); };
    controller.signal.addEventListener("abort", fail);
    const delay = window.setTimeout(() => {
      setAvailability({ nickname: nick, state: "checking" });
      deadline = window.setTimeout(() => controller.abort(), READ_TIMEOUT);
      isNicknameTaken(nick, userId, controller.signal).then(taken => {
        if (active && !controller.signal.aborted) setAvailability({ nickname: nick, state: taken ? "taken" : "available" });
      }).catch(fail).finally(() => window.clearTimeout(deadline));
    }, 400);
    return () => { active = false; window.clearTimeout(delay); window.clearTimeout(deadline); controller.abort(); };
  }, [nick, userId, valid, busy, uncertain, checkAttempt]);

  const finish = (confirmed: string, attempted: string) => {
    clearNicknameDraft(userId);
    onSaved(confirmed, confirmed !== attempted);
  };
  const checkSaved = async (attempted: string) => {
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), READ_TIMEOUT);
    setConfirming(true);
    try {
      const profile = await getProfile(userId, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      if (profile?.nickname) finish(profile.nickname, attempted);
      else {
        setUncertain(false);
        setError({ text: "Your nickname could not be confirmed. You can try saving again; we’ll check your profile first." });
      }
    } catch {
      if (mounted.current) {
        setUncertain(true);
        setError({ text: "We couldn’t confirm whether your nickname was saved. Check your connection, then check your saved nickname before trying again." });
      }
    } finally { window.clearTimeout(timeout); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (request.current || !valid || taken || uncertain) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), READ_TIMEOUT);
    let writing = false;
    setBusy(true); onBusyChange?.(true); setError(null);
    try {
      const confirmed = await chooseInitialNickname(userId, nick, controller.signal, () => { writing = true; });
      if (mounted.current && !controller.signal.aborted) finish(confirmed.nickname!, nick);
    } catch (cause: unknown) {
      if (!mounted.current) return;
      const kind = cause instanceof NicknameSelectionError ? cause.kind : null;
      if (kind === "taken") {
        setError({ text: "This nickname is taken. Choose another one.", taken: true });
        setAvailability({ nickname: nick, state: "taken" });
      } else if (writing) {
        window.clearTimeout(timeout); controller.abort();
        await checkSaved(nick);
      } else setError({ text: kind === "availability"
        ? "Nickname availability could not be checked. Check your connection and try again."
        : "Your profile could not be checked. Check your connection and try again." });
    } finally {
      window.clearTimeout(timeout); request.current = null;
      if (mounted.current) { setBusy(false); setConfirming(false); onBusyChange?.(false); }
    }
  };
  const retryConfirmation = async () => {
    if (request.current) return;
    setBusy(true); onBusyChange?.(true); setError(null);
    try { await checkSaved(nick); }
    finally {
      request.current = null;
      if (mounted.current) { setBusy(false); setConfirming(false); onBusyChange?.(false); }
    }
  };

  return <form className="hq-nickname-form" onSubmit={save} aria-busy={busy}>
    <div className="hq-nickname-warning" id={`${id}-warning`}><strong>Choose once. Keep it.</strong><p>Your nickname is public in leaderboards and cannot be changed later.</p></div>
    <div className="hq-nickname-field">
      <label htmlFor={`${id}-input`}>Nickname</label>
      <input id={`${id}-input`} ref={input} autoFocus data-autofocus autoComplete="nickname" autoCapitalize="off" autoCorrect="off" spellCheck={false}
        placeholder="e.g. FilmFan" value={nickname} disabled={busy}
        aria-invalid={!!lengthError || taken} aria-describedby={`${id}-rules ${id}-warning ${lengthError ? `${id}-length ` : ""}${error ? `${id}-error ` : ""}${id}-availability`}
        onBlur={() => setTouched(true)} onChange={event => { setNickname(event.target.value); setError(null); }} />
      <div className="hq-nickname-rules" id={`${id}-rules`}><span>3–20 characters. Outer spaces are removed.</span><span aria-hidden="true">{nick.length}/20</span></div>
      <div className="hq-nickname-validation">{lengthError && <p id={`${id}-length`} className="hq-nickname-error" role="alert">{lengthError}</p>}</div>
      <div id={`${id}-availability`} className={`hq-nickname-availability${checkState === "taken" ? " hq-nickname-error" : ""}`} role="status" aria-live="polite" aria-atomic="true">
        {!busy && !uncertain && valid && (checkState === "checking" ? "Checking availability…" : checkState === "available" ? "Looks available. We’ll check again when you save." : checkState === "taken" ? "This nickname is taken. Choose another one." : checkState === "error" ? <><span>Availability could not be checked.</span> <button className="hq-inline-action" type="button" onClick={() => retryCheck(value => value + 1)}>Retry check</button></> : null)}
      </div>
      {valid && <p className="hq-nickname-preview">Your player name: <strong>{nick}</strong></p>}
    </div>
    {error && <p id={`${id}-error`} className="hq-nickname-error" role="alert">{error.text}</p>}
    <p className="hq-nickname-next">After saving, you’ll return to {nicknameDestination(destination)}.{destination.split(/[?#]/)[0] === "/daily" && " Start Daily when you’re ready."}</p>
    {busy && <p className="hq-nickname-progress" role="status">{confirming ? "Checking whether your nickname was saved…" : "Checking and saving your nickname…"}</p>}
    {uncertain ? <button className="hq-primary" type="button" onClick={retryConfirmation} disabled={busy}>{busy ? "Checking…" : "Check saved nickname"}</button>
      : <button className="hq-primary" type="submit" disabled={busy || !valid || taken}>{busy ? "Saving…" : "Save and continue"}<SiteIcon name="arrow" /></button>}
    <button type="button" className="hq-nickname-later" onClick={onCancel} disabled={busy}>Choose later</button>
    <p className="hq-nickname-later-note">You can return to this step from your account menu. Daily requires a nickname.</p>
  </form>;
}
