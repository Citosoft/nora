import {
  CHANGES_SIDEBAR_AUTO_COLLAPSE_WIDTH,
  MAX_CHANGES_SIDEBAR_WIDTH,
  MAX_WORKSPACE_SIDEBAR_WIDTH,
  MIN_CHANGES_SIDEBAR_WIDTH,
  MIN_WORKSPACE_SIDEBAR_WIDTH,
  WORKSPACE_SIDEBAR_AUTO_COLLAPSE_WIDTH
} from "@/components/app/constants/uiLayout";
import { useAppUiLayoutState } from "@/components/app/hooks/useAppUiLayoutState";
import { useLocalTerminalDock } from "@/components/app/hooks/useLocalTerminalDock";
import { useSidebarResize } from "@/components/app/hooks/useSidebarResize";
import type {
  UseAppRootWorkspaceChromeArgs,
  UseAppRootWorkspaceChromeResult
} from "@/components/app/types/useAppRootWorkspaceChrome.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect } from "react";

export const useAppRootWorkspaceChrome = ({
  shouldApplyFirstLoadCollapsedPanels
}: UseAppRootWorkspaceChromeArgs): UseAppRootWorkspaceChromeResult => {
  const snapshot = useCanonicalAppSnapshot();
  const layout = useAppUiLayoutState();

  const { startSidebarResize } = useSidebarResize({
    workspaceSidebarWidth: layout.workspaceSidebarWidth,
    changesSidebarWidth: layout.changesSidebarWidth,
    setWorkspaceSidebarWidth: layout.setWorkspaceSidebarWidth,
    setChangesSidebarWidth: layout.setChangesSidebarWidth,
    setIsWorkspaceSidebarCollapsed: layout.setIsWorkspaceSidebarCollapsed,
    setIsChangesSidebarCollapsed: layout.setIsChangesSidebarCollapsed,
    minWorkspaceSidebarWidth: MIN_WORKSPACE_SIDEBAR_WIDTH,
    maxWorkspaceSidebarWidth: MAX_WORKSPACE_SIDEBAR_WIDTH,
    minChangesSidebarWidth: MIN_CHANGES_SIDEBAR_WIDTH,
    maxChangesSidebarWidth: MAX_CHANGES_SIDEBAR_WIDTH,
    workspaceSidebarAutoCollapseWidth: WORKSPACE_SIDEBAR_AUTO_COLLAPSE_WIDTH,
    changesSidebarAutoCollapseWidth: CHANGES_SIDEBAR_AUTO_COLLAPSE_WIDTH
  });

  const localTerminalDock = useLocalTerminalDock({
    isLocalTerminalDockCollapsed: layout.isLocalTerminalDockCollapsed,
    setIsLocalTerminalDockCollapsed: layout.setIsLocalTerminalDockCollapsed
  });

  useEffect(() => {
    if (!snapshot?.workspaces.length) {
      return;
    }

    const validWorkspaceIds = new Set(snapshot.workspaces.map((workspace) => workspace.project.id));
    layout.setCollapsedWorkspaceIds((current) => {
      const nextEntries = Object.entries(current).filter(([workspaceId]) => validWorkspaceIds.has(workspaceId));
      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }
      return Object.fromEntries(nextEntries);
    });
  }, [snapshot?.workspaces, layout.setCollapsedWorkspaceIds]);

  useEffect(() => {
    if (!shouldApplyFirstLoadCollapsedPanels || !snapshot) {
      return;
    }

    const workspaceIds = new Set<string>();
    if (snapshot.project) {
      workspaceIds.add(snapshot.project.id);
    }
    snapshot.workspaces.forEach((workspace) => {
      workspaceIds.add(workspace.project.id);
    });
    if (!workspaceIds.size) {
      return;
    }

    layout.setCollapsedWorkspaceIds((current) => {
      if (Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(Array.from(workspaceIds).map((workspaceId) => [workspaceId, true]));
    });
  }, [shouldApplyFirstLoadCollapsedPanels, snapshot, layout.setCollapsedWorkspaceIds]);

  return {
    ...layout,
    startSidebarResize,
    ...localTerminalDock
  };
};
