import { KEYBINDINGS_CHANNELS } from "@shared/keybindings/gateway";
import { normalizeKeybindingsFile } from "@shared/keybindings/overrides";
import type { KeybindingsBridge } from "@shared/ipc/types/keybindingsGateway.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createKeybindingsBridge(): KeybindingsBridge {
  return {
    get: async () => normalizeKeybindingsFile(await invokeIpc(KEYBINDINGS_CHANNELS.get)),
    update: async (request) => normalizeKeybindingsFile(await invokeIpc(KEYBINDINGS_CHANNELS.update, request)),
    onChanged: (listener) => subscribeToIpcEvent<unknown>(KEYBINDINGS_CHANNELS.changed, (payload) => listener(normalizeKeybindingsFile(payload)))
  };
}
