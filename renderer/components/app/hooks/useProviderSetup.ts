import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRuntimeProviderSync } from "@/components/app/hooks/useRuntimeProviderSync";
import { useStableIds } from "@/components/app/hooks/useStableIds";
import { installedProviderAgentIds, providerSetupSteps } from "@/components/app/logic/providerSetupSteps";
import type { ProviderSetupPorts } from "@/components/app/types/providerSetup.types";

const NO_CATALOG: ProviderSetupPorts["agentCatalog"] = [];

/**
 * Drives the first-provider checklist. It rescans for agents when shown and whenever the window regains focus, so
 * returning from installing or signing in updates it; a newly detected agent is connected by the runtime sync.
 */
export function useProviderSetup(setup: ProviderSetupPorts | null, visible: boolean) {
  const installedIds = useStableIds(installedProviderAgentIds(setup?.agentCatalog ?? NO_CATALOG));
  const runtimes = useRuntimeProviderSync(installedIds);
  const [scanning, setScanning] = useState(false);
  // Shell ports are rebuilt whenever app state changes, and a rescan changes app state; reading the latest
  // callback through a ref keeps the focus listener from rescanning on every rebuild.
  const refreshAgentCatalog = useRef(setup?.refreshAgentCatalog);
  useEffect(() => { refreshAgentCatalog.current = setup?.refreshAgentCatalog; });
  const rescan = useCallback(async (): Promise<void> => {
    const refresh = refreshAgentCatalog.current;
    if (!refresh) return;
    setScanning(true);
    try { await refresh(); } finally { setScanning(false); }
  }, []);
  useEffect(() => {
    if (!visible) return;
    void rescan();
    const onFocus = (): void => { void rescan(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [visible, rescan]);
  const { refresh } = runtimes;
  // Rediscovery also finds agents the catalog does not list, such as ACP agents configured by environment.
  const checkAgain = useCallback((): void => { void rescan(); void refresh(); }, [rescan, refresh]);
  const checking = scanning || runtimes.refreshing;
  const steps = useMemo(() => providerSetupSteps({ installedAgentIds: installedIds, checking }), [installedIds, checking]);
  return { steps, checking, checkAgain, openProviderSettings: setup?.openProviderSettings ?? null };
}
