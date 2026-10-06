import { createContext, useContext, useEffect } from "react";

type GalleryContextValue = {
  register: (url: string) => void;
  list: string[];
};

export const GalleryContext = createContext<GalleryContextValue | null>(null);

export function useRegisterPoster(url?: string) {
  const ctx = useContext(GalleryContext);
  useEffect(() => {
    if (ctx && url) ctx.register(url);
  }, [ctx, url]);
}
