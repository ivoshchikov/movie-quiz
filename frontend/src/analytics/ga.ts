// frontend/src/analytics/ga.ts
// Lightweight GA4 helper for a Vite+React SPA

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

export function loadGA() {
  if (!GA_ID || typeof window === "undefined" || window.gtag) return;

  // gtag.js
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: any[]) => window.dataLayer!.push(args);

  window.gtag("js", new Date());

  // В SPA мы шлём page_view вручную, чтобы не было дублей
  window.gtag("config", GA_ID, {
    send_page_view: false,
    debug_mode: import.meta.env.DEV,
  });
}

export function pageview(path: string) {
  if (!GA_ID || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: window.location.origin + path,
    page_path: path,
  });
}

export function gaEvent(name: string, params: Record<string, any> = {}) {
  if (!GA_ID || !window.gtag) return;
  window.gtag("event", name, params);
}
