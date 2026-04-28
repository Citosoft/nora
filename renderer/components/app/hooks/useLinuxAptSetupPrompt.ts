import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { UseLinuxAptSetupPromptArgs, UseLinuxAptSetupPromptResult } from "@/components/app/types/component.types";
import type { LinuxAptSetupStatus } from "@shared/appTypes";
import { useCallback, useEffect, useState } from "react";

export function useLinuxAptSetupPrompt({
  appSettings,
  updateLinuxAptSetupPromptDismissed,
  captureError
}: UseLinuxAptSetupPromptArgs): UseLinuxAptSetupPromptResult {
  const [linuxAptSetupStatus, setLinuxAptSetupStatus] = useState<Extract<LinuxAptSetupStatus, { kind: "missing" }> | null>(null);
  const [isLinuxAptSetupDialogOpen, setIsLinuxAptSetupDialogOpen] = useState(false);
  const [linuxAptSetupErrorMessage, setLinuxAptSetupErrorMessage] = useState<string | null>(null);
  const [isInstallingLinuxAptUpdates, setIsInstallingLinuxAptUpdates] = useState(false);

  useEffect(() => {
    let mounted = true;

    noraSystemClient.getLinuxAptSetupStatus().then((status) => {
      if (!mounted) {
        return;
      }

      const nextStatus = status.kind === "missing" ? status : null;
      setLinuxAptSetupStatus(nextStatus);
      setIsLinuxAptSetupDialogOpen(Boolean(nextStatus) && !appSettings.linuxAptSetupPromptDismissed);
    }).catch((error) => {
      if (!mounted) {
        return;
      }

      captureError(error);
    });

    return () => {
      mounted = false;
    };
  }, [appSettings.linuxAptSetupPromptDismissed, captureError]);

  const closeLinuxAptSetupDialog = useCallback((): void => {
    setIsLinuxAptSetupDialogOpen(false);
    setLinuxAptSetupErrorMessage(null);
    void updateLinuxAptSetupPromptDismissed(true).catch(captureError);
  }, [captureError, updateLinuxAptSetupPromptDismissed]);

  const installLinuxAptUpdates = useCallback((): void => {
    setIsInstallingLinuxAptUpdates(true);
    setLinuxAptSetupErrorMessage(null);

    void noraSystemClient.installLinuxAptUpdates().then((status) => {
      setIsInstallingLinuxAptUpdates(false);
      if (status.kind === "configured") {
        setLinuxAptSetupStatus(null);
        setIsLinuxAptSetupDialogOpen(false);
        void updateLinuxAptSetupPromptDismissed(false).catch(captureError);
        return;
      }

      setLinuxAptSetupStatus(status.kind === "missing" ? status : null);
    }).catch((error) => {
      setIsInstallingLinuxAptUpdates(false);
      setLinuxAptSetupErrorMessage(error instanceof Error ? error.message : "Unable to enable Linux APT updates.");
    });
  }, [captureError, updateLinuxAptSetupPromptDismissed]);

  return {
    linuxAptSetupStatus,
    isLinuxAptSetupDialogOpen,
    linuxAptSetupErrorMessage,
    isInstallingLinuxAptUpdates,
    closeLinuxAptSetupDialog,
    installLinuxAptUpdates
  };
}
