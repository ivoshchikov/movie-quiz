/** Fail-closed bridge to Google Privacy & messaging. No consent is inferred from geography. */
type TcfData = {
  cmpId?: number; cmpStatus?: string; gdprApplies?: boolean; eventStatus?: string;
  publisher?: { consents?: Record<string, boolean> }; tcString?: string;
};
type ConsentMode = { analyticsStoragePurposeConsentStatus?: number };
type Message = { proceed: (allowed: boolean) => void };
type GoogleFc = {
  callbackQueue: Array<Record<string, () => void>>;
  controlledMessagingFunction?: (message: Message) => void;
  getGoogleConsentModeValues?: () => ConsentMode;
  showRevocationMessage?: () => void;
};
declare global {
  interface Window {
    googlefc?: GoogleFc;
    __tcfapi?: (command: string, version: number, callback: (data: TcfData, success: boolean) => void) => void;
  }
}
export type ConsentState = {
  status: "loading" | "ready" | "unavailable";
  region: "unknown" | "europe" | "other";
  measurement: boolean; analytics: boolean; epoch: number;
  settings: boolean; deferred: boolean;
};
const initial: ConsentState = { status: "loading", region: "unknown", measurement: false, analytics: false, epoch: 0, settings: false, deferred: false };
let state = initial;
const listeners = new Set<() => void>();
const revokers = new Set<() => void>();
const preferenceKey = "hq_privacy_v1";
const optOutKey = "hq_analytics_opt_out";
const broadcastKey = "hq_privacy_reset";
const lifetime = 180 * 24 * 60 * 60 * 1000;
let started = false, apiReady = false, modeReady = false, gameActive = false;
let tc: TcfData | null = null, pendingMessage: Message | null = null;
let timeout: number | undefined;
let memoryOptOut = false;
let directivesApplied = false;
let documentChoice: { measurement: boolean; analytics: boolean } | null = null;

export const getConsent = () => state;
export const getServerConsent = () => initial;
export function subscribeConsent(callback: () => void) { listeners.add(callback); return () => { listeners.delete(callback); }; }
export function onConsentRevoked(callback: () => void) { revokers.add(callback); return () => { revokers.delete(callback); }; }
export function isPrivacyDocument(path = typeof location === "undefined" ? "" : location.pathname) { return /^\/privacy(?:\/|$|\.html$)/.test(path); }
export function consentHostAllowed() {
  if (typeof location === "undefined") return false;
  return ["hard-quiz.com", "www.hard-quiz.com"].includes(location.hostname) ||
    import.meta.env.VITE_ANALYTICS_TEST_MODE === "true" && import.meta.env.VITE_GA_ID === "G-QUIZFIXTURE" &&
    ["localhost", "127.0.0.1"].includes(location.hostname);
}
function optedOut() {
  if (memoryOptOut) return true;
  if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return true;
  try { return localStorage.getItem(optOutKey) === "1"; } catch { return false; }
}
function publish(patch: Partial<ConsentState>) {
  const next = { ...state, ...patch };
  if (optedOut() || !consentHostAllowed()) next.measurement = next.analytics = false;
  const changed = state.measurement !== next.measurement || state.analytics !== next.analytics;
  if (changed) next.epoch++;
  // Synchronous: stop active transports before React effects or CMP updates run.
  if (state.measurement && !next.measurement || state.analytics && !next.analytics) for (const callback of revokers) callback();
  if (Object.keys(next).every(key => next[key as keyof ConsentState] === state[key as keyof ConsentState])) return;
  state = next;
  for (const callback of listeners) callback();
}
function storedChoice(): { measurement: boolean; analytics: boolean } | null {
  if (documentChoice) return documentChoice;
  try {
    const value = JSON.parse(localStorage.getItem(preferenceKey) || "null");
    if (value?.version !== 1 || typeof value.measurement !== "boolean" || typeof value.analytics !== "boolean" ||
      !Number.isFinite(value.at) || Date.now() < value.at || Date.now() - value.at > lifetime) return null;
    return value;
  } catch { return null; }
}
function fail() { publish({ status: "unavailable", measurement: false, analytics: false }); }
function evaluateChoice() {
  if (!tc) return;
  if (tc.cmpId !== 300 || tc.cmpStatus !== "loaded" || typeof tc.gdprApplies !== "boolean") { fail(); return; }
  if (tc.gdprApplies) {
    if (!["tcloaded", "useractioncomplete"].includes(tc.eventStatus || "")) {
      publish({ region: "europe", measurement: false, analytics: false }); return;
    }
    const purposes = tc.publisher?.consents;
    let google: ConsentMode | undefined;
    try { if (modeReady) google = window.googlefc?.getGoogleConsentModeValues?.(); } catch { fail(); return; }
    const measurement = purposes?.[1] === true && purposes?.[8] === true;
    // 0=unknown, 2=denied, 3=not applicable and 4=not configured NEVER grant analytics.
    const analytics = measurement && purposes?.[9] === true && google?.analyticsStoragePurposeConsentStatus === 1;
    publish({ status: "ready", region: "europe", measurement, analytics });
  } else {
    // Google has confirmed the regional decision. Outside Europe, request our own
    // separate opt-in for measurement; an inapplicable TCF/Consent Mode is not an opt-in.
    const choice = storedChoice();
    publish({ status: "ready", region: "other", measurement: choice?.measurement === true,
      analytics: choice?.analytics === true, settings: state.settings || !choice });
  }
  if (timeout) window.clearTimeout(timeout);
}

