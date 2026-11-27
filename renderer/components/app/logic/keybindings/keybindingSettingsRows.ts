import { formatAcceleratorLabel, formatKeybindingLabel } from "@/components/app/logic/keybindings/keybindingMatching";
import type { KeybindingSet, KeybindingSettingsGroup } from "@/components/app/types/keybindings.types";
import { getKeybindingCommand, KEYBINDING_COMMANDS } from "@shared/keybindings/commands";
import type { KeybindingCategory, KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";

function conflictTitles(set: KeybindingSet, commandId: KeybindingCommandId): string[] {
  return set.conflicts
    .filter((conflict) => conflict.commandIds.includes(commandId))
    .flatMap((conflict) => conflict.commandIds.filter((id) => id !== commandId))
    .map((id) => getKeybindingCommand(id).title);
}

/** Every command with its current and default chord and any clashes, grouped by category in registry order. */
export function buildKeybindingSettingsGroups(set: KeybindingSet, query: string): KeybindingSettingsGroup[] {
  const needle = query.trim().toLowerCase();
  const groups = new Map<KeybindingCategory, KeybindingSettingsGroup>();
  for (const command of KEYBINDING_COMMANDS) {
    const binding = set.byId.get(command.id);
    if (!binding) continue;
    const label = formatKeybindingLabel(binding, set.platform);
    const haystack = `${command.title} ${command.description} ${command.category} ${label ?? ""}`.toLowerCase();
    if (needle && !haystack.includes(needle)) continue;
    const group = groups.get(command.category) ?? { category: command.category, rows: [] };
    group.rows.push({
      command,
      binding,
      label,
      defaultLabel: formatAcceleratorLabel(binding.defaultAccelerator, set.platform),
      isCustomized: binding.source !== "default",
      conflictsWith: conflictTitles(set, command.id)
    });
    groups.set(command.category, group);
  }
  return [...groups.values()];
}

/** Whether the file holds any override, on any platform (what "Reset all" would clear). */
export function hasKeybindingOverrides(set: KeybindingSet): boolean {
  return Object.keys(set.file.overrides).length > 0 || Object.keys(set.file.platformOverrides).length > 0;
}
