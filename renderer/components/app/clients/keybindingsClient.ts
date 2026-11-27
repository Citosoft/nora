import type { KeybindingsBridge } from "@shared/ipc/types/keybindingsGateway.types";

export const keybindingsClient: KeybindingsBridge = {
  get: () => window.nora.keybindings.get(),
  update: (request) => window.nora.keybindings.update(request),
  onChanged: (listener) => window.nora.keybindings.onChanged(listener)
};
