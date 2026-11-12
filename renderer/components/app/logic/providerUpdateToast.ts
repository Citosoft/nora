import type { ProviderUpdateToast } from "@/components/app/types/providerUpdateToasts.types";
import type { ProviderUpdateNotice } from "@shared/types/provider/update.types";

/** Long enough to read and act on a startup notice without it lingering for the whole session. */
export const PROVIDER_UPDATE_TOAST_DURATION_MS = 20_000;

export function buildProviderUpdateToast(notice: ProviderUpdateNotice, onUpdate: () => void): ProviderUpdateToast {
  return {
    title: `${notice.label} update available`,
    description: `${notice.installedVersion} → ${notice.latestVersion}`,
    variant: "info",
    durationMs: PROVIDER_UPDATE_TOAST_DURATION_MS,
    placement: "bottom-left",
    density: "compact",
    icon: { kind: "agent-tool", toolId: notice.toolId, label: notice.label },
    // Dismissal is per launch: the check runs again on the next start.
    dismissLabel: "Dismiss",
    primaryAction: { label: "Update", onClick: onUpdate }
  };
}
