import { readStoredUiLayout, writeStoredUiLayout } from "@/components/app/logic/appPersistence";
import type { UseAppUiLayoutStateResult } from "@/components/app/types/appUiLayout.types";
import { useEffect, useMemo, useState } from "react";

export const useAppUiLayoutState = (): UseAppUiLayoutStateResult => {
  const storedLayout = useMemo(() => readStoredUiLayout(), []);

  const [isWorkspaceSidebarCollapsed, setIsWorkspaceSidebarCollapsed] = useState(
    storedLayout.isWorkspaceSidebarCollapsed
  );
  const [isChangesSidebarCollapsed, setIsChangesSidebarCollapsed] = useState(storedLayout.isChangesSidebarCollapsed);
  const [sidebarsSwapped, setSidebarsSwapped] = useState(storedLayout.sidebarsSwapped);
  const [workspaceSidebarWidth, setWorkspaceSidebarWidth] = useState(
    storedLayout.workspaceSidebarWidth
  );
  const [changesSidebarWidth, setChangesSidebarWidth] = useState(storedLayout.changesSidebarWidth);
  const [activeChangesPanelTab, setActiveChangesPanelTab] = useState(storedLayout.activeChangesPanelTab);
  const [collapsedWorkspaceIds, setCollapsedWorkspaceIds] = useState<Record<string, boolean>>(
    storedLayout.collapsedWorkspaceIds
  );
  const [isTasksSectionCollapsed, setIsTasksSectionCollapsed] = useState(storedLayout.isTasksSectionCollapsed);
  const [isCliSectionCollapsed, setIsCliSectionCollapsed] = useState(storedLayout.isCliSectionCollapsed);
  const [isSkillsSectionCollapsed, setIsSkillsSectionCollapsed] = useState(storedLayout.isSkillsSectionCollapsed);
  const [isSpecsSectionCollapsed, setIsSpecsSectionCollapsed] = useState(storedLayout.isSpecsSectionCollapsed);
  const [isLocalTerminalDockCollapsed, setIsLocalTerminalDockCollapsed] = useState(
    storedLayout.isLocalTerminalDockCollapsed
  );
  const [localTerminalDockHeight, setLocalTerminalDockHeight] = useState(storedLayout.localTerminalDockHeight);

  useEffect(() => {
    writeStoredUiLayout({
      isWorkspaceSidebarCollapsed,
      isChangesSidebarCollapsed,
      sidebarsSwapped,
      workspaceSidebarWidth,
      changesSidebarWidth,
      activeChangesPanelTab,
      collapsedWorkspaceIds,
      isTasksSectionCollapsed,
      isCliSectionCollapsed,
      isSkillsSectionCollapsed,
      isSpecsSectionCollapsed,
      isLocalTerminalDockCollapsed,
      localTerminalDockHeight
    });
  }, [
    activeChangesPanelTab,
    changesSidebarWidth,
    collapsedWorkspaceIds,
    isChangesSidebarCollapsed,
    isCliSectionCollapsed,
    isLocalTerminalDockCollapsed,
    isSkillsSectionCollapsed,
    isSpecsSectionCollapsed,
    isTasksSectionCollapsed,
    isWorkspaceSidebarCollapsed,
    localTerminalDockHeight,
    sidebarsSwapped,
    workspaceSidebarWidth
  ]);

  return {
    activeChangesPanelTab,
    setActiveChangesPanelTab,
    changesSidebarWidth,
    setChangesSidebarWidth,
    collapsedWorkspaceIds,
    setCollapsedWorkspaceIds,
    isChangesSidebarCollapsed,
    setIsChangesSidebarCollapsed,
    isCliSectionCollapsed,
    setIsCliSectionCollapsed,
    isLocalTerminalDockCollapsed,
    setIsLocalTerminalDockCollapsed,
    isSkillsSectionCollapsed,
    setIsSkillsSectionCollapsed,
    isSpecsSectionCollapsed,
    setIsSpecsSectionCollapsed,
    isTasksSectionCollapsed,
    setIsTasksSectionCollapsed,
    isWorkspaceSidebarCollapsed,
    setIsWorkspaceSidebarCollapsed,
    sidebarsSwapped,
    setSidebarsSwapped,
    localTerminalDockHeight,
    setLocalTerminalDockHeight,
    workspaceSidebarWidth,
    setWorkspaceSidebarWidth
  };
};
