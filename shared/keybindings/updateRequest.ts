import { isKeybindingCommandId } from "@shared/keybindings/commands";
import type { KeybindingUpdateRequest } from "@shared/types/keybindings/keybindings.types";

/** Narrows an untrusted IPC payload to an update request; chord validity is checked when it is applied. */
export function parseKeybindingUpdateRequest(input: unknown): KeybindingUpdateRequest | null {
  if (typeof input !== "object" || input === null) return null;
  const kind: unknown = Reflect.get(input, "kind");
  if (kind === "reset-all") return { kind };
  const commandId: unknown = Reflect.get(input, "commandId");
  if (typeof commandId !== "string" || !isKeybindingCommandId(commandId)) return null;
  if (kind === "reset") return { kind, commandId };
  const accelerator: unknown = Reflect.get(input, "accelerator");
  if (kind === "set" && (accelerator === null || typeof accelerator === "string")) return { kind, commandId, accelerator };
  return null;
}
