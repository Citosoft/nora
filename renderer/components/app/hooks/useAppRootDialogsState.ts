import { useAnalyticsConsentPrompt } from "@/components/app/hooks/useAnalyticsConsentPrompt";
import { useBrowserCookieImport } from "@/components/app/hooks/useBrowserCookieImport";
import { useLinuxAptSetupPrompt } from "@/components/app/hooks/useLinuxAptSetupPrompt";
import { useStartupDependencies } from "@/components/app/hooks/useStartupDependencies";
import type {
  UseAppRootDialogsStateArgs,
  UseAppRootDialogsStateResult
} from "@/components/app/types/useAppRootDialogsState.types";

export const useAppRootDialogsState = ({
  setUiState,
  appSettings,
  captureError,
  activeView,
  focusedBrowserTabId,
  updateAnalyticsConsentStatus,
  updateLinuxAptSetupPromptDismissed,
  updateBrowserPreferences,
  flashStatus,
  statusBar
}: UseAppRootDialogsStateArgs): UseAppRootDialogsStateResult => {
  const startupDependencies = useStartupDependencies({ setUiState });
  const analyticsConsent = useAnalyticsConsentPrompt({
    appSettings,
    isOnboardingOpen: startupDependencies.isOnboardingOpen,
    updateAnalyticsConsentStatus,
    captureError
  });
  const linuxAptSetup = useLinuxAptSetupPrompt({
    appSettings,
    updateLinuxAptSetupPromptDismissed,
    captureError
  });
  const browserCookieImport = useBrowserCookieImport({
    activeView,
    focusedBrowserTabId,
    browserDataImportPromptSeen: appSettings.browserDataImportPromptSeen,
    updateBrowserPreferences,
    captureError,
    flashStatus,
    statusBar
  });

  return {
    ...startupDependencies,
    ...analyticsConsent,
    ...linuxAptSetup,
    ...browserCookieImport
  };
};
