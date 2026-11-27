import { normalizeAccelerator } from "@shared/keybindings/chord";
import type { AppImportKeybinding, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";
import type { AppImportKeybindingMapping, AppImportKeybindingMappingResult, AppImportSourceKeybinding } from "@main/types/app-import/appImportSource.types";

function skippedBinding(binding: AppImportSourceKeybinding, reason: string): AppImportSkippedItem {
  return { kind: "keybinding", label: `${binding.sourceCommand}${binding.chord ? ` (${binding.chord})` : ""}`, reason };
}

/**
 * Turns a source app's stored bindings into Nora overrides. Defaults are dropped silently; bindings with no
 * Nora command, a chord Nora can't represent, or a second chord for the same command are reported as skipped.
 */
export function mapAppImportKeybindings(bindings: readonly AppImportSourceKeybinding[], mapping: AppImportKeybindingMapping): AppImportKeybindingMappingResult {
  const keybindings: AppImportKeybinding[] = [];
  const skipped: AppImportSkippedItem[] = [];
  const mapped = new Set<KeybindingCommandId>();
  for (const binding of bindings) {
    if (mapping.isSourceDefault(binding)) continue;
    const commandId = mapping.commands[binding.sourceCommand];
    if (!commandId) {
      skipped.push(skippedBinding(binding, `Nora has no command matching this ${mapping.sourceName} shortcut.`));
      continue;
    }
    const accelerator = binding.chord === null ? null : normalizeAccelerator(binding.chord);
    if (binding.chord !== null && accelerator === null) {
      skipped.push(skippedBinding(binding, "Nora can't represent this key combination."));
      continue;
    }
    if (mapped.has(commandId)) {
      skipped.push(skippedBinding(binding, "Nora keeps one shortcut per command; the first one was imported."));
      continue;
    }
    mapped.add(commandId);
    keybindings.push({ importKey: binding.importKey, sourceCommand: binding.sourceCommand, sourceChord: binding.chord, commandId, accelerator });
  }
  return { keybindings, skipped };
}
