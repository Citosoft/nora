import { applyKeybindingUpdate, planKeybindingOverrides } from "@shared/keybindings/overrides";
import { EMPTY_KEYBINDINGS_FILE, resolveKeybindings } from "@shared/keybindings/resolve";
import type { KeybindingsFile } from "@shared/types/keybindings/keybindings.types";
import type { KeybindingsListener, KeybindingsService, KeybindingsServiceOptions } from "@main/types/keybindings/keybindings.types";

/** Owns the user's keybinding overrides: persistence, resolution for this platform, and change fan-out. */
export function createKeybindingsService({ store, platform }: KeybindingsServiceOptions): KeybindingsService {
  let current: KeybindingsFile = EMPTY_KEYBINDINGS_FILE;
  const listeners = new Set<KeybindingsListener>();

  const commit = async (next: KeybindingsFile): Promise<KeybindingsFile> => {
    await store.save(next);
    current = next;
    for (const listener of listeners) listener(current);
    return current;
  };

  return {
    async load() {
      current = await store.load();
      for (const listener of listeners) listener(current);
    },
    file: () => current,
    resolved: () => resolveKeybindings(current, platform),
    update: (request) => commit(applyKeybindingUpdate(current, request, platform)),
    async applyKeybindingOverrides(overrides, options) {
      const plan = planKeybindingOverrides(current, overrides, options);
      if (plan.result.applied.length > 0) await commit(plan.file);
      return plan.result;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
