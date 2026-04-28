import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { UiState } from "@/components/app/types";
import type { AppShellSignedInWorkspaceSidebarRestSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

export type UseAppRootWorkspaceSidebarSourcesArgs = Omit<
  AppShellSignedInWorkspaceSidebarRestSources,
  "uiCommands" | "workspaceSidebarUiState" | "activeProjectId" | "agentCatalog"
> & {
  uiCommands: Pick<
    AppUiCommands,
    | "clearBrowserAndForgeFocus"
    | "clearSessionTabFocus"
    | "openCreateAgentDialog"
    | "openCreateTerminalDialog"
    | "openResetWorkspacesDialog"
    | "openWorkspaceTerminalPresetsDialog"
    | "setDestroyAgentId"
    | "setInstallCommandDraft"
  >;
  uiState: Pick<UiState, "aiChatTabs" | "focusedAiChatTabId" | "installCommandDrafts">;
};

export type UseAppRootWorkspaceSidebarSourcesResult = AppShellSignedInWorkspaceSidebarRestSources | null;
