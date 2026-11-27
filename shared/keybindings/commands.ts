import { KEYBINDING_COMMAND_IDS } from "@shared/keybindings/commandIds";
import type { KeybindingCommandDefinition, KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";

type CommandMeta = Omit<KeybindingCommandDefinition, "id">;

const recentWorkspace = (position: number, ordinal: string): CommandMeta => ({
  title: `Open Recent Workspace ${position}`,
  description: `Open the ${ordinal} workspace in your recent list.`,
  category: "Workspaces",
  scope: "workbench",
  defaultAccelerator: `CmdOrCtrl+${position}`
});

/** Rail views and workspace tools all sit on Cmd/Ctrl+Alt: digits for rail views, mnemonic letters for tools. */
const navigation = (title: string, description: string, key: string): CommandMeta => ({
  title,
  description,
  category: "Navigation",
  scope: "workbench",
  defaultAccelerator: `CmdOrCtrl+Alt+${key}`
});

/** The single source of truth for Nora's keyboard commands and their default chords. */
const KEYBINDING_COMMAND_META: Readonly<Record<KeybindingCommandId, CommandMeta>> = {
  "open-workspace-quick-search": {
    title: "Workspace Quick Search",
    description: "Search agents, terminals, tasks, specs, notes and files in the active workspace.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+K"
  },
  "open-workspace-switcher": {
    title: "Open Workspace Switcher",
    description: "Open the keyboard-driven workspace switcher.",
    category: "Workspaces",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+Shift+K"
  },
  "toggle-workspace-sidebar": {
    title: "Toggle Sidebar",
    description: "Collapse or expand the sidebar with your threads, bots, apps and workspace tools.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+B"
  },
  "toggle-changes-sidebar": {
    title: "Toggle Changes Sidebar",
    description: "Collapse or expand the changes sidebar.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+Shift+B"
  },
  "focus-previous-session-tab": {
    title: "Previous Session Tab",
    description: "Focus the previous tab in the workspace's session tabs.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+Shift+["
  },
  "focus-next-session-tab": {
    title: "Next Session Tab",
    description: "Focus the next tab in the workspace's session tabs.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+Shift+]"
  },
  "close-active-session-tab": {
    title: "Close Active Session Tab",
    description: "Close the focused session tab (thread, terminal, browser, editor, diff or split view).",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+W",
    allowInEditable: true
  },
  "open-create-terminal": {
    title: "New Terminal",
    description: "Open a new terminal in the current workspace using your default shell and quick-launch settings.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+T"
  },
  "open-add-workspace": {
    title: "Add Workspace",
    description: "Open the add workspace flow.",
    category: "Workspaces",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+O"
  },
  "open-recent-workspace-1": recentWorkspace(1, "first"),
  "open-recent-workspace-2": recentWorkspace(2, "second"),
  "open-recent-workspace-3": recentWorkspace(3, "third"),
  "open-recent-workspace-4": recentWorkspace(4, "fourth"),
  "open-recent-workspace-5": recentWorkspace(5, "fifth"),
  "open-workspace-browser": {
    title: "New Browser",
    description: "Open a new browser tab for the current workspace.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+Shift+T"
  },
  "toggle-local-terminal-dock": {
    title: "Toggle Local Terminal Dock",
    description: "Collapse or expand the bottom local terminal dock.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+J"
  },
  "focus-local-terminal-dock": {
    title: "Focus Local Terminal Dock",
    description: "Expand the local terminal dock and move focus into it.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+Shift+J"
  },
  "open-create-agent": {
    title: "New Thread",
    description: "Start a new thread in the current workspace.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+Shift+A"
  },
  "open-settings": {
    title: "Open Settings",
    description: "Open app settings.",
    category: "Workbench",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+,"
  },
  "open-startup-dependencies": {
    title: "Open Startup Dependencies",
    description: "Open the startup dependency checklist and test dialog.",
    category: "Help",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+Alt+,"
  },
  "open-keyboard-shortcuts": {
    title: "Open Keyboard Shortcuts",
    description: "Show the available keyboard shortcuts.",
    category: "Help",
    scope: "workbench",
    defaultAccelerator: "CmdOrCtrl+/"
  },
  "show-inbox": navigation("Show Inbox", "Show the inbox of items waiting for you.", "1"),
  "show-threads": navigation("Show Threads", "Show your threads, keeping the open thread.", "2"),
  "show-bots": navigation("Show Bots", "Show your bots.", "3"),
  "show-apps": navigation("Show Apps", "Show your apps.", "4"),
  "open-workspace-tasks": navigation("Open Tasks", "Open the active workspace's task board.", "T"),
  "open-workspace-workflows": navigation("Open Workflows", "Open the active workspace's workflows.", "W"),
  "open-workspace-worktrees": navigation("Open Worktrees", "Open the active workspace's git worktrees.", "G"),
  "open-workspace-merge-requests": navigation("Open Merge Requests", "Open the active workspace's merge and pull requests.", "R"),
  "open-workspace-issues": navigation("Open Issues", "Open the active workspace's issues.", "U"),
  "open-workspace-documents": navigation("Open Documents", "Open the active workspace's documents.", "N"),
  "open-workspace-library": navigation("Open Library", "Open the active workspace's library.", "L"),
  "save-document": {
    title: "Save",
    description: "Save the file or task open in the editor.",
    category: "Editing",
    scope: "editor",
    defaultAccelerator: "CmdOrCtrl+S",
    allowInEditable: true
  },
  "submit-form": {
    title: "Submit",
    description: "Submit commit messages, review comments, browser annotations, and new app prompts.",
    category: "Editing",
    scope: "form",
    defaultAccelerator: "CmdOrCtrl+Enter",
    allowInEditable: true
  },
  "stash-composer-prompt": {
    title: "Stash Prompt",
    description: "Stash the composer draft, or restore the newest stashed prompt into an empty composer.",
    category: "Editing",
    scope: "composer",
    defaultAccelerator: "CmdOrCtrl+S",
    allowInEditable: true
  },
  "copy-terminal-selection": {
    title: "Copy Terminal Selection",
    description: "Copy the selected terminal text.",
    category: "Terminal",
    scope: "terminal",
    defaultAccelerator: "Ctrl+Shift+C",
    allowInEditable: true
  },
  "paste-into-terminal": {
    title: "Paste Into Terminal",
    description: "Paste clipboard text into the focused terminal.",
    category: "Terminal",
    scope: "terminal",
    defaultAccelerator: "Ctrl+Shift+V",
    allowInEditable: true
  }
};

export const KEYBINDING_COMMANDS: readonly KeybindingCommandDefinition[] = KEYBINDING_COMMAND_IDS.map((id) => ({
  id,
  ...KEYBINDING_COMMAND_META[id]
}));

const KEYBINDING_COMMAND_ID_SET: ReadonlySet<string> = new Set(KEYBINDING_COMMAND_IDS);

export function isKeybindingCommandId(value: string): value is KeybindingCommandId {
  return KEYBINDING_COMMAND_ID_SET.has(value);
}

export function getKeybindingCommand(id: KeybindingCommandId): KeybindingCommandDefinition {
  return { id, ...KEYBINDING_COMMAND_META[id] };
}
