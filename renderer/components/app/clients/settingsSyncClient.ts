import type { SettingsSyncBridge } from "@shared/types/settings-sync/sync.types";

export const settingsSyncClient: SettingsSyncBridge = {
  request: (input) => window.nora.settingsSync.request(input),
  onChanged: (listener) => window.nora.settingsSync.onChanged(listener),
  onApplied: (listener) => window.nora.settingsSync.onApplied(listener)
};
