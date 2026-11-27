/**
 * Stable keybinding command ids. They are persisted in `config/keybindings.json` and targeted by importers,
 * so never rename or reuse an id; retire it and add a new one instead.
 */

/** Commands handled by the app-wide window shortcut listener. */
export const WORKBENCH_KEYBINDING_COMMAND_IDS = [
  "open-workspace-quick-search",
  "open-workspace-switcher",
  "toggle-workspace-sidebar",
  "toggle-changes-sidebar",
  "focus-previous-session-tab",
  "focus-next-session-tab",
  "close-active-session-tab",
  "open-create-terminal",
  "open-add-workspace",
  "open-recent-workspace-1",
  "open-recent-workspace-2",
  "open-recent-workspace-3",
  "open-recent-workspace-4",
  "open-recent-workspace-5",
  "open-workspace-browser",
  "toggle-local-terminal-dock",
  "focus-local-terminal-dock",
  "open-create-agent",
  "open-settings",
  "open-startup-dependencies",
  "open-keyboard-shortcuts"
] as const;

/** Commands handled by the workspace navigation provider: the left rail's views and each workspace's tools. */
export const NAVIGATION_KEYBINDING_COMMAND_IDS = [
  "show-inbox",
  "show-threads",
  "show-bots",
  "show-apps",
  "open-workspace-tasks",
  "open-workspace-workflows",
  "open-workspace-worktrees",
  "open-workspace-merge-requests",
  "open-workspace-issues",
  "open-workspace-documents",
  "open-workspace-library"
] as const;

/** Commands handled by the focused surface that owns them (editor, composer, form, terminal). */
export const SURFACE_KEYBINDING_COMMAND_IDS = [
  "save-document",
  "submit-form",
  "stash-composer-prompt",
  "copy-terminal-selection",
  "paste-into-terminal"
] as const;

export const KEYBINDING_COMMAND_IDS = [
  ...WORKBENCH_KEYBINDING_COMMAND_IDS,
  ...NAVIGATION_KEYBINDING_COMMAND_IDS,
  ...SURFACE_KEYBINDING_COMMAND_IDS
] as const;

/** Recent-workspace commands by list position (index 0 opens the first recent workspace). */
export const RECENT_WORKSPACE_KEYBINDING_COMMAND_IDS = [
  "open-recent-workspace-1",
  "open-recent-workspace-2",
  "open-recent-workspace-3",
  "open-recent-workspace-4",
  "open-recent-workspace-5"
] as const satisfies readonly (typeof WORKBENCH_KEYBINDING_COMMAND_IDS)[number][];
