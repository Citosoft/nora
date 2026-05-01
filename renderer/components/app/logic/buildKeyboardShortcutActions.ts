import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { getFocusedWorkspace } from "@/components/app/logic/appUtils";
import { createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import { getActiveWorkspaceSessionTabId, getAdjacentWorkspaceSessionTab, getWorkspaceSessionTabs } from "@/components/app/logic/workspaceSessionTabs";
import type { KeyboardShortcutActionsBuildDeps } from "@/components/app/types/keyboardShortcutActionsBuild.types";
import type { ShortcutActionMap, WorkspaceSessionTab } from "@/components/app/types/workflow.types";

export const buildKeyboardShortcutActions = (d: KeyboardShortcutActionsBuildDeps): ShortcutActionMap => {
  const focusWorkspaceSessionTab = (tab: WorkspaceSessionTab): void => {
    d.setActiveView("main");
    switch (tab.kind) {
      case "agent":
        d.sessionFocusCommands.focusAgentSessionTab(tab.id);
        return;
      case "terminal":
        d.sessionFocusCommands.focusTerminalSessionTab(tab.id);
        return;
      case "browser":
        d.sessionFocusCommands.focusBrowserSessionTab(tab.id);
        return;
      case "ai-chat":
        d.sessionFocusCommands.focusAiChatSessionTab(tab.id);
        return;
      case "forge":
        d.sessionFocusCommands.focusForgeViewerSessionTab(tab.id);
        return;
      case "view":
        return;
      case "file":
        d.setActiveWorkspaceContentTab("file");
        d.setFileEditorState((current) =>
          current?.tabs.some((item) => item.path === tab.path) ? { ...current, activePath: tab.path } : current
        );
        return;
      case "diff":
        d.setIsCenterDiffExpanded(true);
        d.setActiveWorkspaceContentTab("diff");
        return;
    }
  };

  const focusAdjacentWorkspaceSessionTab = (direction: -1 | 1): void => {
    if (!d.snapshot) {
      return;
    }
    const expandedDiffPath = d.isCenterDiffExpanded && d.selectedChange ? d.selectedChange.path : null;
    const tabs = getWorkspaceSessionTabs(
      getFocusedWorkspace(d.snapshot),
      d.uiState.browserTabs,
      d.uiState.aiChatTabs,
      d.uiState.forgeViewerTabs,
      [],
      d.fileEditorState?.tabs ?? [],
      expandedDiffPath
    );
    const activeTabId = getActiveWorkspaceSessionTabId({
      activeViewId: null,
      activeWorkspaceContentTab: d.activeWorkspaceContentTab,
      activeFileEditorPath: d.fileEditorState?.activePath ?? null,
      expandedDiffPath,
      activeForgeViewerTabId: d.uiState.focusedForgeViewerTabId,
      activeAiChatTabId: d.uiState.focusedAiChatTabId,
      activeBrowserTabId: d.uiState.focusedBrowserTabId,
      activeAgentId: d.snapshot.focusedAgentId,
      activeTerminalId: d.snapshot.focusedTerminalId
    });
    const nextTab = getAdjacentWorkspaceSessionTab(tabs, activeTabId, direction);
    if (!nextTab) {
      return;
    }
    focusWorkspaceSessionTab(nextTab);
  };

  const openRecentWorkspaceByIndex = (index: number): void => {
    const rootPath = d.snapshot?.recentProjects[index]?.rootPath;
    if (!rootPath) {
      return;
    }

    void d.safely(() => noraWorkspaceClient.selectProject(rootPath));
  };

  return {
    "open-workspace-quick-search": () => {
      if (!d.snapshot?.project) {
        return;
      }

      d.setActiveView("main");
      d.setWorkspaceQuickSearchRequestId((current) => current + 1);
    },
    "open-workspace-switcher": () => {
      d.uiCommands.openWorkspaceSwitcherDialog();
    },
    "toggle-workspace-sidebar": () => {
      d.setIsWorkspaceSidebarCollapsed((current) => !current);
    },
    "toggle-changes-sidebar": () => {
      d.setIsChangesSidebarCollapsed((current) => !current);
    },
    "open-settings": () => {
      d.openSettingsPage();
    },
    "open-startup-dependencies": () => {
      d.openStartupDependenciesDialog();
    },
    "open-create-terminal": () => {
      if (!d.snapshot?.project) {
        return;
      }

      d.setActiveView("main");
      void d.createTerminalWithStatus(
        createQuickTerminalPayload(d.defaultTerminalShellId, d.appSettingsTerminalQuickLaunchDefaults)
      );
    },
    "open-add-workspace": () => {
      d.uiCommands.openAddWorkspaceDialog();
    },
    "open-recent-workspace-1": () => {
      openRecentWorkspaceByIndex(0);
    },
    "open-recent-workspace-2": () => {
      openRecentWorkspaceByIndex(1);
    },
    "open-recent-workspace-3": () => {
      openRecentWorkspaceByIndex(2);
    },
    "open-recent-workspace-4": () => {
      openRecentWorkspaceByIndex(3);
    },
    "open-recent-workspace-5": () => {
      openRecentWorkspaceByIndex(4);
    },
    "open-workspace-browser": () => {
      if (!d.snapshot?.project) {
        return;
      }

      d.handleOpenWorkspaceBrowser(d.snapshot.project.id);
    },
    "toggle-local-terminal-dock": () => {
      d.setIsLocalTerminalDockCollapsed((current) => !current);
    },
    "focus-local-terminal-dock": () => {
      void d.focusLocalTerminalDock();
    },
    "open-create-agent": () => {
      if (!d.snapshot?.project) {
        return;
      }

      d.setActiveView("main");
      d.uiCommands.openCreateAgentDialog();
    },
    "focus-previous-session-tab": () => {
      focusAdjacentWorkspaceSessionTab(-1);
    },
    "focus-next-session-tab": () => {
      focusAdjacentWorkspaceSessionTab(1);
    },
    "open-keyboard-shortcuts": () => {
      d.uiCommands.openKeyboardShortcutsDialog();
    }
  };
};
