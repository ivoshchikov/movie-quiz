import { clearVisitorIdentity } from "../analytics/visitorIdentity";

/** Clear only the optional purpose that is denied; preserve auth/game storage. */
export function clearDeniedStorage(permission: { measurement: boolean; analytics: boolean }) {
  if (!permission.measurement) clearVisitorIdentity();
  if (permission.analytics) return;
  try { for (const key of Object.keys(sessionStorage)) if (key.startsWith("hq:analytics:v2:")) sessionStorage.removeItem(key); } catch { /* Storage can be denied. */ }
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
    for (const domain of ["", location.hostname, "." + location.hostname, ".hard-quiz.com"]) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
    }
  }
}
