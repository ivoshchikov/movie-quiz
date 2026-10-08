const RETURN_KEY = "hq_auth_return_v1";
const RETURN_TTL = 60 * 60 * 1000;
const destinations = new Set(["/", "/daily", "/profile", "/result", "/leaderboard", "/how-to-play", "/blog", "/admin/daily"]);
const authParameters = ["access_token", "refresh_token", "provider_token", "provider_refresh_token", "code", "error", "error_code", "error_description"];
let lastConsumed: string | null = null;

export function publicSearch(search: string): string {
  const params = new URLSearchParams(search);
  for (const name of [...authParameters, "redirect"]) params.delete(name);
  const result = params.toString();
  return result ? `?${result}` : "";
}

/** Return to a known passive page on this site; never auto-start /play. */
export function safeReturnPath(candidate: unknown): string {
  if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || Array.from(candidate).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return "/";
  try {
    const url = new URL(candidate, window.location.origin);
    const pathname = decodeURIComponent(url.pathname).replace(/\/$/, "") || "/";
    if (url.origin !== window.location.origin || (!destinations.has(pathname) && !/^\/blog\/[a-z0-9-]+$/.test(pathname))) return "/";
    for (const name of [...authParameters, "redirect"]) url.searchParams.delete(name);
    return pathname + url.search + (url.hash && !/[=&]/.test(url.hash) ? url.hash : "");
  } catch { return "/"; }
}

export function loginReturnPath(location: { pathname: string; search: string; hash?: string; state?: unknown }): string {
  const state = location.state as { redirectTo?: unknown } | null;
  return safeReturnPath(state?.redirectTo ?? new URLSearchParams(location.search).get("redirect"));
}

export function rememberAuthReturn(path: string) {
  lastConsumed = null;
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ path: safeReturnPath(path), createdAt: Date.now() }));
    localStorage.removeItem("postLoginRedirectPath");
  } catch { /* The provider also receives the complete destination URL. */ }
}

export function consumeAuthReturn(): string | null {
  try {
    const raw = localStorage.getItem(RETURN_KEY);
    try { localStorage.removeItem(RETURN_KEY); } catch { /* A readable return can still be consumed once. */ }
    try { localStorage.removeItem("postLoginRedirectPath"); } catch { /* Legacy redirects are never trusted. */ }
    if (!raw || raw === lastConsumed) return null;
    lastConsumed = raw;
    const value = JSON.parse(raw) as { path?: unknown; createdAt?: unknown };
    if (typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt) || value.createdAt > Date.now() || Date.now() - value.createdAt > RETURN_TTL) return null;
    return safeReturnPath(value.path);
  } catch { return null; }
}

export function callbackMessage(code: string): string {
  if (code === "otp_expired") return "This sign-in link has expired or has already been used. Request a new link to continue.";
  if (code === "access_denied") return "Sign-in was cancelled or permission was declined. You can try again or use email.";
  return "Sign-in could not be completed. Try again or request a new email link.";
}

// Capture error codes and the presence of a callback before the SDK clears it.
const bootHash = new URLSearchParams(window.location.hash.slice(1));
const bootQuery = new URLSearchParams(window.location.search);
const bootError = bootHash.get("error_code") || bootHash.get("error") || bootQuery.get("error_code") || bootQuery.get("error");
export const callbackErrorAtBoot = bootError ? callbackMessage(bootError) : null;
export const authReturnAtBoot = bootHash.has("access_token") || bootQuery.has("code");

export function cleanCallbackErrorUrl() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  for (const name of [...authParameters, "expires_at", "expires_in", "token_type", "type"]) { url.searchParams.delete(name); hash.delete(name); }
  url.hash = hash.toString();
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}
