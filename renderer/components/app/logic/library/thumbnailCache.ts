import type { ToolImagePreview } from "@shared/types/conversation/queries.types";
import type { ThumbnailCache } from "@/components/app/types/library.types";

/** Thumbnails kept for one Library session: enough for a large workspace, bounded so memory stays flat. */
const MAX_THUMBNAILS = 400;

/**
 * Shares one load per thumbnail across tiles, regroupings and re-renders. Failed loads are forgotten so a later
 * visit can try again; the oldest thumbnails are dropped first once the cache is full.
 */
export function createThumbnailCache(load: (key: string) => Promise<ToolImagePreview | null>, limit = MAX_THUMBNAILS): ThumbnailCache {
  const entries = new Map<string, Promise<ToolImagePreview | null>>();
  return {
    get(key) {
      const cached = entries.get(key);
      if (cached) { entries.delete(key); entries.set(key, cached); return cached; }
      const pending = load(key).catch(() => { entries.delete(key); return null; });
      entries.set(key, pending);
      while (entries.size > limit) { const oldest = entries.keys().next().value; if (oldest === undefined) break; entries.delete(oldest); }
      return pending;
    }
  };
}
