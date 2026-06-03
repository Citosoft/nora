import { noraAppClient } from "@/components/app/clients/noraAppClient";
import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { applyStateDelta, normalizeSnapshot } from "@/components/app/logic/appUtils";
import type { WindowUiState } from "@/components/app/types";
import type { UseAppBootstrapArgs, UseAppBootstrapResult } from "@/components/app/types/component.types";
import type { ForgeOAuthProviderConfig, InstalledIde } from "@shared/appTypes";
import { useEffect, useState } from "react";

export function useAppBootstrap({
  setUiState,
  captureError,
  initialWindowUiState
}: UseAppBootstrapArgs): UseAppBootstrapResult {
  const [windowUiState, setWindowUiState] = useState<WindowUiState>(initialWindowUiState);
  const [installedIdes, setInstalledIdes] = useState<InstalledIde[]>([]);
  const [isLoadingInstalledIdes, setIsLoadingInstalledIdes] = useState(true);
  const [forgeOAuthProviders, setForgeOAuthProviders] = useState<ForgeOAuthProviderConfig[]>([]);
  const [isLoadingForgeOAuthProviders, setIsLoadingForgeOAuthProviders] = useState(true);

  useEffect(() => {
    let mounted = true;
    let deltaFallbackSnapshotInFlight = false;

    noraAppClient.getSnapshot().then((snapshot) => {
      if (mounted) {
        setUiState((current) => ({ ...current, snapshot: normalizeSnapshot(snapshot) }));
      }
    });

    const unsubscribe = noraAppClient.onStateChanged((snapshot) => {
      setUiState((current) => ({ ...current, snapshot: normalizeSnapshot(snapshot) }));
    });
    const unsubscribeDelta = noraAppClient.onStateDelta((delta) => {
      let requiresFullReload = false;

      setUiState((current) => {
        const currentSnapshot = current.snapshot;
        if (!currentSnapshot) {
          requiresFullReload = true;
          return current;
        }

        const nextSnapshot = applyStateDelta(currentSnapshot, delta);
        if (!nextSnapshot) {
          requiresFullReload = true;
          return current;
        }

        return {
          ...current,
          snapshot: normalizeSnapshot(nextSnapshot)
        };
      });

      if (requiresFullReload && !deltaFallbackSnapshotInFlight) {
        deltaFallbackSnapshotInFlight = true;
        void noraAppClient.getSnapshot().then((snapshot) => {
          if (!mounted) {
            return;
          }
          setUiState((current) => ({ ...current, snapshot: normalizeSnapshot(snapshot) }));
        }).catch(() => {
          // ignore fallback fetch errors; next full state broadcast will recover.
        }).finally(() => {
          deltaFallbackSnapshotInFlight = false;
        });
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      unsubscribeDelta();
    };
  }, [setUiState]);

  useEffect(() => {
    let mounted = true;

    const getForgeOAuthProviders = noraIntegrationClient.getForgeOAuthProviders;
    if (typeof getForgeOAuthProviders !== "function") {
      setForgeOAuthProviders([]);
      setIsLoadingForgeOAuthProviders(false);
      return () => {
        mounted = false;
      };
    }

    getForgeOAuthProviders().then((providers) => {
      if (!mounted) {
        return;
      }

      setForgeOAuthProviders(providers);
      setIsLoadingForgeOAuthProviders(false);
    }).catch(() => {
      if (!mounted) {
        return;
      }

      setForgeOAuthProviders([]);
      setIsLoadingForgeOAuthProviders(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    noraSystemClient.getInstalledIdes().then((ides) => {
      if (!mounted) {
        return;
      }

      setInstalledIdes(ides);
      setIsLoadingInstalledIdes(false);
    }).catch(() => {
      if (!mounted) {
        return;
      }

      setInstalledIdes([]);
      setIsLoadingInstalledIdes(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    noraSystemClient.getWindowState().then((state) => {
      if (mounted) {
        setWindowUiState(state);
      }
    });

    const unsubscribe = noraSystemClient.onWindowStateChanged((state) => {
      setWindowUiState(state);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    windowUiState,
    installedIdes,
    isLoadingInstalledIdes,
    forgeOAuthProviders,
    isLoadingForgeOAuthProviders
  };
}
