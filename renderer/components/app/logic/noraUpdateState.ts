import type { NoraUpdateState } from "@/components/app/types/updateIndicators.types";
import type { AutoUpdateStatus, LinuxUpdateStatus } from "@shared/appTypes";

/** Reduces updater and Linux release status to the update the sidebar should advertise, if any. */
export function deriveNoraUpdateState(
  autoUpdate: AutoUpdateStatus | null,
  linuxUpdate: Extract<LinuxUpdateStatus, { kind: "available" }> | null
): NoraUpdateState | null {
  switch (autoUpdate?.kind) {
    case "downloading":
    case "installing":
      return { phase: autoUpdate.kind, latestVersion: autoUpdate.latestVersion };
    case "downloaded":
      return { phase: "ready", latestVersion: autoUpdate.latestVersion };
    default:
      return linuxUpdate ? { phase: "manual", latestVersion: linuxUpdate.latestVersion } : null;
  }
}
