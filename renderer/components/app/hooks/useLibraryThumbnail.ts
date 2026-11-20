import { useEffect, useRef, useState } from "react";
import type { ToolImagePreview } from "@shared/types/conversation/queries.types";
import type { ThumbnailCache } from "@/components/app/types/library.types";

/** Loads a tile's thumbnail once it scrolls near view, so a large Library only decodes what is seen. */
export function useLibraryThumbnail<T extends Element>(cache: ThumbnailCache, key: string | null): { ref: React.RefObject<T | null>; preview: ToolImagePreview | null } {
  const ref = useRef<T>(null);
  const [preview, setPreview] = useState<ToolImagePreview | null>(null);
  useEffect(() => {
    setPreview(null);
    const element = ref.current;
    if (!key || !element) return;
    let current = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void cache.get(key).then((loaded) => { if (current) setPreview(loaded); });
    }, { rootMargin: "300px" });
    observer.observe(element);
    return () => { current = false; observer.disconnect(); };
  }, [cache, key]);
  return { ref, preview };
}
