// frontend/src/analytics/ga.ts
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    __gaLoaded?: boolean;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

export function loadGA() {
  if (!GA_ID || window.__gaLoaded) return;

  // Заглушка + очередь
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); } as any;

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
    page_location: location.href,
    page_path: path,
    debug_mode: isDebug,
  });
}

export function event(name: string, params: Record<string, any> = {}) {
  if (!GA_ID) return;
  window.gtag?.('event', name, { ...params, debug_mode: isDebug });
}

// совместимость
export const gaEvent = event;
