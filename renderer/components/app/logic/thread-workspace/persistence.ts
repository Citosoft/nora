import { threadLayoutSchema } from "./schema";
import type { ThreadLayout, ThreadLayoutPersistence } from "@/components/app/types/thread-workspace/state.types";

export function emptyThreadLayout(environmentId: string): ThreadLayout {
  return { version: 1, environmentId, focusedWorkspaceId: null, activeId: null, documents: [], openIds: [], pinnedThreadIds: [] };
}

/** Layout/drafts only. Provider execution and transcripts remain owned by the host. */
export function createThreadLayoutPersistence(storage: Pick<Storage, "getItem" | "setItem">, environmentId: string): ThreadLayoutPersistence {
  const key = `nora-thread-views:v1:${encodeURIComponent(environmentId)}`;
  return {
    read() {
      const raw = storage.getItem(key);
      if (raw === null) return null;
      const value = threadLayoutSchema.parse(JSON.parse(raw));
      if (value.environmentId !== environmentId) throw new Error("Thread layout belongs to another execution host");
      return value;
    },
    write(layout) {
      const value = threadLayoutSchema.parse(layout);
      if (value.environmentId !== environmentId) throw new Error("Thread layout belongs to another execution host");
      storage.setItem(key, JSON.stringify(value));
    }
  };
}
