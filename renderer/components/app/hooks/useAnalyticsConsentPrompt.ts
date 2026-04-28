import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { UseAnalyticsConsentPromptArgs, UseAnalyticsConsentPromptResult } from "@/components/app/types/component.types";
import { setAnalyticsConsentStatus, setAnalyticsRuntimeAllowed } from "@/lib/analytics";
import { useCallback, useEffect, useState } from "react";

export function useAnalyticsConsentPrompt({
  appSettings,
  isOnboardingOpen,
  updateAnalyticsConsentStatus,
  captureError
}: UseAnalyticsConsentPromptArgs): UseAnalyticsConsentPromptResult {
  const [isAnalyticsConsentDialogOpen, setIsAnalyticsConsentDialogOpen] = useState(false);
  const [analyticsRuntimeConfig, setAnalyticsRuntimeConfig] = useState<UseAnalyticsConsentPromptResult["analyticsRuntimeConfig"]>(null);

  useEffect(() => {
    let mounted = true;

    noraSystemClient.getAnalyticsRuntimeConfig().then((nextConfig) => {
      if (!mounted) {
        return;
      }

      setAnalyticsRuntimeConfig(nextConfig);
      setAnalyticsRuntimeAllowed(nextConfig.analyticsAllowedInCurrentRun);
    }).catch(captureError);

    return () => {
      mounted = false;
    };
  }, [captureError]);

  useEffect(() => {
    setAnalyticsConsentStatus(appSettings.analyticsConsentStatus);
    setIsAnalyticsConsentDialogOpen(
      appSettings.analyticsConsentStatus === "unknown" && !isOnboardingOpen
    );
  }, [appSettings.analyticsConsentStatus, isOnboardingOpen]);

  const allowAnalyticsConsent = useCallback((): void => {
    setIsAnalyticsConsentDialogOpen(false);
    void updateAnalyticsConsentStatus("granted").catch(captureError);
  }, [captureError, updateAnalyticsConsentStatus]);

  const declineAnalyticsConsent = useCallback((): void => {
    setIsAnalyticsConsentDialogOpen(false);
    void updateAnalyticsConsentStatus("declined").catch(captureError);
  }, [captureError, updateAnalyticsConsentStatus]);

  return {
    analyticsRuntimeConfig,
    isAnalyticsConsentDialogOpen,
    allowAnalyticsConsent,
    declineAnalyticsConsent
  };
}
