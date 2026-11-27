import type { KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";
import type { AppImportKeybindingMapping } from "@main/types/app-import/appImportSource.types";

/** Orca action ids (src/shared/keybindings/definitions-core-*.ts) that have a Nora counterpart. */
const COMMANDS: Readonly<Record<string, KeybindingCommandId>> = {
  "app.settings": "open-settings",
  "worktree.palette": "open-workspace-quick-search",
  "sidebar.left.toggle": "toggle-workspace-sidebar",
  "sidebar.right.toggle": "toggle-changes-sidebar",
  "floatingTerminal.toggle": "toggle-local-terminal-dock",
  "tab.newTerminal": "open-create-terminal",
  "tab.newAgent": "open-create-agent",
  "tab.newBrowser": "open-workspace-browser",
  "tab.close": "close-active-session-tab",
  "tab.nextAllTypes": "focus-next-session-tab",
  "tab.previousAllTypes": "focus-previous-session-tab",
  "editor.save": "save-document",
  "terminal.copySelection": "copy-terminal-selection",
  "terminal.paste": "paste-into-terminal"
};

export const orcaKeybindingMapping: AppImportKeybindingMapping = {
  sourceName: "Orca",
  commands: COMMANDS,
  // Orca's keybindings.json stores only the user's overrides; defaults live in code (keybinding-file.ts).
  isSourceDefault: () => false
};
