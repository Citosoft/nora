import type { AppSettings } from "@shared/appTypes";

export function shouldOpenAnalyticsConsentDialog(
  isAppSettingsLoaded: boolean,
  analyticsConsentStatus: AppSettings["analyticsConsentStatus"],
  isOnboardingOpen: boolean
): boolean {
  return isAppSettingsLoaded && analyticsConsentStatus === "unknown" && !isOnboardingOpen;
}

export function shouldRenderLoadingOnboardingDialog(isOnboardingOpen: boolean): boolean {
  return isOnboardingOpen;
}
