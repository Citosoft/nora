import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { LocalVoiceSetupControl } from "@/components/app/types/localVoiceSetup.types";
import type { LocalVoiceModelId, LocalVoiceSetupStatus } from "@shared/appTypes";
import { useCallback, useEffect, useState } from "react";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") : fallback;
}

/** Install state for one local voice model and its engine runtime. */
export function useLocalVoiceSetup(modelId: LocalVoiceModelId): LocalVoiceSetupControl {
  const [status, setStatus] = useState<LocalVoiceSetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isCurrent: () => boolean): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const next = await noraSystemClient.getLocalVoiceSetupStatus(modelId);
      if (isCurrent()) setStatus(next);
    } catch (failure) {
      if (isCurrent()) { setStatus(null); setError(errorMessage(failure, "Unable to check the local model.")); }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    let current = true;
    setStatus(null);
    void load(() => current);
    return () => { current = false; };
  }, [load]);

  const install = useCallback((): void => {
    setInstalling(true);
    setError(null);
    void noraSystemClient.installLocalVoiceModel(modelId).then(setStatus, (failure: unknown) => {
      setError(errorMessage(failure, "Unable to install the local model."));
    }).finally(() => setInstalling(false));
  }, [modelId]);

  return { status, loading, installing, error, refresh: () => void load(() => true), install };
}
