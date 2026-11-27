import { createJsonFileStore } from "@main/helpers/jsonFileStore";
import { normalizeKeybindingsFile } from "@shared/keybindings/overrides";
import { EMPTY_KEYBINDINGS_FILE } from "@shared/keybindings/resolve";
import type { KeybindingsFileStore, KeybindingsFileStoreOptions } from "@main/types/keybindings/keybindings.types";

export function createKeybindingsFileStore(options: KeybindingsFileStoreOptions): KeybindingsFileStore {
  return createJsonFileStore({ ...options, empty: EMPTY_KEYBINDINGS_FILE, normalize: normalizeKeybindingsFile });
}
