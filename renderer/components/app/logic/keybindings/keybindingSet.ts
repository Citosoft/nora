import { detectKeybindingConflicts, resolveKeybindings } from "@shared/keybindings/resolve";
import type { KeybindingPlatform, KeybindingsFile } from "@shared/types/keybindings/keybindings.types";
import type { KeybindingSet } from "@/components/app/types/keybindings.types";

export function buildKeybindingSet(file: KeybindingsFile, platform: KeybindingPlatform): KeybindingSet {
  const bindings = resolveKeybindings(file, platform);
  return {
    platform,
    file,
    bindings,
    byId: new Map(bindings.map((binding) => [binding.commandId, binding])),
    conflicts: detectKeybindingConflicts(bindings, platform)
  };
}

/** The platform this renderer runs on, for resolving and labelling chords. */
export function detectKeybindingPlatform(): KeybindingPlatform {
  if (typeof navigator === "undefined") return "linux";
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "darwin";
  if (platform.includes("win")) return "win32";
  return "linux";
}
