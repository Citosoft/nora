import type { CreateAgentDialogDefaults, CreateTerminalDialogDefaults, UiState } from "@/components/app/types";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

export type AppUiCommands = {
  openAboutDialog: () => void;
  setAboutDialogOpen: (open: boolean) => void;
  openKeyboardShortcutsDialog: () => void;
  setKeyboardShortcutsDialogOpen: (open: boolean) => void;
  openResourceMonitorDialog: () => void;
  setResourceMonitorDialogOpen: (open: boolean) => void;
  openAddWorkspaceDialog: () => void;
  setAddWorkspaceDialogOpen: (open: boolean) => void;
  openRemoteWorkspaceDialog: () => void;
  setRemoteWorkspaceDialogOpen: (open: boolean) => void;
  closeWorkspaceDialogStack: () => void;
  openResetWorkspacesDialog: () => void;
  openCreateAgentDialog: (defaults?: CreateAgentDialogDefaults | null) => void;
  openCreateTerminalDialog: (defaults: CreateTerminalDialogDefaults) => void;
  openWorkspaceTerminalPresetsDialog: (projectId: string) => void;
  openWorkspaceSwitcherDialog: () => void;
  setWorkspaceSwitcherDialogOpen: (open: boolean) => void;
  setDestroyAgentId: (agentId: string | null) => void;
  setDestroyAgentDialogOpen: (open: boolean) => void;
  setCreateAgentDialogOpen: (open: boolean) => void;
  closeCreateAgentDialog: () => void;
  setCreateTerminalDialogOpen: (open: boolean) => void;
  closeCreateTerminalDialog: () => void;
  setResetWorkspacesDialogOpen: (open: boolean) => void;
  setWorkspaceTerminalPresetsDialogOpen: (open: boolean) => void;
  clearSessionTabFocus: () => void;
  clearBrowserAndForgeFocus: () => void;
  setFocusedAiChatTabId: (tabId: string | null) => void;
  setInstallCommandDraft: (toolId: string, value: string) => void;
};

