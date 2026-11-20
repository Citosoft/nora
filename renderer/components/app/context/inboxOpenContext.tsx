import { createContext, useCallback, useEffect, useMemo } from "react";
import { inboxClient } from "@/components/app/clients/inboxClient";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useWorkflowLaunch } from "@/components/app/hooks/useWorkflowLaunch";
import { useOptionalSessionCenterPorts } from "@/components/app/context/sessionCenterPortsContext";
import type { InboxTarget } from "@shared/types/inbox/inbox.types";
import type { InboxOpenProviderProps, InboxOpenValue } from "@/components/app/types/inbox.types";

/** Shows what an inbox item is about: its thread, its workflow run's monitor, or connector settings. */
export const InboxOpenContext = createContext<InboxOpenValue | null>(null);

export function InboxOpenProvider({ children }: InboxOpenProviderProps) {
  const { store } = useNativeRuntimePorts();
  const { closeTool, setPreferences } = useWorkspaceNavigation();
  const { openRun } = useWorkflowLaunch();
  const onOpenConnectorSettings = useOptionalSessionCenterPorts()?.onOpenConnectorSettings;
  const open = useCallback((target: InboxTarget): void => {
    switch (target.kind) {
      case "thread": closeTool(); store.openThread(target.conversationId); return;
      case "workflow": openRun(target.projectId, target.runId); return;
      case "connectors": onOpenConnectorSettings?.(); return;
      case "app": closeTool(); setPreferences((current) => ({ ...current, sidebarMode: "apps", activeAppId: target.appId })); store.showHome(); return;
    }
  }, [closeTool, store, openRun, onOpenConnectorSettings, setPreferences]);
  // A clicked inbox notification shows its item, even a thread hidden from the sidebar.
  useEffect(() => inboxClient.onOpen(open), [open]);
  const value = useMemo<InboxOpenValue>(() => ({ open }), [open]);
  return <InboxOpenContext.Provider value={value}>{children}</InboxOpenContext.Provider>;
}
