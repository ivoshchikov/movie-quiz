import { isAutomatedTraffic } from "./trafficBotFilter";
import { getConsent, isPrivacyDocument, onConsentRevoked } from "../privacy/consent";
import { clearVisitorIdentity } from "./visitorIdentity";

export type AnalyticsParameters = Record<string, unknown>;
type GtagArguments =
  | [command: "consent", action: "default" | "update", parameters: AnalyticsParameters]
  | [command: "js", date: Date]
  | [command: "set", parameters: AnalyticsParameters]
  | [command: "config", id: string, parameters?: AnalyticsParameters]
  | [command: "event", name: string, parameters?: AnalyticsParameters];

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: GtagArguments) => void;
    __gaLoaded?: boolean;
    __gaLoading?: boolean;
  }
}

const browser = typeof window !== "undefined";
const GA_ID = import.meta.env?.VITE_GA_ID || import.meta.env?.VITE_GA_MEASUREMENT_ID || "";
const fixture = GA_ID === "G-QUIZFIXTURE" && import.meta.env?.VITE_ANALYTICS_TEST_MODE === "true";
const allowedHost = browser && (["hard-quiz.com", "www.hard-quiz.com"].includes(location.hostname) ||
  fixture && ["localhost", "127.0.0.1"].includes(location.hostname));
const debug = browser && new URLSearchParams(location.search).get("debug_mode") === "1";
let blocked = true, initialized = false;
let consentInitialized = false;
let lastPage: { visit: string; url: string } | null = null;

/** Keep campaign IDs and public filters; never send credentials, free text or URL fragments. */
export function analyticsPath(path: string): string {
  const url = new URL(path, location.origin);
  const safe = new URLSearchParams();
  for (const name of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
    "gclid", "dclid", "gbraid", "wbraid", "category", "difficulty", "topic", "tag", "page", "sort"]) {
    const value = url.searchParams.get(name);
    if (value != null) safe.set(name, value);
  }
  return url.pathname + (safe.size ? `?${safe}` : "");
}

function initialReferrer() {
  try {
    const ref = new URL(document.referrer);
    const authHost = new URL(import.meta.env?.VITE_SUPABASE_URL || location.origin).hostname;
    const authentication = ref.hostname === "accounts.google.com" || ref.hostname === authHost && (ref.pathname === "/" || ref.pathname.startsWith("/auth/v1/"));
    // Google ignores the referrer whenever this parameter is present, even false.
    // Strict-origin referrers from our auth host may omit /auth/v1/ entirely.
    return { page_referrer: authentication ? "" : ref.origin + ref.pathname, ...(authentication ? { ignore_referrer: true } : {}) };
  } catch { return { page_referrer: "" }; }
}
const referral = initialReferrer();
let virtualReferrer = referral.page_referrer;
export const canTrack = () => !!GA_ID && !blocked && allowedHost && getConsent().analytics && !isPrivacyDocument() && !/^\/admin(?:\/|$)/.test(location.pathname);
// First-party counts also exclude identified crawlers and browser automation.
export const canMeasureVisits = () => !blocked && allowedHost && getConsent().measurement && !isPrivacyDocument() &&
  !/^\/admin(?:\/|$)/.test(location.pathname) && !isAutomatedTraffic();
const pageContext = () => ({
  page_title: document.title,
  page_location: location.origin + analyticsPath(location.pathname + location.search),
  ...referral, page_referrer: virtualReferrer, ...(debug ? { debug_mode: true } : {}), analytics_version: 2,
});

export function setAnalyticsBlocked(value: boolean) {
  initializeConsentMode();
  blocked = value;
  if (GA_ID) Object.assign(window, { [`ga-disable-${GA_ID}`]: !canTrack() });
  window.gtag?.("consent", "update", { ...deniedConsent, analytics_storage: canTrack() ? "granted" : "denied" });
}

const deniedConsent = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  analytics_storage: "denied", personalization_storage: "denied", functionality_storage: "denied", security_storage: "granted" };
export function initializeConsentMode() {
  if (!browser || consentInitialized) return;
  consentInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- Google tag queue protocol.
    window.dataLayer.push(arguments);
  };
  if (GA_ID) Object.assign(window, { [`ga-disable-${GA_ID}`]: true });
  window.gtag("consent", "default", deniedConsent);
}
function stopAnalytics() {
  // ga-disable suppresses an already loaded Google tag, including automatic events.
  if (GA_ID) Object.assign(window, { [`ga-disable-${GA_ID}`]: true });
  window.gtag?.("consent", "update", deniedConsent);
  const loading = document.querySelector<HTMLScriptElement>('script[data-hq-analytics]');
  if (loading && !window.__gaLoaded) { loading.remove(); window.__gaLoading = false; }
  if (!window.__gaLoaded) initialized = false;
  if (!window.__gaLoaded && window.dataLayer) window.dataLayer.splice(0, window.dataLayer.length,
    ...window.dataLayer.filter(entry => Array.from(entry as IArguments)[0] === "consent"));
  lastPage = null; virtualReferrer = referral.page_referrer;
  clearVisitorIdentity();
  try { for (const key of Object.keys(sessionStorage)) if (key.startsWith("hq:analytics:v2:")) sessionStorage.removeItem(key); } catch { /* Analytics storage only. */ }
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
    for (const domain of ["", location.hostname, "." + location.hostname, ".hard-quiz.com"]) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
    }
  }
}
onConsentRevoked(stopAnalytics);

export function loadGA() {
  if (!canTrack() || window.__gaLoaded || window.__gaLoading) return;
  // Mark synchronously: StrictMode and concurrent events must share one script/config.
  window.__gaLoading = true;
  if (!initialized) {
    initialized = true;
    initializeConsentMode();
    window.gtag?.("set", { ads_data_redaction: true, url_passthrough: false });
    window.gtag?.("js", new Date());
    window.gtag?.("config", GA_ID, { ...pageContext(), send_page_view: false, allow_google_signals: false,
      allow_ad_personalization_signals: false });
  }
  const script = document.createElement("script");
  script.async = true;
  script.dataset.hqAnalytics = "true";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.onload = () => { window.__gaLoading = false; window.__gaLoaded = true; };
  script.onerror = () => { window.__gaLoading = false; script.remove(); };
  document.head.appendChild(script);
}

export function event(name: string, params: AnalyticsParameters = {}): boolean {
  if (!canTrack()) return false;
  loadGA();
  const payload: AnalyticsParameters = { ...pageContext(), ...params, analytics_version: 2 };
  // Google treats presence as debugging; false does not disable it.
  if (debug) payload.debug_mode = true;
  else delete payload.debug_mode;
  window.gtag?.("event", name, payload);
  return !!window.gtag;
}

export function pageview(path: string, visit = path) {
  if (!canTrack()) return;
  const cleanPath = analyticsPath(path), url = location.origin + cleanPath;
  if (lastPage?.visit === visit && lastPage.url === url) return;
  loadGA();
  const context = { ...pageContext(), page_location: url, page_path: cleanPath,
    page_referrer: lastPage?.url ?? referral.page_referrer };
  virtualReferrer = context.page_referrer;
  // Keep automatic events on the same sanitized virtual page as our manual page_view.
  window.gtag?.("set", context);
  if (event("page_view", context)) lastPage = { visit, url };
}

export const gaEvent = event;
