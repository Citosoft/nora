import type { AppToast } from "@/components/app/types/appToast.types";
import type { ProviderUpdateNotice } from "@shared/types/provider/update.types";

export type ProviderUpdateToast = Omit<AppToast, "id">;

/** `toast`: its toast is showing; `dismissed`: closed without updating; `updating`: an update was started. */
export type ProviderUpdateStatus = "toast" | "dismissed" | "updating";

export interface ProviderUpdateEntry {
  notice: ProviderUpdateNotice;
  status: ProviderUpdateStatus;
}

export interface UseProviderUpdateToastsArgs {
  checkProviderUpdates: () => Promise<ProviderUpdateNotice[]>;
  showToast: (toast: ProviderUpdateToast) => number;
  dismissToast: (toastId: number) => void;
  /** Starts the provider's install command, which installs its latest release. */
  updateProvider: (toolId: string) => Promise<void>;
}

export interface UseProviderUpdateToastsResult {
  /** Outdated providers whose toast was dismissed without updating; surfaced by the sidebar indicator. */
  dismissedNotices: ProviderUpdateNotice[];
  updateProvider: (toolId: string) => void;
}
