import type { ReactNode } from "react";

export default function StatusMessage({ tone = "empty", children }: { tone?: "loading" | "empty" | "error" | "success"; children: ReactNode }) {
  return <div className={`hq-status hq-status-${tone}`} role={tone === "error" ? "alert" : "status"} aria-atomic="true">{children}</div>;
}
