// frontend/src/analytics/ga.ts
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID;

/** One-time loader */
export function loadGA() {
  if (!GA_ID || (window as any).gtag) return;

  // Stub + dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  } as any;

  // Init timestamp
  window.gtag('js', new Date());

  // (Опционально) даём явное разрешение на analytics storage
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    functionality_storage: 'granted',
    security_storage: 'granted',
  });

  // Load script async
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  // Не шлём авто page_view — отправим вручную в роутере
  window.gtag('config', GA_ID, { send_page_view: false });
}

const isDebug =
  /debug_mode=1/.test(location.search) ||
  /localhost|127\.0\.0\.1/.test(location.hostname);

/** SPA page_view */
export function pageview(path: string) {
  if (!GA_ID || !(window as any).gtag) return;
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: location.href,
    page_path: path,
    send_to: GA_ID,
    debug_mode: isDebug,
  });
}

/** Custom events helper */
export function event(name: string, params: Record<string, any> = {}) {
  if (!GA_ID || !(window as any).gtag) return;
  window.gtag('event', name, { ...params, send_to: GA_ID, debug_mode: isDebug });
}