export function useAppUiCommands(setUiState: Dispatch<SetStateAction<UiState>>): AppUiCommands {
  const openAboutDialog = useCallback(() => {
    setUiState((current) => ({ ...current, showAboutDialog: true }));
  }, [setUiState]);

  const setAboutDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({ ...current, showAboutDialog: open }));
  }, [setUiState]);

  const openKeyboardShortcutsDialog = useCallback(() => {
    setUiState((current) => ({ ...current, showKeyboardShortcutsDialog: true }));
  }, [setUiState]);

  const setKeyboardShortcutsDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({ ...current, showKeyboardShortcutsDialog: open }));
  }, [setUiState]);

  const openResourceMonitorDialog = useCallback(() => {
    setUiState((current) => ({ ...current, showResourceMonitorDialog: true }));
  }, [setUiState]);

  const setResourceMonitorDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({ ...current, showResourceMonitorDialog: open }));
  }, [setUiState]);

  const openAddWorkspaceDialog = useCallback(() => {
    setUiState((current) => ({ ...current, showAddWorkspaceModal: true }));
  }, [setUiState]);

  const setAddWorkspaceDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({ ...current, showAddWorkspaceModal: open }));
  }, [setUiState]);

  const openRemoteWorkspaceDialog = useCallback(() => {
    setUiState((current) => ({
      ...current,
      showAddWorkspaceModal: false,
      showRemoteWorkspaceModal: true
    }));
  }, [setUiState]);

  const setRemoteWorkspaceDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({ ...current, showRemoteWorkspaceModal: open }));
  }, [setUiState]);

  const closeWorkspaceDialogStack = useCallback(() => {
    setUiState((current) => ({
      ...current,
      showAddWorkspaceModal: false,
      showRemoteWorkspaceModal: false
    }));
  }, [setUiState]);

  const openResetWorkspacesDialog = useCallback(() => {
    setUiState((current) => ({ ...current, showResetWorkspacesDialog: true }));
  }, [setUiState]);

  const openCreateAgentDialog = useCallback((defaults?: CreateAgentDialogDefaults | null) => {
    setUiState((current) => ({
      ...current,
      showCreateAgentModal: true,
      createAgentDefaults: defaults ?? null
    }));
  }, [setUiState]);

  const openCreateTerminalDialog = useCallback((defaults: CreateTerminalDialogDefaults) => {
    setUiState((current) => ({
      ...current,
      showCreateTerminalModal: true,
      createTerminalDefaults: defaults
    }));
  }, [setUiState]);

  const openWorkspaceTerminalPresetsDialog = useCallback((projectId: string) => {
    setUiState((current) => ({
      ...current,
      workspaceTerminalPresetsProjectId: projectId
    }));
  }, [setUiState]);

  const openWorkspaceSwitcherDialog = useCallback(() => {
    setUiState((current) => ({ ...current, showWorkspaceSwitcherDialog: true }));
  }, [setUiState]);

  const setWorkspaceSwitcherDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({ ...current, showWorkspaceSwitcherDialog: open }));
  }, [setUiState]);

  const setDestroyAgentId = useCallback((agentId: string | null) => {
    setUiState((current) => ({ ...current, destroyAgentId: agentId }));
  }, [setUiState]);

  const setDestroyAgentDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({
      ...current,
      destroyAgentId: open ? current.destroyAgentId : null
    }));
  }, [setUiState]);

  const setCreateAgentDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({
      ...current,
      showCreateAgentModal: open,
      createAgentDefaults: open ? current.createAgentDefaults : null
    }));
  }, [setUiState]);

  const closeCreateAgentDialog = useCallback(() => {
    setUiState((current) => ({
      ...current,
      showCreateAgentModal: false,
      createAgentDefaults: null
    }));
  }, [setUiState]);

  const setCreateTerminalDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({
      ...current,
      showCreateTerminalModal: open,
      createTerminalDefaults: open ? current.createTerminalDefaults : null
    }));
  }, [setUiState]);

  const closeCreateTerminalDialog = useCallback(() => {
    setUiState((current) => ({
      ...current,
      showCreateTerminalModal: false,
      createTerminalDefaults: null
    }));
  }, [setUiState]);

  const setResetWorkspacesDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({ ...current, showResetWorkspacesDialog: open }));
  }, [setUiState]);

  const setWorkspaceTerminalPresetsDialogOpen = useCallback((open: boolean) => {
    setUiState((current) => ({
      ...current,
      workspaceTerminalPresetsProjectId: open ? current.workspaceTerminalPresetsProjectId : null
    }));
  }, [setUiState]);

  const clearSessionTabFocus = useCallback(() => {
    setUiState((current) => ({
      ...current,
      focusedBrowserTabId: null,
      focusedForgeViewerTabId: null,
      focusedAiChatTabId: null
    }));
  }, [setUiState]);

  const clearBrowserAndForgeFocus = useCallback(() => {
    setUiState((current) => ({
      ...current,
      focusedBrowserTabId: null,
      focusedForgeViewerTabId: null
    }));
  }, [setUiState]);

  const setFocusedAiChatTabId = useCallback((tabId: string | null) => {
    setUiState((current) => ({
      ...current,
      focusedAiChatTabId: tabId
    }));
  }, [setUiState]);

  const setInstallCommandDraft = useCallback((toolId: string, value: string) => {
    setUiState((current) => ({
      ...current,
      installCommandDrafts: {
        ...current.installCommandDrafts,
        [toolId]: value
      }
    }));
  }, [setUiState]);

  return {
    openAboutDialog,
    setAboutDialogOpen,
    openKeyboardShortcutsDialog,
    setKeyboardShortcutsDialogOpen,
    openResourceMonitorDialog,
    setResourceMonitorDialogOpen,
    openAddWorkspaceDialog,
    setAddWorkspaceDialogOpen,
    openRemoteWorkspaceDialog,
    setRemoteWorkspaceDialogOpen,
    closeWorkspaceDialogStack,
    openResetWorkspacesDialog,
    openCreateAgentDialog,
    openCreateTerminalDialog,
    openWorkspaceTerminalPresetsDialog,
    openWorkspaceSwitcherDialog,
    setWorkspaceSwitcherDialogOpen,
    setDestroyAgentId,
    setDestroyAgentDialogOpen,
    setCreateAgentDialogOpen,
    closeCreateAgentDialog,
    setCreateTerminalDialogOpen,
    closeCreateTerminalDialog,
    setResetWorkspacesDialogOpen,
    setWorkspaceTerminalPresetsDialogOpen,
    clearSessionTabFocus,
    clearBrowserAndForgeFocus,
    setFocusedAiChatTabId,
    setInstallCommandDraft
  };
}
