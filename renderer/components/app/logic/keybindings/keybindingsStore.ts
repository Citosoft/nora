import { keybindingsClient } from "@/components/app/clients/keybindingsClient";
import { buildKeybindingSet, detectKeybindingPlatform } from "@/components/app/logic/keybindings/keybindingSet";
import type { KeybindingSet } from "@/components/app/types/keybindings.types";
import { EMPTY_KEYBINDINGS_FILE } from "@shared/keybindings/resolve";
import type { KeybindingsFile, KeybindingUpdateRequest } from "@shared/types/keybindings/keybindings.types";

/**
 * Window-wide keybinding state. Hooks read it through `useKeybindings`; non-React code (terminal key
 * handlers) reads `getKeybindingSet()` at keystroke time so it always sees the latest bindings.
 */
const platform = detectKeybindingPlatform();
let snapshot: KeybindingSet = buildKeybindingSet(EMPTY_KEYBINDINGS_FILE, platform);
let started = false;
let changeReceived = false;
const listeners = new Set<() => void>();

function publish(file: KeybindingsFile): void {
  snapshot = buildKeybindingSet(file, platform);
  for (const listener of listeners) listener();
}

function start(): void {
  if (started) return;
  started = true;
  keybindingsClient.onChanged((file) => {
    changeReceived = true;
    publish(file);
  });
  void keybindingsClient
    .get()
    .then((file) => {
      // A change broadcast that raced the initial read is newer; keep it.
      if (!changeReceived) publish(file);
    })
    .catch((error: unknown) => console.warn("[keybindings] Using default shortcuts; could not load yours.", error));
}

export function subscribeKeybindings(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getKeybindingSet(): KeybindingSet {
  start();
  return snapshot;
}

export async function updateKeybinding(request: KeybindingUpdateRequest): Promise<void> {
  publish(await keybindingsClient.update(request));
}
