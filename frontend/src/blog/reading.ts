import { isValidElement, type ReactNode } from "react";

/** Count prose without mounting components, running effects or loading images. */
function proseText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(proseText).join(" ");
  if (!isValidElement<{ children?: ReactNode }>(node)) return "";
  if (node.type === "svg") return "";
  return proseText(node.props.children);
}

/** Approximate text reading at 200 words/minute; diagrams can take longer. */
export function estimateReadingMinutes(content: ReactNode): number {
  const words = proseText(content).trim().match(/\S+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}
