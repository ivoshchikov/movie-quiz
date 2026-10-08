import { AUTH_TIMEOUT_MS } from "./requests";

const pending = new Set<AbortController>();

export function cancelAuthRequests() {
  for (const controller of pending) controller.abort();
}

/** Bound the actual auth transport so SDK initialization/refresh locks can recover. */
export const authFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!new URL(url).pathname.startsWith("/auth/v1/")) return fetch(input, init);

  const controller = new AbortController();
  const parent = init?.signal ?? (input instanceof Request ? input.signal : null);
  const abort = () => controller.abort();
  if (parent?.aborted) abort();
  else parent?.addEventListener("abort", abort, { once: true });
  pending.add(controller);
  const timer = setTimeout(abort, AUTH_TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    // Keep the timeout active through the body; headers alone do not finish auth.
    const body = await response.arrayBuffer();
    return new Response([204, 205, 304].includes(response.status) ? null : body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } finally {
    clearTimeout(timer);
    pending.delete(controller);
    parent?.removeEventListener("abort", abort);
  }
};
