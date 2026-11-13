import { syncAppearance } from "../../helpers/settingsSync";
import type { WindowSettings, WindowSettingsPort } from "@shared/types/nora-tools/settings.types";
import type { SettingsSyncService } from "@main/types/settings-sync/service.types";

export function settingsPortsFixture() {
  let window: WindowSettings = { appearance: { ...syncAppearance }, local: {
    defaultIdeId: null, forceMacTitleBarPreview: false, githubToken: "", gitlabToken: "", gitlabHost: "https://gitlab.com",
    vercelToken: "", githubAccountLabel: null, gitlabAccountLabel: null, vercelAccountLabel: null, vercelWorkspaceLinks: {}
  } };
  let enabled = false;
  const windowSettings: WindowSettingsPort = { async request(patch) {
    window = { appearance: { ...window.appearance, ...patch.appearance }, local: { ...window.local, ...patch.local } };
    return structuredClone(window);
  } };
  const settingsSync: Pick<SettingsSyncService, "request"> = { async request(input) {
    if (input.kind === "set-enabled") enabled = input.enabled;
    return { enabled, phase: enabled ? "idle" : "off", lastSyncedAt: null, message: null };
  } };
  return { windowSettings, settingsSync };
}
