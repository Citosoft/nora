import { useEffect, useRef } from "react";
import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { useThreadWorkspaceSnapshot } from "./useThreadWorkspaceSnapshot";
import type { NativeShellNavigationInput } from "@/components/app/types/thread-workspace/navigation.types";

/** Coordinates native thread selection with the retained workspace/tool navigation. */
export function useNativeShellNavigation({ projectId, focusWorkspace, showThread, onError }: NativeShellNavigationInput): void {
  const native = useNativeRuntimePorts();
  const state = useThreadWorkspaceSnapshot(native.store);
  const expectedProject = useRef<string | null>(null);
  const actions = useRef({ focusWorkspace, showThread, onError });
  actions.current = { focusWorkspace, showThread, onError };
  useEffect(() => {
    if (!projectId || (expectedProject.current && expectedProject.current !== projectId)) return;
    expectedProject.current = null;
    let disposed = false;
    void native.request({ kind: "register-workspace", projectId }).then((boot) => {
      if (disposed) return;
      native.store.updateBoot(boot);
      const workspace = boot.workspaces.find((entry) => entry.shellProjectId === projectId);
      if (!workspace) return;
      native.store.focusWorkspace(workspace.id);
      if (!native.store.snapshot().layout.openIds.length) native.store.openDraft({ workspaceId: workspace.id });
    }).catch((cause: unknown) => { if (!disposed) actions.current.onError(cause); });
    return () => { disposed = true; };
  }, [projectId, native.request, native.store]);
  useEffect(() => {
    const document = state.layout.documents.find((entry) => entry.id === state.layout.activeId);
    if (!document) return;
    actions.current.showThread();
    const workspace = state.boot.workspaces.find((entry) => entry.id === document.workspaceId);
    if (workspace?.shellProjectId && workspace.shellProjectId !== projectId) {
      expectedProject.current = workspace.shellProjectId;
      void actions.current.focusWorkspace(workspace.shellProjectId).catch(actions.current.onError);
    }
  }, [state.layout.activeId, state.focusRevision, native.store]);
}
