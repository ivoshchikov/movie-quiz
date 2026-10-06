// Register before BrowserRouter constructs its history listener. A cancelled back
// navigation must not unmount the game before its original entry is restored.
let handler: ((event: PopStateEvent) => void) | null = null;
window.addEventListener("popstate", event => handler?.(event), true);
export function guardGameNavigation(next: (event: PopStateEvent) => void) {
  handler = next;
  return () => { if (handler === next) handler = null; };
}
