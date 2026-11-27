import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { shouldOpenAnalyticsConsentDialog } from "@/components/app/logic/startupDialogVisibility";
import type { UseAnalyticsConsentPromptArgs, UseAnalyticsConsentPromptResult } from "@/components/app/types/component.types";
import { useCallback, useEffect, useState } from "react";

export function useAnalyticsConsentPrompt({
  appSettings,
  isAppSettingsLoaded,
  isOnboardingOpen,
  updateAnalyticsPreferences,
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
    }).catch(captureError);

    return () => {
      mounted = false;
    };
  }, [captureError]);

  useEffect(() => {
    setIsAnalyticsConsentDialogOpen(shouldOpenAnalyticsConsentDialog(
      isAppSettingsLoaded,
      appSettings.analyticsConsentStatus,
      isOnboardingOpen
    ));
  }, [appSettings.analyticsConsentStatus, isAppSettingsLoaded, isOnboardingOpen]);

  const allowAnalyticsConsent = useCallback((): void => {
    setIsAnalyticsConsentDialogOpen(false);
    void updateAnalyticsPreferences({ analyticsConsentStatus: "granted" }).catch(captureError);
  }, [captureError, updateAnalyticsPreferences]);

  const declineAnalyticsConsent = useCallback((): void => {
    setIsAnalyticsConsentDialogOpen(false);
    void updateAnalyticsPreferences({ analyticsConsentStatus: "declined" }).catch(captureError);
  }, [captureError, updateAnalyticsPreferences]);

  return {
    analyticsRuntimeConfig,
    isAnalyticsConsentDialogOpen,
    usageStatisticsRequireConsent: analyticsRuntimeConfig?.usageStatisticsRequireConsent ?? true,
    allowAnalyticsConsent,
    declineAnalyticsConsent
  };
}
