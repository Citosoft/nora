import { useSyncExternalStore } from "react";
import type { ThreadWorkspaceStore } from "@/components/app/types/thread-workspace/state.types";

export function useThreadWorkspaceSnapshot(store: ThreadWorkspaceStore) {
  return useSyncExternalStore(store.subscribe, store.snapshot);
}
