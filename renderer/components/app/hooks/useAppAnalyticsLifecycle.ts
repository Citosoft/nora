import { useAppDomainNavigation, useAppDomainWorkspaceModel, useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { trackAnalyticsEvent, trackAppLaunchEvent } from "@/lib/analytics";
import { useEffect, useRef } from "react";

export function useAppAnalyticsLifecycle({
  analyticsConsentStatus,
  analyticsAllowedInCurrentRun
}: {
  analyticsConsentStatus: "unknown" | "granted" | "declined";
  analyticsAllowedInCurrentRun: boolean;
}): void {
  const snapshot = useCanonicalAppSnapshot();
  const workspace = useAppDomainWorkspaceModel();
  const navigation = useAppDomainNavigation();
  const appLoadedRef = useRef(false);
  const appContextTrackedRef = useRef(false);

  useEffect(() => {
    if (!analyticsAllowedInCurrentRun) {
      return;
    }

    trackAppLaunchEvent();
  }, [analyticsAllowedInCurrentRun]);

  useEffect(() => {
    if (
      !snapshot ||
      appLoadedRef.current ||
      analyticsConsentStatus !== "granted" ||
      !analyticsAllowedInCurrentRun
    ) {
      return;
    }

    appLoadedRef.current = true;
    trackAnalyticsEvent("app.loaded", {
      workspaceCount: workspace.workspaces.length,
      projectId: navigation.projectId,
      projectName: workspace.project?.name ?? null,
      hasProject: Boolean(workspace.project)
    });
  }, [
    analyticsAllowedInCurrentRun,
    analyticsConsentStatus,
    navigation.projectId,
    snapshot,
    workspace.project,
    workspace.workspaces.length
  ]);

  useEffect(() => {
    if (appContextTrackedRef.current || analyticsConsentStatus !== "granted" || !analyticsAllowedInCurrentRun) {
      return;
    }

    appContextTrackedRef.current = true;
    trackAnalyticsEvent("app.context", {
      environment: __NORA_IS_PRODUCTION__ ? "production" : "development",
      platform: navigator.platform,
      appVersion: __NPM_PACKAGE_VERSION__ ?? "0.0.0"
    });
  }, [analyticsAllowedInCurrentRun, analyticsConsentStatus]);
}
