import type { ReactNode } from "react";

const paths = {
  trophy: <><path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-4 3h8m-6-3h4v3h-4Z" /></>,
  replay: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></>,
  cinema: <><path d="m3 8 17-4-1-3L2 5l1 3Zm0 0v13h18V8H3Z" /><path d="m6 4 3 3m3-4 3 3m3-4 2 2M3 13h18" /></>,
  film: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4m-4 8h4M17 8h4m-4 8h4" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-15a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4v2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3m-10 3h3" /></>,
  timer: <><circle cx="12" cy="14" r="8" /><path d="M9 2h6m-3 0v4m0 4v5l3 2m3-12 2 2" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  chart: <><path d="M4 20V10m8 10V4m8 16v-7M2 20h20" /></>,
  user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  settings: <><path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5" /></>,
  logout: <><path d="M9 3H4v18h5m5-14 5 5-5 5m-5-5h10" /></>,
} satisfies Record<string, ReactNode>;

export default function SiteIcon({ name, className = "" }: { name: keyof typeof paths; className?: string }) {
  return <svg className={`hq-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
