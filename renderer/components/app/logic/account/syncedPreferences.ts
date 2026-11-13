import type { AppSettings } from "@shared/appTypes";
import type { PortableAppearance, PortableSettings } from "@shared/types/settings-sync/sync.types";
import { appearanceSchema } from "@shared/settings-sync/contracts";
import { readStoredAccentColor, readStoredTerminalFontId, readStoredTerminalThemeId, readStoredThemeMode, readStoredUiFontId } from "@/components/app/logic/appPersistence";
import { readUserDisplayName } from "@/components/app/logic/userDisplayName";
import type { PortableAppKeys } from "@/components/app/types/settingsSync.types";

export function readPortableAppearance(): PortableAppearance {
  return { themeMode: readStoredThemeMode(), accentColor: readStoredAccentColor(), terminalFontId: readStoredTerminalFontId(),
    terminalThemeId: readStoredTerminalThemeId(), uiFontId: readStoredUiFontId(), userDisplayName: readUserDisplayName() };
}
export function mergeAppearance(current: PortableAppearance, values: Partial<PortableSettings>, expected: PortableSettings): PortableAppearance {
  const next = { ...current };
  const set = <K extends keyof PortableAppearance>(key: K, value: PortableAppearance[K]): void => { next[key] = value; };
  for (const key of appearanceSchema.keyof().options) {
    const value = values[key]; if (value !== undefined && current[key] === expected[key]) set(key, value);
  }
  return next;
}
export function mergeAppPreferences(settings: AppSettings, values: Partial<PortableSettings>, expected: PortableSettings): AppSettings {
  const next = { ...settings };
  const keys: readonly (keyof PortableAppKeys)[] = ["defaultSplitViewGridColumns", "defaultSplitViewGridRows", "rememberLastSplitViewPerWorkspace", "confirmSplitViewDelete", "showWorkspaceSessionTabs", "agentCompletionNotificationsEnabled", "openInternalBrowserOnNewPortDetection", "fileEditorThemeId"];
  const set = <K extends keyof PortableAppKeys>(key: K, value: AppSettings[K]): void => { next[key] = value; };
  for (const key of keys) { const value = values[key]; if (value !== undefined && settings[key] === expected[key]) set(key, value); }
  return next;
}