export function initializeConsent() {
  if (!consentHostAllowed()) return;
  const control = new URLSearchParams(location.search).get("analytics");
  // Preserve existing opt-outs. The old ?analytics=on URL can only open choices.
  if (!directivesApplied) {
    directivesApplied = true;
    if (control === "off") withdrawAnalytics();
  }
  if (started || isPrivacyDocument() || /^\/admin(?:\/|$)/.test(location.pathname)) return;
  started = true;
  const fc = window.googlefc = window.googlefc || { callbackQueue: [] };
  fc.callbackQueue = fc.callbackQueue || [];
  fc.controlledMessagingFunction = message => {
    if (gameActive || /\/(?:play)$/.test(location.pathname) || isPrivacyDocument()) {
      pendingMessage = message; publish({ deferred: true }); return;
    }
    message.proceed(true);
  };
  fc.callbackQueue.push({ CONSENT_API_READY: () => {
    apiReady = true;
    if (!window.__tcfapi) { fail(); return; }
    window.__tcfapi("addEventListener", 0, (data, success) => {
      if (!success || !data || data.cmpStatus === "error") { tc = null; fail(); return; }
      tc = data;
      if (data.eventStatus === "cmpuishown") publish({ measurement: false, analytics: false });
      evaluateChoice();
    });
  } });
  fc.callbackQueue.push({ CONSENT_MODE_DATA_READY: () => { modeReady = true; evaluateChoice(); } });
  fc.callbackQueue.push({ CONSENT_DATA_READY: evaluateChoice });
  // Consent/preference storage is necessary to remember a privacy decision.
  window.addEventListener("storage", event => {
    if ([broadcastKey, preferenceKey, optOutKey].includes(event.key || "") || event.key === null) {
      tc = null;
      documentChoice = null;
      publish({ status: "unavailable", region: "unknown", measurement: false, analytics: false, settings: true });
    }
  });
  timeout = window.setTimeout(fail, 12000);
  const script = document.createElement("script");
  script.id = "hq-google-cmp"; script.async = true;
  // Exact standalone message tag supplied by this publisher's Privacy & messaging UI.
  // No AdSense ad loader, ad units, recovery/Offerwall message or error-protection code.
  script.src = "https://fundingchoicesmessages.google.com/i/pub-7817531684692124?ers=1";
  script.onerror = fail;
  document.head.appendChild(script);
  if (!document.querySelector('iframe[name="googlefcPresent"]')) {
    const signal = document.createElement("iframe"); signal.name = "googlefcPresent";
    signal.title = "Google privacy controls"; signal.hidden = true; document.body.appendChild(signal);
  }
  if (control === "on" || new URLSearchParams(location.search).get("privacy") === "settings") publish({ settings: true });
}

export function setConsentGameActive(value: boolean) {
  gameActive = value;
  if (!value && pendingMessage && !isPrivacyDocument()) {
    const message = pendingMessage; pendingMessage = null;
    publish({ deferred: false }); message.proceed(true);
  }
  if (!value && state.deferred && !pendingMessage) { publish({ deferred: false }); openPrivacySettings(); }
}
export function dismissPrivacySettings() { publish({ settings: false }); }
export function withdrawAnalytics() {
  memoryOptOut = true;
  documentChoice = null;
  try {
    localStorage.setItem(optOutKey, "1"); localStorage.removeItem(preferenceKey);
    localStorage.setItem(broadcastKey, String(Date.now()));
  } catch { /* Denial still applies in this document. */ }
  publish({ measurement: false, analytics: false });
  // Also clear optional identifiers left by an older client that had no consent bridge.
  for (const callback of revokers) callback();
}
export function openPrivacySettings() {
  withdrawAnalytics();
  if (gameActive) { publish({ deferred: true }); return; }
  if (isPrivacyDocument()) { location.assign("/?privacy=settings"); return; }
  initializeConsent(); publish({ settings: true });
}
export function reviewEuropeanChoices() {
  if (!apiReady || gameActive || !window.googlefc?.showRevocationMessage) return;
  tc = null;
  publish({ settings: false, measurement: false, analytics: false });
  window.googlefc.callbackQueue.push({ CONSENT_API_READY: () => window.googlefc?.showRevocationMessage?.() });
}
export function saveOutsideEuropeChoice(measurement: boolean, analytics: boolean) {
  if (state.region !== "other" || state.status !== "ready" || !tc || tc.gdprApplies !== false || gameActive) return;
  memoryOptOut = false;
  documentChoice = { measurement, analytics };
  try {
    localStorage.removeItem(optOutKey);
    localStorage.setItem(preferenceKey, JSON.stringify({ version: 1, at: Date.now(), measurement, analytics }));
    localStorage.setItem(broadcastKey, String(Date.now()));
  } catch { /* The explicit choice lasts only for this document when storage is unavailable. */ }
  publish({ measurement, analytics, settings: false });
}
export function allowEuropeanChoiceAgain() {
  memoryOptOut = false;
  try { localStorage.removeItem(optOutKey); } catch { /* Current TCF consent is still required. */ }
  reviewEuropeanChoices();
}
