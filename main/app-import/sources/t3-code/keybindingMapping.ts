import { normalizeAccelerator } from "@shared/keybindings/chord";
import type { KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";
import type { AppImportKeybindingMapping, AppImportSourceKeybinding } from "@main/types/app-import/appImportSource.types";
import { T3_CODE_DEFAULT_CHORDS } from "./defaultKeybindings";

/** T3 Code command ids (packages/contracts/src/keybindings.ts) that have a Nora counterpart. */
const COMMANDS: Readonly<Record<string, KeybindingCommandId>> = {
  "sidebar.toggle": "toggle-workspace-sidebar",
  "diff.toggle": "toggle-changes-sidebar",
  "terminal.toggle": "toggle-local-terminal-dock",
  "terminal.new": "open-create-terminal",
  "thread.previous": "focus-previous-session-tab",
  "thread.next": "focus-next-session-tab",
  "commandPalette.toggle": "open-workspace-quick-search",
  "composer.stash": "stash-composer-prompt",
  "chat.new": "open-create-agent"
};

function sameChord(left: string, right: string): boolean {
  const normalizedLeft = normalizeAccelerator(left);
  return normalizedLeft !== null ? normalizedLeft === normalizeAccelerator(right) : left.toLowerCase() === right.toLowerCase();
}

export const t3CodeKeybindingMapping: AppImportKeybindingMapping = {
  sourceName: "T3 Code",
  commands: COMMANDS,
  isSourceDefault(binding: AppImportSourceKeybinding): boolean {
    const chord = binding.chord;
    if (chord === null) return false;
    return (T3_CODE_DEFAULT_CHORDS[binding.sourceCommand] ?? []).some((defaultChord) => sameChord(defaultChord, chord));
  }
};
