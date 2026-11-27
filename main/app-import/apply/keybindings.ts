import { getKeybindingCommand } from "@shared/keybindings/commands";
import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";
import type { AppImportKey } from "@shared/types/app-import/appImportPlan.types";
import type { KeybindingCommandId, KeybindingOverride } from "@shared/types/keybindings/keybindings.types";
import type { AppImportItemApplier } from "@main/types/app-import/appImportApply.types";
import { APPLIED, failed } from "./outcomes";

/** Applies all ticked shortcuts in one write; a shortcut that clashes with another Nora command is left out. */
export const applyKeybindings: AppImportItemApplier<"keybinding"> = async (items, context, deps) => {
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  if (!items.length) return { outcomes };
  context.report("Applying keyboard shortcuts");
  const keyByCommand = new Map<KeybindingCommandId, AppImportKey>(items.map(({ item }) => [item.commandId, item.importKey]));
  const overrides: Record<string, KeybindingOverride> = Object.fromEntries(items.map(({ item }) => [item.commandId, item.accelerator]));
  try {
    const result = await deps.keybindings.applyKeybindingOverrides(overrides, { onConflict: "skip" });
    const set = (commandId: KeybindingCommandId, outcome: AppImportItemOutcome) => {
      const key = keyByCommand.get(commandId);
      if (key) outcomes.set(key, outcome);
    };
    for (const { commandId } of result.applied) set(commandId, APPLIED);
    for (const clash of result.conflicts) {
      set(clash.commandId, { status: "skipped", reason: `Clashes with ${clash.conflictsWith.map((id) => getKeybindingCommand(id).title).join(", ")}.` });
    }
    for (const invalid of result.invalid) set(invalid.commandId, { status: "failed", message: invalid.reason });
    // An override equal to what is already bound applies nothing, which still leaves the user's shortcut in place.
    for (const { item } of items) if (!outcomes.has(item.importKey)) outcomes.set(item.importKey, APPLIED);
  } catch (error) {
    for (const { item } of items) outcomes.set(item.importKey, failed(error, "Nora couldn't save these shortcuts."));
  }
  return { outcomes };
};
