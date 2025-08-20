// frontend/src/analytics/ga.ts
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    __gaLoaded?: boolean;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

function push(...args: any[]) {
  window.dataLayer.push(args);
}

export function loadGA() {
  if (!GA_ID || window.__gaLoaded) return;

  // 1) stub + dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: any[]) => push(...args);

  // 2) базовые команды сразу в очередь
  push("js", new Date());
  push("consent", "default", {
    analytics_storage: "granted",
    functionality_storage: "granted",
    security_storage: "granted",
  });
  push("config", GA_ID, { send_page_view: false });

  // 3) загрузка реального gtag.js
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.onload = () => {
    // дублируем config уже после загрузки на всякий случай
    window.gtag("config", GA_ID, { send_page_view: false });
    window.__gaLoaded = true;

    // если роутер ещё не отправил первый view — отправим сами
    if (!(window as any).__firstPageviewSent) {
      pageview(location.pathname + location.search);
    }
  };
  document.head.appendChild(s);
}

const isDebug =
  /debug_mode=1/.test(location.search) ||
  /localhost|127\.0\.0\.1/.test(location.hostname);

/** SPA page_view */
export function pageview(path: string) {
  if (!GA_ID) return;
  (window as any).__firstPageviewSent = true;
  window.gtag?.("event", "page_view", {
    page_title: document.title,
    page_location: location.href,
    page_path: path,
    debug_mode: isDebug,
  });
  if (isDebug) console.info("[GA] page_view", { path });
}

/** Custom events helper */
export function event(name: string, params: Record<string, any> = {}) {
  if (!GA_ID) return;
  window.gtag?.("event", name, { ...params, debug_mode: isDebug });
  if (isDebug) console.info("[GA] event", name, params);
}

/** ✅ Алиас под старое имя, чтобы не трогать импорты */
export function gaEvent(name: string, params: Record<string, any> = {}) {
  return event(name, params);
}
