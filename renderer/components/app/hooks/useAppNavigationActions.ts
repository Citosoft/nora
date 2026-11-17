import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { createQuickTerminalDialogDefaults } from "@/components/app/logic/terminalQuickLaunch";
import type { AppView, UiState } from "@/components/app/types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { AppSettings } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

export function useAppNavigationActions({
  activeView,
  setActiveView,
  setSettingsGroup,
  setUiState,
  snapshotProjectId,
  defaultTerminalShellId,
  terminalQuickLaunchDefaults,
  handleOpenWorkspaceBrowser
}: {
  activeView: AppView;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  setSettingsGroup: Dispatch<SetStateAction<SettingsGroup>>;
  setUiState: Dispatch<SetStateAction<UiState>>;
  snapshotProjectId: string | null;
  defaultTerminalShellId: string | null;
  terminalQuickLaunchDefaults: AppSettings["terminalQuickLaunchDefaults"];
  handleOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
}): {
  openSettingsPage: (group?: SettingsGroup) => void;
  toggleSettingsPage: () => void;
  openAddRemoteWorkspaceModal: () => void;
  openCreateTerminalModal: () => void;
  openCreateAgentModal: () => void;
  openWorkspaceBrowserFromTitleBar: () => void;
} {
  const native = useNativeRuntimePorts();
  const openSettingsPage = useCallback((group: SettingsGroup = "appearance") => {
    setSettingsGroup(group);
    setActiveView("settings");
  }, [setActiveView, setSettingsGroup]);

  const toggleSettingsPage = useCallback(() => {
    if (activeView === "settings") {
      setActiveView("main");
      return;
    }

    openSettingsPage();
  }, [activeView, openSettingsPage, setActiveView]);

  const openAddRemoteWorkspaceModal = useCallback((): void => {
    setUiState((current) => ({
      ...current,
      showAddWorkspaceModal: false,
      showRemoteWorkspaceModal: true
    }));
  }, [setUiState]);

  const openCreateTerminalModal = useCallback((): void => {
    if (!snapshotProjectId) {
      return;
    }

    setActiveView("main");
    setUiState((current) => ({
      ...current,
      showCreateTerminalModal: true,
      createTerminalDefaults: createQuickTerminalDialogDefaults(
        defaultTerminalShellId,
        terminalQuickLaunchDefaults
      )
    }));
  }, [defaultTerminalShellId, setActiveView, setUiState, snapshotProjectId, terminalQuickLaunchDefaults]);

  const openCreateAgentModal = useCallback((): void => {
    setActiveView("main");
    void native.launch({ ...(snapshotProjectId ? { projectId: snapshotProjectId } : {}) }).catch((cause: unknown) => {
      setUiState((current) => ({ ...current, activeErrorMessage: cause instanceof Error ? cause.message : "Thread could not be opened." }));
    });
  }, [native.launch, setActiveView, setUiState, snapshotProjectId]);

  const openWorkspaceBrowserFromTitleBar = useCallback((): void => {
    if (!snapshotProjectId) {
      return;
    }

    handleOpenWorkspaceBrowser(snapshotProjectId);
  }, [handleOpenWorkspaceBrowser, snapshotProjectId]);

  return {
    openSettingsPage,
    toggleSettingsPage,
    openAddRemoteWorkspaceModal,
    openCreateTerminalModal,
    openCreateAgentModal,
    openWorkspaceBrowserFromTitleBar
  };
}
