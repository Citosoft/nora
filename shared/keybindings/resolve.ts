import { parseKeyChord, platformChordSignature, toPlatformChord } from "@shared/keybindings/chord";
import { KEYBINDING_COMMANDS } from "@shared/keybindings/commands";
import type {
  Accelerator,
  KeybindingCommandDefinition,
  KeybindingConflict,
  KeybindingPlatform,
  KeybindingScope,
  KeybindingSource,
  KeybindingsFile,
  ResolvedKeybinding
} from "@shared/types/keybindings/keybindings.types";

export const KEYBINDING_PLATFORMS: readonly KeybindingPlatform[] = ["darwin", "win32", "linux"];

export const EMPTY_KEYBINDINGS_FILE: KeybindingsFile = { version: 1, overrides: {}, platformOverrides: {} };

export function defaultAcceleratorFor(command: KeybindingCommandDefinition, platform: KeybindingPlatform): Accelerator | null {
  const platformDefault = command.platformDefaults?.[platform];
  return platformDefault === undefined ? command.defaultAccelerator : platformDefault;
}

function effectiveAccelerator(
  command: KeybindingCommandDefinition,
  file: KeybindingsFile,
  platform: KeybindingPlatform
): { accelerator: Accelerator | null; source: KeybindingSource } {
  const platformOverride = file.platformOverrides[platform]?.[command.id];
  if (platformOverride !== undefined) return { accelerator: platformOverride, source: "user-platform" };
  const override = file.overrides[command.id];
  if (override !== undefined) return { accelerator: override, source: "user" };
  return { accelerator: defaultAcceleratorFor(command, platform), source: "default" };
}

function resolveCommand(command: KeybindingCommandDefinition, file: KeybindingsFile, platform: KeybindingPlatform): ResolvedKeybinding {
  const { accelerator, source } = effectiveAccelerator(command, file, platform);
  const parsed = accelerator === null ? null : parseKeyChord(accelerator);
  // Stored overrides are normalised on read, so a parse failure here means a broken registry default.
  const chord = parsed?.ok ? toPlatformChord(parsed.chord, platform) : null;
  return {
    commandId: command.id,
    scope: command.scope,
    allowInEditable: command.allowInEditable ?? false,
    accelerator: chord ? accelerator : null,
    chord,
    defaultAccelerator: defaultAcceleratorFor(command, platform),
    source
  };
}

/** Effective bindings for every registered command, in registry order (which is also match priority). */
export function resolveKeybindings(file: KeybindingsFile, platform: KeybindingPlatform): ResolvedKeybinding[] {
  return KEYBINDING_COMMANDS.map((command) => resolveCommand(command, file, platform));
}

export function keybindingScopesOverlap(left: KeybindingScope, right: KeybindingScope): boolean {
  return left === right || left === "workbench" || right === "workbench";
}

/** Groups of bound commands that share a chord on `platform` in overlapping scopes. */
export function detectKeybindingConflicts(bindings: readonly ResolvedKeybinding[], platform: KeybindingPlatform): KeybindingConflict[] {
  const bySignature = new Map<string, ResolvedKeybinding[]>();
  for (const binding of bindings) {
    if (!binding.chord) continue;
    const signature = platformChordSignature(binding.chord);
    bySignature.set(signature, [...(bySignature.get(signature) ?? []), binding]);
  }
  const conflicts: KeybindingConflict[] = [];
  for (const group of bySignature.values()) {
    const clashing = group.filter((binding) => group.some((other) => other !== binding && keybindingScopesOverlap(binding.scope, other.scope)));
    const first = clashing[0];
    if (!first?.accelerator) continue;
    conflicts.push({ platform, accelerator: first.accelerator, commandIds: clashing.map((binding) => binding.commandId) });
  }
  return conflicts;
}
