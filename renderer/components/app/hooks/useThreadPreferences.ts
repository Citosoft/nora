import { useState } from "react";
import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { threadPreferences } from "@shared/personalization/threads";
import type { ThreadPreferencesPatch } from "@shared/types/personalization/threads.types";

export function useThreadPreferences() {
  const { boot, request } = useNativeRuntimePorts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (patch: ThreadPreferencesPatch): Promise<void> => {
    setBusy(true); setError(null);
    try { await request({ kind: "set-thread-preferences", patch }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Thread preferences could not be saved."); }
    finally { setBusy(false); }
  };
  return { preferences: threadPreferences(boot.personalization), save, busy, error };
}
