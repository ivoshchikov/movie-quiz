export type AnalyticsParameters = Record<string, unknown>;
type GtagArguments =
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
const optOutKey = "hq_analytics_opt_out";
const optOut = (() => {
  if (!browser) return true;
  const control = new URLSearchParams(location.search).get("analytics");
  try {
    if (control === "off") localStorage.setItem(optOutKey, "1");
    if (control === "on") localStorage.removeItem(optOutKey);
    return control === "off" || localStorage.getItem(optOutKey) === "1";
  } catch { return control === "off"; }
})();
let blocked = true, initialized = false;
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
    const authentication = ref.hostname === "accounts.google.com" || ref.hostname === authHost && ref.pathname.startsWith("/auth/v1/");
    return { page_referrer: authentication ? "" : ref.origin + ref.pathname, ignore_referrer: authentication };
  } catch { return { page_referrer: "", ignore_referrer: false }; }
}
const referral = initialReferrer();
let virtualReferrer = referral.page_referrer;
const canTrack = () => !!GA_ID && !blocked && allowedHost && !optOut && !/^\/admin(?:\/|$)/.test(location.pathname);
const pageContext = () => ({
  page_title: document.title,
  page_location: location.origin + analyticsPath(location.pathname + location.search),
  ...referral, page_referrer: virtualReferrer, ...(debug ? { debug_mode: true } : {}), analytics_version: 2,
});

export function setAnalyticsBlocked(value: boolean) {
  blocked = value;
  if (GA_ID) Object.assign(window, { [`ga-disable-${GA_ID}`]: !canTrack() });
}

export function loadGA() {
  if (!canTrack() || window.__gaLoaded || window.__gaLoading) return;
  // Mark synchronously: StrictMode and concurrent events must share one script/config.
  window.__gaLoading = true;
  if (!initialized) {
    initialized = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // Google's queue uses Arguments objects, not arrays.
      // eslint-disable-next-line prefer-rest-params -- Google tag queue protocol.
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { ...pageContext(), send_page_view: false });
  }
  const script = document.createElement("script");
  script.async = true;
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
