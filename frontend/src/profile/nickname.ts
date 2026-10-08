const DRAFT_PREFIX = "hq_nickname_draft_v1:";
const PROMPT_PREFIX = "hq_nickname_prompted_v1:";
const drafts = new Map<string, string>();
const prompted = new Set<string>();

export function nicknameDraft(owner: string): string {
  if (drafts.has(owner)) return drafts.get(owner)!;
  try {
    const value = sessionStorage.getItem(DRAFT_PREFIX + owner);
    if (value && value.length <= 1000) { drafts.set(owner, value); return value; }
  } catch { /* The form still works without browser storage. */ }
  return "";
}

export function storeNicknameDraft(owner: string, value: string) {
  drafts.set(owner, value);
  try {
    if (value) sessionStorage.setItem(DRAFT_PREFIX + owner, value);
    else sessionStorage.removeItem(DRAFT_PREFIX + owner);
  } catch { /* Keep the draft in memory while this document is open. */ }
}

export function clearNicknameDraft(owner: string) {
  drafts.delete(owner);
  try { sessionStorage.removeItem(DRAFT_PREFIX + owner); } catch { /* A confirmed save does not depend on storage. */ }
  try { localStorage.removeItem("pre_nickname"); } catch { /* The legacy draft is never used for a different account. */ }
}

export function nicknameWasPrompted(owner: string): boolean {
  if (prompted.has(owner)) return true;
  try { return sessionStorage.getItem(PROMPT_PREFIX + owner) === "1"; } catch { return false; }
}

export function markNicknamePrompted(owner: string) {
  prompted.add(owner);
  try { sessionStorage.setItem(PROMPT_PREFIX + owner, "1"); } catch { /* Avoid repeat prompts even when storage is blocked. */ }
}

export function nicknameDestination(destination: string): string {
  const path = destination.split(/[?#]/)[0];
  if (path === "/daily") return "Daily Challenge";
  if (path === "/profile") return "your results";
  if (path === "/leaderboard") return "the leaderboard";
  if (path === "/how-to-play") return "the game guide";
  if (path === "/result") return "your quiz result";
  if (path === "/admin/daily") return "Daily settings";
  if (path.startsWith("/blog/")) return "the article";
  if (path === "/blog") return "the blog";
  return "the quiz selection";
}

// Keep explicit setup intent in the passive callback URL, including an email opened in a new tab.
export function nicknameSetupDestination(destination: string): string {
  const url = new URL(destination, window.location.origin);
  url.searchParams.set("choose_nickname", "1");
  return url.pathname + url.search + url.hash;
}

export function withoutNicknameSetup(destination: string): string {
  const url = new URL(destination, window.location.origin);
  url.searchParams.delete("choose_nickname");
  return url.pathname + url.search + url.hash;
}
