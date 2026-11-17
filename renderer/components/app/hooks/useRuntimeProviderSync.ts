import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { missingRuntimeProviders } from "@/components/app/logic/missingRuntimeProviders";

/**
 * Keeps the execution host's runtimes in step with installed agents. When an installed agent has no runtime yet
 * (installed while Nora runs), it asks main to rediscover once for that set, so a runtime that cannot be found is not retried in a loop.
 */
export function useRuntimeProviderSync(installedToolIds: readonly string[]) {
  const { boot, request } = useNativeRuntimePorts();
  const [refreshing, setRefreshing] = useState(false);
  const attempted = useRef<string | null>(null);
  const missing = useMemo(() => missingRuntimeProviders(installedToolIds, boot.providers), [installedToolIds, boot.providers]);
  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try { await request({ kind: "refresh-providers" }); }
    catch { /* The boot keeps its previous providers; rows explain what is missing. */ }
    finally { setRefreshing(false); }
  }, [request]);
  useEffect(() => {
    const signature = missing.join(",");
    if (!signature || attempted.current === signature) return;
    attempted.current = signature;
    void refresh();
  }, [missing, refresh]);
  return { missing, refreshing, refresh };
}
