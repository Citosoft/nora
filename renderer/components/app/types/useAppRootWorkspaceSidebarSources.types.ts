import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { UiState } from "@/components/app/types";
import type { AppShellSignedInWorkspaceSidebarRestSources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";

export type UseAppRootWorkspaceSidebarSourcesArgs = Omit<
  AppShellSignedInWorkspaceSidebarRestSources,
  "uiCommands" | "workspaceSidebarUiState" | "activeProjectId" | "agentCatalog"
> & {
  isNoteBrowserOpen: WorkspaceSidebarBuildDeps["isNoteBrowserOpen"];
  isSpecBrowserOpen: WorkspaceSidebarBuildDeps["isSpecBrowserOpen"];
  isTaskBoardOpen: WorkspaceSidebarBuildDeps["isTaskBoardOpen"];
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
  uiState: Pick<UiState, "aiChatTabs" | "focusedAiChatTabId" | "focusedBrowserTabId" | "focusedForgeViewerTabId" | "installCommandDrafts">;
};

export type UseAppRootWorkspaceSidebarSourcesResult = AppShellSignedInWorkspaceSidebarRestSources | null;
