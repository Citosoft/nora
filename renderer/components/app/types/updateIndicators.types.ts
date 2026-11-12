import type { ProviderUpdateNotice } from "@shared/types/provider/update.types";

/** Where Nora's own update stands, as far as a persistent indicator cares. */
export type NoraUpdateState =
  | { phase: "downloading" | "installing"; latestVersion: string | null }
  | { phase: "ready"; latestVersion: string | null }
  /** Package-managed installs (Linux apt) update outside the app. */
  | { phase: "manual"; latestVersion: string };

export interface ProviderUpdatesIndicator {
  notices: ProviderUpdateNotice[];
  onUpdate(toolId: string): void;
}

export interface NoraUpdateIndicator {
  state: NoraUpdateState;
  onInstall(): void;
  onOpenRelease(): void;
}

/** Sidebar footer indicators; `null` hides an indicator. */
export interface UpdateIndicators {
  providers: ProviderUpdatesIndicator | null;
  nora: NoraUpdateIndicator | null;
}
