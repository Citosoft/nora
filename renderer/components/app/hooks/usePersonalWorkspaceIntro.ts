import { useState } from "react";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { dismissStoredPersonalWorkspaceIntro, readStoredPersonalWorkspaceIntroDismissed } from "@/components/app/logic/appPersistence";
import { shouldOpenPersonalWorkspaceIntro } from "@/components/app/logic/startupDialogVisibility";

export function usePersonalWorkspaceIntro(blocked: boolean) {
  const { state } = useThreadCenterPorts();
  const [dismissed, setDismissed] = useState(readStoredPersonalWorkspaceIntroDismissed);
  const workspace = state.boot.workspaces.find((entry) => entry.id === state.layout.focusedWorkspaceId);
  return {
    open: shouldOpenPersonalWorkspaceIntro(workspace?.kind, dismissed, blocked || state.loading),
    dismiss: () => {
      dismissStoredPersonalWorkspaceIntro();
      setDismissed(true);
    }
  };
}
