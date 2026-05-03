export const MAC_APPLICATION_MENU_COMMAND_CHANNEL = "mac-application-menu:command" as const;

export type MacApplicationMenuApplicationPhase = "pre-launch" | "signed-in";

export type MacApplicationMenuIdeSummary = {
  id: string;
  name: string;
};

export type MacApplicationMenuRecentWorkspace = {
  rootPath: string;
  name: string;
};

/** Serialized state from the renderer; main builds the native menu from this snapshot. */
export type MacApplicationMenuSyncPayload = {
  phase: MacApplicationMenuApplicationPhase;
  hasActiveWorkspace: boolean;
  canOpenProjectInIde: boolean;
  activeProjectRoot: string | null;
  preferredIde: MacApplicationMenuIdeSummary | null;
  idesOrderedForMenu: MacApplicationMenuIdeSummary[];
  defaultIdeId: string | null;
  recentWorkspaces: MacApplicationMenuRecentWorkspace[];
};

export type MacApplicationMenuCommand =
  | { kind: "add-workspace" }
  | { kind: "add-remote-workspace" }
  | { kind: "open-in-ide"; ideId: string }
  | { kind: "new-terminal" }
  | { kind: "new-agent" }
  | { kind: "new-browser" }
  | { kind: "refresh-workspace" }
  | { kind: "close-workspace" }
  | { kind: "open-recent-workspace"; rootPath: string; name: string }
  | { kind: "toggle-workspace-sidebar" }
  | { kind: "toggle-changes-sidebar" }
  | { kind: "toggle-local-terminal-dock" }
  | { kind: "focus-local-terminal-dock" }
  | { kind: "focus-previous-session-tab" }
  | { kind: "focus-next-session-tab" }
  | { kind: "open-keyboard-shortcuts" }
  | { kind: "open-startup-dependencies" }
  | { kind: "submit-issue" }
  | { kind: "open-about" };
