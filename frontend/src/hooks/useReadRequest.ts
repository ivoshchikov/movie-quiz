import { useCallback, useEffect, useState } from "react";

export const READ_TIMEOUT = 10000;
type Request<T> = { key: string; value?: T; loading: boolean; error: boolean };

// Keep confirmed data during refresh, but never carry it to another key/account.
export function useReadRequest<T>(key: string, load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [request, setRequest] = useState<Request<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), READ_TIMEOUT);
    setRequest(previous => ({ key, value: previous?.key === key ? previous.value : undefined, loading: true, error: false }));
    load(controller.signal).then(value => {
      if (active && !controller.signal.aborted) setRequest({ key, value, loading: false, error: false });
    }).catch(() => {
      if (active) setRequest(previous => ({ key, value: previous?.key === key ? previous.value : undefined, loading: false, error: true }));
    }).finally(() => window.clearTimeout(timeout));
    const aborted = () => {
      if (active) setRequest(previous => ({ key, value: previous?.key === key ? previous.value : undefined, loading: false, error: true }));
    };
    controller.signal.addEventListener("abort", aborted);
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [key, load, enabled, attempt]);
  const current = enabled && request?.key === key ? request : null;
  return { value: current?.value, loading: enabled && (!current || current.loading), error: !!current?.error, retry };
}
