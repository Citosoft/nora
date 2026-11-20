import { useCallback } from "react";
import type { AppSummary } from "@shared/types/apps/apps.types";
import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { useWorkspaceNavigation } from "./useWorkspaceNavigation";

/** Opens an app's builder thread beside it: the thread that created it, or a new one bound to the app when that thread is gone. */
export function useAppBuilderOpener(): (app: Pick<AppSummary, "id" | "threadId" | "workspaceId">) => void {
  const native = useNativeRuntimePorts();
  const navigation = useWorkspaceNavigation();
  return useCallback((app) => {
    navigation.closeTool();
    if (app.threadId && native.store.openThread(app.threadId)) return;
    const projectId = native.boot.workspaces.find((entry) => entry.id === app.workspaceId)?.shellProjectId;
    void native.launch({ source: { kind: "app", appId: app.id }, ...(projectId ? { projectId } : {}) });
  }, [native, navigation]);
}
