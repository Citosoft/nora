import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { deriveNoraUpdateState } from "@/components/app/logic/noraUpdateState";
import type { UseProviderUpdateToastsResult } from "@/components/app/types/providerUpdateToasts.types";
import type { UpdateIndicators } from "@/components/app/types/updateIndicators.types";
import type { UseAppAutoUpdateResult } from "@/components/app/types/appHooks.types";
import type { UseLinuxUpdateNoticeResult } from "@/components/app/types/workflow.types";
import { useMemo } from "react";

/** Shapes provider and Nora update state into the sidebar footer indicators. */
export function useUpdateIndicators(
  providerUpdates: UseProviderUpdateToastsResult,
  autoUpdate: Pick<UseAppAutoUpdateResult, "autoUpdateStatus" | "handleInstallDownloadedUpdate">,
  linuxUpdateNotice: Pick<UseLinuxUpdateNoticeResult, "availableLinuxUpdate">,
  captureError: (error: unknown) => void
): UpdateIndicators {
  const { dismissedNotices, updateProvider } = providerUpdates;
  const { autoUpdateStatus, handleInstallDownloadedUpdate } = autoUpdate;
  const { availableLinuxUpdate } = linuxUpdateNotice;

  return useMemo(() => {
    const noraState = deriveNoraUpdateState(autoUpdateStatus, availableLinuxUpdate);
    return {
      providers: dismissedNotices.length ? { notices: dismissedNotices, onUpdate: updateProvider } : null,
      nora: noraState
        ? {
            state: noraState,
            onInstall: handleInstallDownloadedUpdate,
            onOpenRelease: () => {
              if (availableLinuxUpdate) void noraSystemClient.openExternalUrl(availableLinuxUpdate.releaseUrl).catch(captureError);
            }
          }
        : null
    };
  }, [autoUpdateStatus, availableLinuxUpdate, captureError, dismissedNotices, handleInstallDownloadedUpdate, updateProvider]);
}
