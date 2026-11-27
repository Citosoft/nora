import { normalizeAccelerator, parseKeyChord, platformChordSignature } from "@shared/keybindings/chord";
import { getKeybindingCommand, isKeybindingCommandId } from "@shared/keybindings/commands";
import { EMPTY_KEYBINDINGS_FILE, KEYBINDING_PLATFORMS, keybindingScopesOverlap, resolveKeybindings } from "@shared/keybindings/resolve";
import type {
  KeybindingCommandId,
  KeybindingOverrideClash,
  KeybindingOverrideMap,
  KeybindingOverridesApplyOptions,
  KeybindingOverridesApplyResult,
  KeybindingOverridesInput,
  KeybindingPlatform,
  KeybindingsFile,
  KeybindingUpdateRequest
} from "@shared/types/keybindings/keybindings.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keeps known command ids with a canonical accelerator or `null`; drops everything else. */
function normalizeOverrideMap(input: unknown): KeybindingOverrideMap {
  if (!isRecord(input)) return {};
  const overrides: KeybindingOverrideMap = {};
  for (const [commandId, value] of Object.entries(input)) {
    if (!isKeybindingCommandId(commandId)) continue;
    if (value === null) {
      overrides[commandId] = null;
    } else if (typeof value === "string") {
      const accelerator = normalizeAccelerator(value);
      if (accelerator) overrides[commandId] = accelerator;
    }
  }
  return overrides;
}

/**
 * Tolerant read of `config/keybindings.json`: unknown commands, unparsable chords and malformed sections
 * are dropped rather than failing, so one bad entry never resets every binding.
 */
export function normalizeKeybindingsFile(input: unknown): KeybindingsFile {
  if (!isRecord(input)) return EMPTY_KEYBINDINGS_FILE;
  const platformOverrides: KeybindingsFile["platformOverrides"] = {};
  const rawPlatforms = isRecord(input.platformOverrides) ? input.platformOverrides : {};
  for (const platform of KEYBINDING_PLATFORMS) {
    const overrides = normalizeOverrideMap(rawPlatforms[platform]);
    if (Object.keys(overrides).length > 0) platformOverrides[platform] = overrides;
  }
  return { version: 1, overrides: normalizeOverrideMap(input.overrides), platformOverrides };
}

function withoutCommand(map: KeybindingOverrideMap | undefined, commandId: KeybindingCommandId): KeybindingOverrideMap {
  const next = { ...map };
  delete next[commandId];
  return next;
}

function withoutPlatformCommand(file: KeybindingsFile, platform: KeybindingPlatform, commandId: KeybindingCommandId): KeybindingsFile["platformOverrides"] {
  const current = file.platformOverrides[platform];
  if (!current || current[commandId] === undefined) return file.platformOverrides;
  const remaining = withoutCommand(current, commandId);
  const next = { ...file.platformOverrides };
  if (Object.keys(remaining).length > 0) next[platform] = remaining;
  else delete next[platform];
  return next;
}

/**
 * Applies an edit from the settings UI on `platform`. Edits are written to the shared overrides and clear
 * any platform override for the command on `platform`, so the edit is what the user sees take effect.
 * A chord equal to the default is stored as no override.
 */
export function applyKeybindingUpdate(file: KeybindingsFile, request: KeybindingUpdateRequest, platform: KeybindingPlatform): KeybindingsFile {
  if (request.kind === "reset-all") return EMPTY_KEYBINDINGS_FILE;
  const platformOverrides = withoutPlatformCommand(file, platform, request.commandId);
  const overrides = withoutCommand(file.overrides, request.commandId);
  if (request.kind === "reset") return { version: 1, overrides, platformOverrides };
  const accelerator = request.accelerator === null ? null : normalizeAccelerator(request.accelerator);
  if (request.accelerator !== null && !accelerator) throw new Error(`"${request.accelerator}" is not a valid shortcut.`);
  const command = getKeybindingCommand(request.commandId);
  const isDefault = accelerator === command.defaultAccelerator && !command.platformDefaults;
  return { version: 1, overrides: isDefault ? overrides : { ...overrides, [request.commandId]: accelerator }, platformOverrides };
}

