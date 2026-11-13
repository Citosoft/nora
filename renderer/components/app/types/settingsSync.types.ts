import type { AppSettings } from "@shared/appTypes";
import type { PortableAppearance, PortableSettings, SettingsSyncState } from "@shared/types/settings-sync/sync.types";

export interface SyncedAppearanceInput {
  loaded: boolean;
  appearance: PortableAppearance;
  apply(appearance: PortableAppearance): void;
  applySettings(values: Partial<PortableSettings>, expected: PortableSettings): void;
}
export interface SettingsSyncController {
  state: SettingsSyncState;
  error: string | null;
  setEnabled(enabled: boolean): void;
  sync(): void;
}
export type PortableAppKeys = Pick<AppSettings, "defaultSplitViewGridColumns" | "defaultSplitViewGridRows" | "rememberLastSplitViewPerWorkspace" | "confirmSplitViewDelete" | "showWorkspaceSessionTabs" | "agentCompletionNotificationsEnabled" | "openInternalBrowserOnNewPortDetection" | "fileEditorThemeId">;
