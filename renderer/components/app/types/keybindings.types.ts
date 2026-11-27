import type {
  KeybindingCategory,
  KeybindingCommandDefinition,
  KeybindingCommandId,
  KeybindingConflict,
  KeybindingPlatform,
  KeybindingsFile,
  ResolvedKeybinding
} from "@shared/types/keybindings/keybindings.types";

/** The renderer's view of the user's keybindings on this platform, rebuilt whenever the file changes. */
export type KeybindingSet = {
  platform: KeybindingPlatform;
  file: KeybindingsFile;
  bindings: readonly ResolvedKeybinding[];
  byId: ReadonlyMap<KeybindingCommandId, ResolvedKeybinding>;
  conflicts: readonly KeybindingConflict[];
};

/** One help-dialog / settings row: a single command, or the five recent-project commands collapsed together. */
export type KeybindingHelpRow = {
  key: string;
  title: string;
  description: string;
  label: string | null;
};

/** One command in the Keybindings settings section. */
export type KeybindingSettingsRow = {
  command: KeybindingCommandDefinition;
  binding: ResolvedKeybinding;
  label: string | null;
  defaultLabel: string | null;
  isCustomized: boolean;
  /** Titles of the commands sharing this command's chord in an overlapping scope. */
  conflictsWith: string[];
};

export type KeybindingSettingsGroup = {
  category: KeybindingCategory;
  rows: KeybindingSettingsRow[];
};

/** Handlers for the workbench-scope commands one caller owns, keyed by command id. */
export type KeyboardShortcutActions = Readonly<Partial<Record<KeybindingCommandId, () => void>>>;
