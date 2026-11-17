import { useCallback, useSyncExternalStore } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { resolveMemoryWorkspace } from "@/components/app/logic/workspaceMemory";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

/** Subscribe to the selected workspace without rerendering the shell for every thread update. */
export function useMemoryWorkspace(projectId: string | null): NativeWorkspace | null {
  const { store } = useNativeRuntimePorts();
  const selectedWorkspace = useCallback(() => {
    const state = store.snapshot();
    return resolveMemoryWorkspace(state.boot.workspaces, projectId, state.layout.focusedWorkspaceId);
  }, [store, projectId]);
  return useSyncExternalStore(store.subscribe, selectedWorkspace);
}
