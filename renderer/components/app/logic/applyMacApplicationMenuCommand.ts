import type { MacApplicationMenuCommand } from "@shared/types/macApplicationMenu.types";

export type MacApplicationMenuActionHandlers = {
  addWorkspace: () => void;
  addRemoteWorkspace: () => void;
  openInIde: (ideId: string) => void;
  newTerminal: () => void;
  newAgent: () => void;
  newBrowser: () => void;
  refreshWorkspace: () => void;
  closeWorkspace: () => void;
  openRecentWorkspace: (rootPath: string, name: string) => void;
  toggleWorkspaceSidebar: () => void;
  toggleChangesSidebar: () => void;
  toggleLocalTerminalDock: () => void;
  focusLocalTerminalDock: () => void;
  focusPreviousSessionTab: () => void;
  focusNextSessionTab: () => void;
  openKeyboardShortcuts: () => void;
  openStartupDependencies: () => void;
  openResourceMonitor: () => void;
  submitIssue: () => void;
  openAbout: () => void;
};

export function applyMacApplicationMenuCommand(
  command: MacApplicationMenuCommand,
  handlers: MacApplicationMenuActionHandlers
): void {
  switch (command.kind) {
    case "add-workspace":
      handlers.addWorkspace();
      return;
    case "add-remote-workspace":
      handlers.addRemoteWorkspace();
      return;
    case "open-in-ide":
      handlers.openInIde(command.ideId);
      return;
    case "new-terminal":
      handlers.newTerminal();
      return;
    case "new-agent":
      handlers.newAgent();
      return;
    case "new-browser":
      handlers.newBrowser();
      return;
    case "refresh-workspace":
      handlers.refreshWorkspace();
      return;
    case "close-workspace":
      handlers.closeWorkspace();
      return;
    case "open-recent-workspace":
      handlers.openRecentWorkspace(command.rootPath, command.name);
      return;
    case "toggle-workspace-sidebar":
      handlers.toggleWorkspaceSidebar();
      return;
    case "toggle-changes-sidebar":
      handlers.toggleChangesSidebar();
      return;
    case "toggle-local-terminal-dock":
      handlers.toggleLocalTerminalDock();
      return;
    case "focus-local-terminal-dock":
      handlers.focusLocalTerminalDock();
      return;
    case "focus-previous-session-tab":
      handlers.focusPreviousSessionTab();
      return;
    case "focus-next-session-tab":
      handlers.focusNextSessionTab();
      return;
    case "open-keyboard-shortcuts":
      handlers.openKeyboardShortcuts();
      return;
    case "open-startup-dependencies":
      handlers.openStartupDependencies();
      return;
    case "open-resource-monitor":
      handlers.openResourceMonitor();
      return;
    case "submit-issue":
      handlers.submitIssue();
      return;
    case "open-about":
      handlers.openAbout();
      return;
  }
}
