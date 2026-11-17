import type { AppUpdateConsentDeps } from "@main/types/appUpdateConsent.types";

/** Native update checks also download and stage updates for installation on next launch. */
export function createAppUpdateConsent(deps: AppUpdateConsentDeps) {
  let checking = false;
  const isBusy = (): boolean => {
    const { kind } = deps.getStatus();
    return kind === "downloading" || kind === "downloaded" || kind === "installing";
  };

  return {
    async check(): Promise<void> {
      if (checking || isBusy()) return;
      checking = true;
      try {
        const release = await deps.checkRelease();
        // A user can accept a previously advertised update while a later check is in flight.
        if (isBusy()) return;
        if (release.kind === "error") {
          if (deps.getStatus().kind !== "available") {
            deps.setStatus({
              kind: "error",
              currentVersion: release.currentVersion,
              latestVersion: null,
              message: release.message
            });
          }
        } else {
          deps.setStatus({
            kind: release.kind,
            currentVersion: release.currentVersion,
            latestVersion: release.latestVersion,
            ...(release.kind === "available" ? {
              releaseNotes: release.releaseNotes ?? null,
              releaseUrl: release.releaseUrl
            } : {})
          });
        }
      } finally {
        checking = false;
      }
    },
    download(): void {
      const status = deps.getStatus();
      if (status.kind !== "available") {
        throw new Error("No app update is available to download.");
      }
      deps.setStatus({ ...status, kind: "downloading", releaseNotes: status.releaseNotes ?? null });
      try {
        deps.startDownload();
      } catch (error) {
        deps.setStatus(status);
        throw error;
      }
    }
  };
}
