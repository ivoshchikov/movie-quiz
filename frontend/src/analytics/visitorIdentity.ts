export const SITE_OWNER = "112743d7-f683-4bbb-8117-068e89a00f22";
const visitorKey = "hq_visitor_id";
const ownerKey = "hq_visitor_owner_browser";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memoryId: string | null = null;
let excludedBrowser = false;

export function existingVisitorId() {
  try {
    const value = localStorage.getItem(visitorKey);
    if (value && uuid.test(value)) return value;
  } catch { /* Denied storage falls back to one identifier for this document. */ }
  return memoryId;
}
export function getVisitorId() {
  const create = () => {
    const existing = existingVisitorId();
    if (existing) return existing;
    memoryId = crypto.randomUUID();
    try { localStorage.setItem(visitorKey, memoryId); } catch { /* Memory-only. */ }
    return memoryId;
  };
  // Presence and page views, including first creation in concurrent tabs, share an ID.
  return navigator.locks ? navigator.locks.request("hq-visitor-id", create) : Promise.resolve(create());
}
export function isOwnerBrowser() {
  if (excludedBrowser) return true;
  try { return localStorage.getItem(ownerKey) === "1"; } catch { return false; }
}
export function markOwnerBrowser() {
  excludedBrowser = true;
  try { localStorage.setItem(ownerKey, "1"); } catch { /* SQL also excludes the verified account. */ }
}
