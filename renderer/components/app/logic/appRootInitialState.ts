import type { UiState, WindowUiState } from "@/components/app/types";

export const appRootInitialUiState: UiState = {
  snapshot: null,
  activeErrorMessage: null,
  showAddWorkspaceModal: false,
  showRemoteWorkspaceModal: false,
  showCreateAgentModal: false,
  createAgentDefaults: null,
  showCreateTerminalModal: false,
  createTerminalDefaults: null,
  showAboutDialog: false,
  showKeyboardShortcutsDialog: false,
  showWorkspaceSwitcherDialog: false,
  destroyAgentId: null,
  removeMissingWorkspaceRoot: null,
  removeMissingWorkspaceError: null,
  showResetWorkspacesDialog: false,
  workspaceTerminalPresetsProjectId: null,
  browserTabs: [],
  focusedBrowserTabId: null,
  forgeViewerTabs: [],
  focusedForgeViewerTabId: null,
  aiChatTabs: [],
  focusedAiChatTabId: null,
  installCommandDrafts: {}
};

export const appRootInitialWindowUiState: WindowUiState = {
  isMaximized: false,
  platform: "win32"
};
