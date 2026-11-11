import type { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<"a"> & { href: string };

export default function ExternalLink({ rel, ...props }: Props) {
  const tokens = new Set(rel?.split(/\s+/).filter(Boolean));
  tokens.add("noopener").add("noreferrer");
  return <a {...props} target="_blank" rel={[...tokens].join(" ")} />;
}
