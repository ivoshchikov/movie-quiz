// src/blog/components/GalleryCollector.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

type GalleryCtx = {
  register: (url: string) => void;
  list: string[];
};

const Ctx = createContext<GalleryCtx | null>(null);

export function GalleryProvider({
  children,
  onChange,
}: {
  children: ReactNode;
  onChange?: (list: string[]) => void;
}) {
  const [list, setList] = useState<string[]>([]);

  const register = (url: string) => {
    if (!url) return;
    setList((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  useEffect(() => {
    onChange?.(list);
  }, [list, onChange]);

  const value = useMemo(() => ({ register, list }), [list]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRegisterPoster(url?: string) {
  const ctx = useContext(Ctx);
  useEffect(() => {
    if (ctx && url) ctx.register(url);
  }, [ctx, url]);
}
