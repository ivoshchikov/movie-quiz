import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { rememberAuthReturn, safeReturnPath } from "../auth/redirect";
import { EMAIL_COOLDOWN_MS, authRequestMessage, emailOutcomeUnknown, withAuthTimeout } from "../auth/requests";
import SiteIcon from "./SiteIcon";
import "../login.css";

// Memory only: reopening a form still observes its email request cooldown.
const cooldowns = new Map<string, number>();
export default function LoginForm({ returnPath, onClose }: { returnPath: string; onClose?: () => void }) {
  const auth = useAuth();
  const [email, setEmail] = useState(""), [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "email" | null>(null), [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now()), [deadline, setDeadline] = useState(0);
  const mounted = useRef(false), request = useRef(0), locked = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null), success = useRef<HTMLDivElement>(null);
  const id = useId(), destination = safeReturnPath(returnPath);
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const blocked = !!busy || auth.loading || !!auth.user;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => { const time = Date.now(); setNow(time); if (time >= deadline) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  useEffect(() => { if (sentTo) success.current?.focus(); }, [sentTo]);

  const start = async (kind: "email" | "google") => {
    if (locked.current || blocked) return;
    const address = email.trim(), key = address.toLowerCase();
    if (kind === "email") {
      const remaining = cooldowns.get(key) || 0;
      if (remaining > Date.now()) { setDeadline(remaining); setNow(Date.now()); return; }
      if (!address || (!sentTo && !emailInput.current?.checkValidity())) { emailInput.current?.reportValidity(); return; }
    }
    locked.current = true;
    const token = ++request.current;
    setBusy(kind); setError(null); auth.clearCallbackError();
    if (kind === "email") {
      for (const [entry, until] of cooldowns) if (until <= Date.now()) cooldowns.delete(entry);
      const until = Date.now() + EMAIL_COOLDOWN_MS;
      cooldowns.set(key, until); setDeadline(until); setNow(Date.now());
    }
    rememberAuthReturn(destination);
    const absolute = window.location.origin + destination;
    try {
      if (kind === "google") {
        const url = await withAuthTimeout(auth.signInWithGoogle(absolute));
        if (mounted.current && token === request.current) window.location.assign(url);
      } else {
        await withAuthTimeout(auth.signInWithEmail(address, absolute));
        const until = Date.now() + EMAIL_COOLDOWN_MS;
        cooldowns.set(key, until);
        if (mounted.current && token === request.current) { setSentTo(address); setDeadline(until); setNow(Date.now()); }
      }
    } catch (cause) {
      if (kind === "email" && (emailOutcomeUnknown(cause) || (cause as { status?: number })?.status === 429)) {
        const until = Date.now() + EMAIL_COOLDOWN_MS;
        cooldowns.set(key, until);
        if (mounted.current && token === request.current) { setDeadline(until); setNow(Date.now()); }
      } else if (kind === "email") { cooldowns.delete(key); if (mounted.current && token === request.current) setDeadline(0); }
      if (mounted.current && token === request.current) setError(authRequestMessage(cause, kind === "email"));
    } finally {
      if (mounted.current && token === request.current) { locked.current = false; setBusy(null); }
    }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void start("email"); };
  const changeEmail = () => { setSentTo(null); setError(null); setDeadline(cooldowns.get(email.trim().toLowerCase()) || 0); setNow(Date.now()); requestAnimationFrame(() => emailInput.current?.focus()); };

  return <div className="hq-login-form">
    {auth.error ? <div className="hq-login-notice" role="alert"><p>{auth.error}</p><button className="hq-inline-action" onClick={auth.retrySession}>Retry sign-in check</button></div>
      : auth.loading ? <p className="hq-login-status" role="status">Checking your sign-in status…</p> : null}
    {(error || auth.callbackError) && <p className="hq-login-error" id={`${id}-error`} role="alert">{error || auth.callbackError}</p>}
    {sentTo ? <div className="hq-login-sent" ref={success} tabIndex={-1} role="status" aria-live="polite">
      <span className="hq-login-symbol"><SiteIcon name="user" /></span>
      <h2>Check your email</h2><p>We sent a sign-in link to <strong>{sentTo}</strong>.</p>
      <p>Open the link to finish signing in. If it hasn’t arrived, check Spam or Junk.</p>
      <button className="hq-primary" disabled={blocked || seconds > 0} onClick={() => void start("email")}>{busy === "email" ? "Sending…" : "Resend link"}</button>
      {seconds > 0 && <p className="hq-login-cooldown">Wait {seconds}s before requesting another link.</p>}
      <button className="hq-inline-action" disabled={blocked} onClick={changeEmail}>Use another email</button>
      <button className="hq-secondary hq-secondary-wide" disabled={blocked} onClick={() => void start("google")}>{busy === "google" ? "Connecting…" : "Continue with Google"}</button>
    </div> : <>
      <button className="hq-primary" disabled={blocked} onClick={() => void start("google")}><svg className="hq-login-google" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M43.61 24.46c0-1.36-.12-2.67-.35-3.93H24v7.43h10.99a9.4 9.4 0 0 1-4.08 6.17v5h6.62c3.86-3.55 6.08-8.78 6.08-14.67ZM24 44c5.4 0 9.92-1.79 13.23-4.87l-6.62-5c-1.79 1.2-4.07 1.92-6.61 1.92-5.2 0-9.6-3.5-11.17-8.21H6v5.19A20 20 0 0 0 24 44ZM12.83 27.84a12 12 0 0 1 0-7.68v-5.19H6a20 20 0 0 0 0 18.06l6.83-5.19ZM24 11.95c2.94 0 5.57 1.01 7.64 2.98l5.73-5.73C33.92 5.96 29.4 4 24 4A20 20 0 0 0 6 14.97l6.83 5.19C14.4 15.45 18.8 11.95 24 11.95Z" /></svg><span>{busy === "google" ? "Connecting…" : "Continue with Google"}</span></button>
      <div className="hq-login-divider"><span>or use email</span></div>
      <form onSubmit={submit} aria-label="Email sign-in" aria-busy={busy === "email"}>
        <label htmlFor={`${id}-email`}>Email</label>
        <input ref={emailInput} id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={email} disabled={blocked} required maxLength={254}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`} onChange={event => { setEmail(event.target.value); setError(null); setDeadline(cooldowns.get(event.target.value.trim().toLowerCase()) || 0); setNow(Date.now()); }}
          onBlur={() => setEmail(value => value.trim())} />
        <p id={`${id}-help`} className="hq-login-help">We’ll email you a sign-in link. No password needed.</p>
        <button type="submit" className="hq-secondary hq-secondary-wide" disabled={blocked || !email.trim() || seconds > 0}>{busy === "email" ? "Sending…" : "Send sign-in link"}</button>
        {seconds > 0 && <p className="hq-login-cooldown">Wait {seconds}s before requesting another link.</p>}
      </form>
    </>}
    {destination === "/result" && <p className="hq-login-help hq-login-result-note">Sign in to save your next quizzes. Your previous guest result stays on this device.</p>}
    <div className="hq-login-bottom"><Link to="/" onClick={onClose}>Play as a guest <SiteIcon name="arrow" /></Link>{onClose && <button onClick={onClose}>Cancel</button>}</div>
  </div>;
}
