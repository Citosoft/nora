import type { WindowUiState } from "@/components/app/types";
import type { ShortcutDefinition, ShortcutKey } from "@/components/app/types/component.types";

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: "open-workspace-quick-search",
    title: "Workspace Quick Search",
    description: "Search agents, terminals, tasks, specs, notes, and files in the active workspace.",
    category: "Workbench",
    keys: ["mod", "k"]
  },
  {
    id: "open-workspace-switcher",
    title: "Open Workspace Switcher",
    description: "Open the keyboard-driven workspace switcher.",
    category: "Workbench",
    keys: ["mod", "shift", "k"]
  },
  {
    id: "toggle-workspace-sidebar",
    title: "Toggle Workspace Sidebar",
    description: "Collapse or expand the primary workspace sidebar.",
    category: "Workbench",
    keys: ["mod", "b"]
  },
  {
    id: "toggle-changes-sidebar",
    title: "Toggle Changes Sidebar",
    description: "Collapse or expand the secondary changes sidebar.",
    category: "Workbench",
    keys: ["mod", "shift", "b"]
  },
  {
    id: "focus-previous-session-tab",
    title: "Previous Session Tab",
    description: "Focus the previous workspace session tab.",
    category: "Workbench",
    keys: ["mod", "shift", "["]
  },
  {
    id: "focus-next-session-tab",
    title: "Next Session Tab",
    description: "Focus the next workspace session tab.",
    category: "Workbench",
    keys: ["mod", "shift", "]"]
  },
  {
    id: "open-create-terminal",
    title: "New Terminal",
    description: "Open the new terminal flow for the current workspace.",
    category: "Workbench",
    keys: ["mod", "t"]
  },
  {
    id: "open-add-workspace",
    title: "Add Workspace",
    description: "Open the add workspace flow.",
    category: "Workbench",
    keys: ["mod", "o"]
  },
  {
    id: "open-recent-workspace-1",
    title: "Open Recent Workspace 1",
    description: "Open the first item in the recent workspace list.",
    category: "Workbench",
    keys: ["mod", "1"]
  },
  {
    id: "open-recent-workspace-2",
    title: "Open Recent Workspace 2",
    description: "Open the second item in the recent workspace list.",
    category: "Workbench",
    keys: ["mod", "2"]
  },
  {
    id: "open-recent-workspace-3",
    title: "Open Recent Workspace 3",
    description: "Open the third item in the recent workspace list.",
    category: "Workbench",
    keys: ["mod", "3"]
  },
  {
    id: "open-recent-workspace-4",
    title: "Open Recent Workspace 4",
    description: "Open the fourth item in the recent workspace list.",
    category: "Workbench",
    keys: ["mod", "4"]
  },
  {
    id: "open-recent-workspace-5",
    title: "Open Recent Workspace 5",
    description: "Open the fifth item in the recent workspace list.",
    category: "Workbench",
    keys: ["mod", "5"]
  },
  {
    id: "open-workspace-browser",
    title: "New Browser",
    description: "Open a new browser tab for the current workspace.",
    category: "Workbench",
    keys: ["mod", "shift", "t"]
  },
  {
    id: "toggle-local-terminal-dock",
    title: "Toggle Local Terminal Dock",
    description: "Collapse or expand the bottom local terminal dock.",
    category: "Workbench",
    keys: ["mod", "j"]
  },
  {
    id: "focus-local-terminal-dock",
    title: "Focus Local Terminal Dock",
    description: "Expand the local terminal dock and move focus into it.",
    category: "Workbench",
    keys: ["mod", "shift", "j"]
  },
  {
    id: "open-create-agent",
    title: "New Agent",
    description: "Open the new agent flow for the current workspace.",
    category: "Workbench",
    keys: ["mod", "shift", "a"]
  },
  {
    id: "open-settings",
    title: "Open Settings",
    description: "Open app settings.",
    category: "Workbench",
    keys: ["mod", ","]
  },
  {
    id: "open-startup-dependencies",
    title: "Open Startup Dependencies",
    description: "Open the startup dependency checklist and test dialog.",
    category: "Help",
    keys: ["mod", "alt", ","]
  },
  {
    id: "open-keyboard-shortcuts",
    title: "Open Keyboard Shortcuts",
    description: "Show the available keyboard shortcuts.",
    category: "Help",
    keys: ["mod", "/"]
  }
];

export function formatShortcutKeys(keys: ShortcutKey[], platform: WindowUiState["platform"]): string {
  const parts = formatShortcutKeyParts(keys, platform);
  if (platform === "darwin") {
    return parts.join("");
  }
  return parts.join(" + ");
}

export function formatShortcutKeyParts(keys: ShortcutKey[], platform: WindowUiState["platform"]): string[] {
  return keys.map((key) => formatShortcutKey(key, platform));
}

function formatShortcutKey(key: ShortcutKey, platform: WindowUiState["platform"]): string {
  if (key === "mod") {
    return platform === "darwin" ? "⌘" : "Ctrl";
  }

  if (key === "shift") {
    return platform === "darwin" ? "⇧" : "Shift";
  }

  if (key === "alt") {
    return platform === "darwin" ? "⌥" : "Alt";
  }

  return key.toUpperCase();
}
