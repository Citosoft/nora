import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonalizationBridge } from "@shared/ipc/types/personalizationGateway.types";
import type { PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { NativeSetupState } from "@/components/app/types/personalization.types";

export function useNativeSetup(personalizationClient: PersonalizationBridge) {
  const [state, setState] = useState<NativeSetupState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const request = useCallback(async (input: PersonalizationRequest): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { const data = await personalizationClient.request(input); if (mounted.current) setState({ status: "ready", data }); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : "Nora setup is unavailable";
      if (mounted.current) { setError(message); setState((current) => current.status === "ready" ? current : { status: "failed", message }); }
    } finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }, [personalizationClient]);
  useEffect(() => { mounted.current = true; void request({ kind: "boot" }); return () => { mounted.current = false; }; }, [request]);
  return { state, busy, error, request };
}
