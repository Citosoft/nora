import { useOptionalWorkspaceSidebarPorts } from "@/components/app/context/workspaceSidebarPortsContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { collectActiveLocalPorts } from "@/components/app/logic/activeLocalPorts";
import { buildWorkspaceGroups } from "@/components/app/logic/workspaceGroups";
import { createWorkspaceTerminalNavigation } from "@/components/app/logic/workspaceTerminalNavigation";
import type { StatusBarLocalPortsModel } from "@/components/app/types/statusBarLocalPorts.types";
import { useMemo } from "react";

/** Returns null outside the signed-in shell (loading / onboarding footers), where there is nothing to navigate to. */
export const useStatusBarLocalPorts = (): StatusBarLocalPortsModel | null => {
  const sidebarBuild = useOptionalWorkspaceSidebarPorts()?.sidebarBuild ?? null;
  const snapshot = useCanonicalAppSnapshot();
  const removingWorkspaceRoots = sidebarBuild?.removingWorkspaceRoots;

  const ports = useMemo(
    () => collectActiveLocalPorts(buildWorkspaceGroups(snapshot, new Set(removingWorkspaceRoots ?? []))),
    [removingWorkspaceRoots, snapshot]
  );

  return useMemo(() => {
    if (!sidebarBuild) {
      return null;
    }
    const navigation = createWorkspaceTerminalNavigation(sidebarBuild);
    return {
      ports,
      openTerminal: (port) => {
        if (port.projectId === sidebarBuild.activeProjectId) {
          navigation.focusTerminal(port.terminalId);
          return;
        }
        void navigation.focusWorkspaceTerminal(port.projectId, port.terminalId);
      },
      openInAppBrowser: (port) => navigation.openWorkspaceBrowser(port.projectId, port.url)
    };
  }, [ports, sidebarBuild]);
};