function writeOverride(file: KeybindingsFile, commandId: KeybindingCommandId, accelerator: string | null, platform: KeybindingPlatform | undefined): KeybindingsFile {
  if (!platform) return { ...file, overrides: { ...file.overrides, [commandId]: accelerator } };
  return {
    ...file,
    platformOverrides: { ...file.platformOverrides, [platform]: { ...file.platformOverrides[platform], [commandId]: accelerator } }
  };
}

/** Commands bound to the same chord as `commandId` in an overlapping scope, per affected platform. */
function findRivals(file: KeybindingsFile, commandId: KeybindingCommandId, platforms: readonly KeybindingPlatform[]): Map<KeybindingCommandId, KeybindingPlatform[]> {
  const rivals = new Map<KeybindingCommandId, KeybindingPlatform[]>();
  for (const platform of platforms) {
    const bindings = resolveKeybindings(file, platform);
    const target = bindings.find((binding) => binding.commandId === commandId);
    if (!target?.chord) continue;
    const signature = platformChordSignature(target.chord);
    for (const binding of bindings) {
      if (binding.commandId === commandId || !binding.chord) continue;
      if (platformChordSignature(binding.chord) !== signature || !keybindingScopesOverlap(binding.scope, target.scope)) continue;
      rivals.set(binding.commandId, [...(rivals.get(binding.commandId) ?? []), platform]);
    }
  }
  return rivals;
}

/**
 * Applies a batch of overrides keyed by Nora command id (the importer entry point). Entries apply in input
 * order, so earlier entries win clashes with later ones under `skip`. Unknown ids and unparsable chords are
 * reported, never written.
 */
export function planKeybindingOverrides(
  file: KeybindingsFile,
  input: KeybindingOverridesInput,
  options: KeybindingOverridesApplyOptions = {}
): { file: KeybindingsFile; result: KeybindingOverridesApplyResult } {
  const onConflict = options.onConflict ?? "skip";
  const platforms = options.platform ? [options.platform] : KEYBINDING_PLATFORMS;
  const result: KeybindingOverridesApplyResult = { applied: [], conflicts: [], displaced: [], unknown: [], invalid: [] };
  let next = file;
  for (const [rawId, rawAccelerator] of Object.entries(input)) {
    if (!isKeybindingCommandId(rawId)) {
      result.unknown.push(rawId);
      continue;
    }
    const parsed = rawAccelerator === null ? null : parseKeyChord(rawAccelerator);
    if (parsed && !parsed.ok) {
      result.invalid.push({ commandId: rawId, accelerator: rawAccelerator ?? "", reason: parsed.reason });
      continue;
    }
    const accelerator = rawAccelerator === null ? null : normalizeAccelerator(rawAccelerator);
    const candidate = writeOverride(next, rawId, accelerator, options.platform);
    const rivals = accelerator === null ? new Map<KeybindingCommandId, KeybindingPlatform[]>() : findRivals(candidate, rawId, platforms);
    if (rivals.size > 0 && accelerator !== null) {
      const clash: KeybindingOverrideClash = {
        commandId: rawId,
        accelerator,
        conflictsWith: [...rivals.keys()],
        platforms: [...new Set([...rivals.values()].flat())]
      };
      result.conflicts.push(clash);
      if (onConflict === "skip") continue;
      next = [...rivals.keys()].reduce((acc, rival) => writeOverride(acc, rival, null, options.platform), candidate);
      result.displaced.push(...clash.conflictsWith.filter((rival) => !result.displaced.includes(rival)));
    } else {
      next = candidate;
    }
    result.applied.push({ commandId: rawId, accelerator });
  }
  return { file: next, result };
}

