import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";
import type { AppState } from "@shared/appTypes";

export type WorkspaceTerminalNavigationDeps = Pick<
  WorkspaceSidebarBuildDeps,
  | "focusWorkspaceWithRecovery"
  | "handleOpenWorkspaceBrowser"
  | "safely"
  | "setIsNoteBrowserOpen"
  | "setIsSpecBrowserOpen"
  | "setIsTaskBoardOpen"
  | "setTaskEditorState"
  | "setWorkspaceSessionActiveViewId"
> & {
  uiCommands: Pick<WorkspaceSidebarBuildDeps["uiCommands"], "clearBrowserAndForgeFocus" | "clearSessionTabFocus">;
};

/** Focus/open actions for terminals and workspace browsers, shared by the sidebar and footer surfaces. */
export type WorkspaceTerminalNavigation = {
  focusTerminal: (sessionId: string) => void;
  focusWorkspaceTerminal: (projectId: string, sessionId: string) => Promise<AppState | null>;
  openWorkspaceBrowser: (projectId: string, url?: string) => void;
};
