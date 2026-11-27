import { KEYBINDINGS_CHANNELS } from "@shared/keybindings/gateway";
import { parseKeybindingUpdateRequest } from "@shared/keybindings/updateRequest";
import type { KeybindingsIpcDeps } from "@main/types/keybindings/keybindings.types";

export function registerKeybindingsIpc(deps: KeybindingsIpcDeps): () => void {
  deps.ipc.handle(KEYBINDINGS_CHANNELS.get, (event) => {
    if (!deps.isAllowedSender(event)) throw new Error("This window cannot read keybindings.");
    return deps.service.file();
  });
  deps.ipc.handle(KEYBINDINGS_CHANNELS.update, async (event, input) => {
    if (!deps.isAllowedSender(event)) throw new Error("This window cannot change keybindings.");
    const request = parseKeybindingUpdateRequest(input);
    if (!request) throw new Error("That keybinding change is not valid.");
    return deps.service.update(request);
  });
  const unsubscribe = deps.service.subscribe(deps.notify);
  return () => {
    unsubscribe();
    deps.ipc.removeHandler(KEYBINDINGS_CHANNELS.get);
    deps.ipc.removeHandler(KEYBINDINGS_CHANNELS.update);
  };
}
