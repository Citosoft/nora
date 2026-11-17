import type { AppSettings } from "@shared/appTypes";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

export function shouldOpenPersonalWorkspaceIntro(
  workspaceKind: NativeWorkspace["kind"] | undefined,
  dismissed: boolean,
  blocked: boolean
): boolean {
  return workspaceKind === "personal" && !dismissed && !blocked;
}

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
