import * as persistence from "@/components/app/logic/appPersistence";
import { readPortableAppearance } from "@/components/app/logic/account/syncedPreferences";
import type { WindowSettings, WindowSettingsPatch } from "@shared/types/nora-tools/settings.types";
import type { SettingsSetters, WindowPreferences, WindowSettingsSetters } from "@/components/app/types/agentSettings.types";

export function readWindowSettings(): WindowSettings {
  return { appearance: readPortableAppearance(), local: {
    defaultIdeId: persistence.readStoredDefaultIdeId(), forceMacTitleBarPreview: persistence.readStoredForceMacTitleBarPreview(),
    githubToken: persistence.readStoredGithubToken(), gitlabToken: persistence.readStoredGitlabToken(),
    gitlabHost: persistence.readStoredGitlabHost(), vercelToken: persistence.readStoredVercelToken(),
    githubAccountLabel: persistence.readStoredGithubAccountLabel(), gitlabAccountLabel: persistence.readStoredGitlabAccountLabel(),
    vercelAccountLabel: persistence.readStoredVercelAccountLabel(), vercelWorkspaceLinks: persistence.readStoredVercelWorkspaceLinks()
  } };
}

function applyValues<T extends object>(values: Partial<T>, setters: SettingsSetters<T>): void {
  const apply = <K extends keyof T>(key: K): void => {
    const value = values[key];
    if (value !== undefined) setters[key](value);
  };
  // Keys have already been validated against the shared window-settings schema.
  for (const key of Object.keys(values) as (keyof T)[]) apply(key);
}

export function applyWindowSettings(patch: WindowSettingsPatch, setters: WindowSettingsSetters): void {
  const values = { ...patch.appearance, ...patch.local };
  applyValues<WindowPreferences>(values, setters);
}
