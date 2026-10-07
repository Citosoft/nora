import { noraSessionClient } from "@/components/app/clients/noraSessionClient";
import type {
  WorkspaceTerminalNavigation,
  WorkspaceTerminalNavigationDeps
} from "@/components/app/types/workspaceTerminalNavigation.types";

export const createWorkspaceTerminalNavigation = (d: WorkspaceTerminalNavigationDeps): WorkspaceTerminalNavigation => {
  const closeWorkspaceContentOverlays = () => {
    d.setIsTaskBoardOpen(false);
    d.setIsSpecBrowserOpen(false);
    d.setIsNoteBrowserOpen(false);
    d.setTaskEditorState(null);
    d.setWorkspaceSessionActiveViewId(null);
  };

  return {
    focusTerminal: (sessionId) => {
      closeWorkspaceContentOverlays();
      d.uiCommands.clearSessionTabFocus();
      void d.safely(() => noraSessionClient.focusTerminal(sessionId));
    },
    focusWorkspaceTerminal: async (projectId, sessionId) => {
      const next = await d.focusWorkspaceWithRecovery(projectId);
      if (!next) {
        return null;
      }
      closeWorkspaceContentOverlays();
      d.uiCommands.clearBrowserAndForgeFocus();
      return next.focusedTerminalId === sessionId ? next : d.safely(() => noraSessionClient.focusTerminal(sessionId));
    },
    openWorkspaceBrowser: (projectId, url) => {
      void d.focusWorkspaceWithRecovery(projectId).then((next) => {
        if (!next) {
          return;
        }
        d.handleOpenWorkspaceBrowser(projectId, url);
      });
    }
  };
};
