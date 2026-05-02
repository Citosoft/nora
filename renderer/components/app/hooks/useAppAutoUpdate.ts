import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { UseAppAutoUpdateArgs, UseAppAutoUpdateResult } from "@/components/app/types/appHooks.types";
import type { AppToastDownloadProgress } from "@/components/app/types/appToast.types";
import type { AutoUpdateStatus, ForgeOAuthDevicePrompt } from "@shared/appTypes";
import { useCallback, useEffect, useRef, useState } from "react";

const resolveLatestVersionLabel = (status: AutoUpdateStatus): string => {
  if (status.kind === "unsupported") {
    return "Nora";
  }

  const v = status.latestVersion;
  return v ? `Nora ${v}` : "A new Nora update";
};

export const useAppAutoUpdate = ({
  captureError,
  showToast,
  dismissToast,
  updateToast
}: UseAppAutoUpdateArgs): UseAppAutoUpdateResult => {
  const [autoUpdateStatus, setAutoUpdateStatus] = useState<AutoUpdateStatus | null>(null);
  const [isInstallingDownloadedUpdate, setIsInstallingDownloadedUpdate] = useState(false);
  const [forgeOAuthDevicePrompt, setForgeOAuthDevicePrompt] = useState<ForgeOAuthDevicePrompt | null>(null);
  const autoUpdateToastIdRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    void noraSystemClient
      .getAutoUpdateStatus()
      .then((status) => {
        if (mounted) {
          setAutoUpdateStatus(status);
        }
      })
      .catch(() => {
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

  const dismissAutoUpdateToast = useCallback((): void => {
    if (autoUpdateToastIdRef.current !== null) {
      dismissToast(autoUpdateToastIdRef.current);
      autoUpdateToastIdRef.current = null;
    }
  }, [dismissToast]);

  const handleAutoUpdateToastDismissed = useCallback((toastId: number): void => {
    if (autoUpdateToastIdRef.current === toastId) {
      autoUpdateToastIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoUpdateStatus === null) {
      return;
    }

    const kind = autoUpdateStatus.kind;
    if (
      kind === "unsupported" ||
      kind === "idle" ||
      kind === "checking" ||
      kind === "up-to-date" ||
      kind === "error"
    ) {
      dismissAutoUpdateToast();
      return;
    }

    const latestVersionLabel = resolveLatestVersionLabel(autoUpdateStatus);

    if (kind === "downloading") {
      const downloadProgress: AppToastDownloadProgress =
        typeof autoUpdateStatus.downloadProgressPercent === "number"
          ? { mode: "determinate", percent: autoUpdateStatus.downloadProgressPercent }
          : { mode: "indeterminate" };

      const payload = {
        variant: "info" as const,
        title: "Downloading update",
        description: `${latestVersionLabel} is downloading in the background.`,
        downloadProgress,
        primaryAction: undefined,
        onDismissed: handleAutoUpdateToastDismissed
      };

      if (autoUpdateToastIdRef.current === null) {
        autoUpdateToastIdRef.current = showToast(payload);
      } else {
        updateToast(autoUpdateToastIdRef.current, payload);
      }
      return;
    }

    if (kind === "downloaded") {
      const payload = {
        variant: "info" as const,
        title: "Update ready to install",
        description: `${latestVersionLabel} has been downloaded and is ready to install.`,
        downloadProgress: undefined,
        primaryAction: {
          label: "Restart to install",
          onClick: handleInstallDownloadedUpdate,
          disabled: isInstallingDownloadedUpdate,
          pending: isInstallingDownloadedUpdate
        },
        onDismissed: handleAutoUpdateToastDismissed
      };

      if (autoUpdateToastIdRef.current === null) {
        autoUpdateToastIdRef.current = showToast(payload);
      } else {
        updateToast(autoUpdateToastIdRef.current, payload);
      }
      return;
    }

    if (kind === "installing") {
      const payload = {
        variant: "info" as const,
        title: "Installing update",
        description: `${latestVersionLabel} is being installed. Nora will restart when the install completes.`,
        downloadProgress: undefined,
        primaryAction: undefined,
        onDismissed: handleAutoUpdateToastDismissed
      };

      if (autoUpdateToastIdRef.current === null) {
        autoUpdateToastIdRef.current = showToast(payload);
      } else {
        updateToast(autoUpdateToastIdRef.current, payload);
      }
    }
  }, [
    autoUpdateStatus,
    dismissAutoUpdateToast,
    handleAutoUpdateToastDismissed,
    handleInstallDownloadedUpdate,
    isInstallingDownloadedUpdate,
    showToast,
    updateToast
  ]);

  return {
    autoUpdateStatus,
    isInstallingDownloadedUpdate,
    forgeOAuthDevicePrompt,
    setForgeOAuthDevicePrompt,
    handleInstallDownloadedUpdate
  };
};
