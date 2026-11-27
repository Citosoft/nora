import { updateKeybinding } from "@/components/app/logic/keybindings/keybindingsStore";
import type { KeybindingUpdateRequest } from "@shared/types/keybindings/keybindings.types";
import { useCallback, useState } from "react";

const IPC_ERROR_PREFIX = /^Error invoking remote method '[^']+':\s*(Error:\s*)?/;

/** Saves keybinding edits from settings, tracking one in-flight save and the last failure. */
export function useKeybindingUpdates(): {
  saving: boolean;
  error: string | null;
  apply: (request: KeybindingUpdateRequest) => void;
  clearError: () => void;
} {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apply = useCallback((request: KeybindingUpdateRequest) => {
    setSaving(true);
    setError(null);
    void updateKeybinding(request)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message.replace(IPC_ERROR_PREFIX, "") : "Could not save the shortcut.");
      })
      .finally(() => setSaving(false));
  }, []);
  const clearError = useCallback(() => setError(null), []);
  return { saving, error, apply, clearError };
}
