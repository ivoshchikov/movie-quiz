// frontend/src/analytics/ga.ts
type AnalyticsParameters = Record<string, unknown>;
type GtagArguments =
  | [command: "js", date: Date]
  | [command: "config", id: string, parameters?: AnalyticsParameters]
  | [command: "event", name: string, parameters?: AnalyticsParameters];

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: GtagArguments) => void;
    __gaLoaded?: boolean;
  }
}

// поддерживаем и VITE_GA_ID, и VITE_GA_MEASUREMENT_ID
const GA_ID =
  import.meta.env.VITE_GA_ID ||
  import.meta.env.VITE_GA_MEASUREMENT_ID;

export function loadGA() {
  if (!GA_ID || window.__gaLoaded) return;

  // Заглушка + очередь
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // Keep Google's documented Arguments queue format; an array is a different command shape.
    // https://developers.google.com/tag-platform/tag-manager/datalayer
    // eslint-disable-next-line prefer-rest-params -- Compatibility with the Google tag queue protocol.
    window.dataLayer.push(arguments);
  };

  // Базовые команды (как в оф. сниппете)
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });

  // Загрузка gtag.js
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.onload = () => { window.__gaLoaded = true; };
  document.head.appendChild(s);
}

const isDebug =
  /debug_mode=1/.test(location.search) ||
  /localhost|127\.0\.0\.1/.test(location.hostname);

export function pageview(path: string) {
  if (!GA_ID) return;
  window.gtag?.('event', 'page_view', {
    page_title: document.title,
    // Layout supplies the public path without callback credentials or fragments.
    page_location: location.origin + path,
    page_path: path,
    debug_mode: isDebug,
  });
}

export function event(name: string, params: AnalyticsParameters = {}) {
  if (!GA_ID) return;
  window.gtag?.('event', name, { ...params, debug_mode: isDebug });
}

// совместимость
export const gaEvent = event;
