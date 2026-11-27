import { formatKeybindingLabel, keybindingMatchesEvent } from "@/components/app/logic/keybindings/keybindingMatching";
import { getKeybindingSet, subscribeKeybindings } from "@/components/app/logic/keybindings/keybindingsStore";
import type { KeybindingSet } from "@/components/app/types/keybindings.types";
import type { KeybindingCommandId, KeyboardChordInput, ResolvedKeybinding } from "@shared/types/keybindings/keybindings.types";
import { useCallback, useEffect, useSyncExternalStore } from "react";

export function useKeybindings(): KeybindingSet {
  return useSyncExternalStore(subscribeKeybindings, getKeybindingSet);
}

export function useKeybinding(commandId: KeybindingCommandId): ResolvedKeybinding | undefined {
  return useKeybindings().byId.get(commandId);
}

/** Display label for a command's current chord (`⌘⇧K`, `Ctrl + Shift + K`), or `null` when unbound. */
export function useKeybindingLabel(commandId: KeybindingCommandId): string | null {
  const { byId, platform } = useKeybindings();
  return formatKeybindingLabel(byId.get(commandId), platform);
}

/**
 * A keydown handler for a surface-scoped command: when the event matches the command's chord it prevents the
 * default, runs `run`, and returns true so callers can stop further key handling.
 */
export function useKeybindingKeyDown(
  commandId: KeybindingCommandId,
  run: () => void
): (event: KeyboardChordInput & { target?: EventTarget | null; preventDefault(): void }) => boolean {
  const binding = useKeybinding(commandId);
  return useCallback(
    (event) => {
      if (!keybindingMatchesEvent(binding, event)) return false;
      event.preventDefault();
      run();
      return true;
    },
    [binding, run]
  );
}

/** Runs `run` whenever the command's chord is pressed anywhere in the window while the caller is mounted. */
export function useWindowKeybinding(commandId: KeybindingCommandId, run: () => void): void {
  const binding = useKeybinding(commandId);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!keybindingMatchesEvent(binding, event)) return;
      event.preventDefault();
      event.stopPropagation();
      run();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [binding, run]);
}
