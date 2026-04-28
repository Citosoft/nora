import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { UseAppAutoUpdateArgs, UseAppAutoUpdateResult } from "@/components/app/types/appHooks.types";
import type { AutoUpdateStatus, ForgeOAuthDevicePrompt } from "@shared/appTypes";
import { useCallback, useEffect, useState } from "react";

export function useAppAutoUpdate({ captureError }: UseAppAutoUpdateArgs): UseAppAutoUpdateResult {
  const [autoUpdateStatus, setAutoUpdateStatus] = useState<AutoUpdateStatus | null>(null);
  const [isInstallingDownloadedUpdate, setIsInstallingDownloadedUpdate] = useState(false);
  const [forgeOAuthDevicePrompt, setForgeOAuthDevicePrompt] = useState<ForgeOAuthDevicePrompt | null>(null);

  useEffect(() => {
    let mounted = true;

    void noraSystemClient.getAutoUpdateStatus().then((status) => {
      if (mounted) {
        setAutoUpdateStatus(status);
      }
    }).catch(() => {
      if (mounted) {
        setAutoUpdateStatus(null);
      }
    });

    const unsubscribe = noraSystemClient.onAutoUpdateStatus((status) => {
      setAutoUpdateStatus(status);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    return noraSystemClient.onForgeOAuthDevicePrompt((prompt) => {
      setForgeOAuthDevicePrompt(prompt);
    });
  }, []);

  useEffect(() => {
    if (autoUpdateStatus?.kind === "downloaded" || autoUpdateStatus?.kind === "installing") {
      return;
    }

    setIsInstallingDownloadedUpdate(false);
  }, [autoUpdateStatus?.kind]);

  const handleInstallDownloadedUpdate = useCallback((): void => {
    setIsInstallingDownloadedUpdate(true);
    void noraSystemClient.installDownloadedUpdate().catch((error: unknown) => {
      setIsInstallingDownloadedUpdate(false);
      captureError(error);
    });
  }, [captureError]);

  return {
    autoUpdateStatus,
    isInstallingDownloadedUpdate,
    forgeOAuthDevicePrompt,
    setForgeOAuthDevicePrompt,
    handleInstallDownloadedUpdate
  };
}
