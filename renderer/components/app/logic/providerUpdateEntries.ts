import type { ProviderUpdateEntry, ProviderUpdateStatus } from "@/components/app/types/providerUpdateToasts.types";
import type { ProviderUpdateNotice } from "@shared/types/provider/update.types";

export function createProviderUpdateEntries(notices: readonly ProviderUpdateNotice[]): ProviderUpdateEntry[] {
  return notices.map((notice) => ({ notice, status: "toast" }));
}

/** Moves one provider to `status`; an update already started is never demoted back to dismissed. */
export function setProviderUpdateStatus(entries: readonly ProviderUpdateEntry[], toolId: string, status: ProviderUpdateStatus): ProviderUpdateEntry[] {
  return entries.map((entry) =>
    entry.notice.toolId !== toolId || entry.status === "updating" ? entry : { ...entry, status }
  );
}

export function selectDismissedNotices(entries: readonly ProviderUpdateEntry[]): ProviderUpdateNotice[] {
  return entries.filter((entry) => entry.status === "dismissed").map((entry) => entry.notice);
}
