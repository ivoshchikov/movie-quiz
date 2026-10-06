import type { ReactNode } from "react";
// src/blog/components/GalleryCollector.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { GalleryContext } from "./galleryContext";

export function GalleryProvider({
  children,
  onChange,
}: {
  children: ReactNode;
  onChange?: (list: string[]) => void;
}) {
  const [list, setList] = useState<string[]>([]);

  const register = useCallback((url: string) => {
    if (!url) return;
    setList((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }, []);

  useEffect(() => {
    onChange?.(list);
  }, [list, onChange]);

  const value = useMemo(() => ({ register, list }), [register, list]);

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}
