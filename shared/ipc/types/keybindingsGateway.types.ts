import type { KeybindingsFile, KeybindingUpdateRequest } from "@shared/types/keybindings/keybindings.types";

export interface KeybindingsBridge {
  get(): Promise<KeybindingsFile>;
  update(request: KeybindingUpdateRequest): Promise<KeybindingsFile>;
  onChanged(listener: (file: KeybindingsFile) => void): () => void;
}
