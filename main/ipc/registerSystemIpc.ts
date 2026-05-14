import { importChromeBrowserDataToSession, listChromeCookieProfiles } from "@main/browserDataImport";
import { getInstalledIdes, openProjectInIde } from "@main/ideIntegration";
import { getLinuxAptSetupStatus, installLinuxAptUpdates } from "@main/linuxAptUpdates";
import { getLinuxUpdateStatus, getReleaseVersionStatus } from "@main/linuxUpdates";
import {
  downloadReleaseAsset,
  getLatestReleaseAssets,
  getReleaseInstallerScriptCommandForLocalTerminal
} from "@main/releaseDownloads";
import { transcribeVoiceInput } from "@main/ai/voiceTranscription";
import type {
  AgentCompletionNotificationPayload,
  AnalyticsRuntimeConfig,
  AppSettings,
  AppState,
  AutoUpdateStatus,
  AutoUpdateTestSupport,
  AutoUpdateTestTarget,
  BrowserCookieProfileSummary,
  BrowserDataImportResult,
  LatestReleaseAssetsResult,
  LinuxAptSetupStatus,
  LinuxUpdateStatus,
  ReleaseAssetDownloadResult,
  ReleaseVersionStatus
} from "@shared/appTypes";
import type { StartupDependencyId } from "@shared/types/startupDependency.types";
import type { VoiceInputTranscriptionPayload } from "@shared/ipc/types/systemGateway.types";
import { app, ipcMain, session, shell } from "electron";
import {
  getAutoUpdateStatus,
  getAutoUpdateTestSupport,
  installDownloadedUpdate,
  simulateAutoUpdateStatus
} from "@main/autoUpdates";
import { detectUserIdentity } from "@main/userIdentity";
import { getStartupDependencyReport, installStartupDependency } from "@main/startupDependencies";
import { getRemoteConnectionOptions } from "@main/remoteMounts";

interface RegisterSystemIpcDeps {
  parseAllowedExternalUrl: (value: string) => URL;
  showProjectPicker: () => Promise<AppState>;
  showProjectPickerAtPath: (defaultPath: string, title?: string) => Promise<AppState>;
  getWindowState: () => { isMaximized: boolean; platform: NodeJS.Platform };
  openLocalTerminal: () => Promise<{ id: string }>;
  sendTerminalInput: (sessionId: string, input: string) => Promise<void>;
  getAppSettings: () => AppSettings;
  saveAppSettings: (nextSettings: AppSettings) => Promise<AppSettings>;
  showAgentCompletionNotification: (payload: AgentCompletionNotificationPayload) => Promise<void>;
  analyticsRuntimeConfig: AnalyticsRuntimeConfig;
}

export function registerSystemIpc({
  parseAllowedExternalUrl,
  showProjectPicker,
  showProjectPickerAtPath,
  getWindowState,
  openLocalTerminal,
  sendTerminalInput,
  getAppSettings,
  saveAppSettings,
  showAgentCompletionNotification,
  analyticsRuntimeConfig
}: RegisterSystemIpcDeps): void {
  ipcMain.handle("app:log-analytics", (_event, { level, message }: { level: "info" | "warn" | "debug" | "error"; message: string }) => {
    const logger = console[level] ?? console.log;
    logger(`[analytics] ${message}`);
  });
  ipcMain.handle("window:get-state", () => getWindowState());
  ipcMain.handle("app:choose-project", () => showProjectPicker());
  ipcMain.handle("app:choose-project-at-path", (_event, defaultPath: string, title?: string) =>
    showProjectPickerAtPath(defaultPath, title)
  );
  ipcMain.handle("app:get-remote-connection-options", () => getRemoteConnectionOptions());
  ipcMain.handle("app:get-startup-dependency-report", () => getStartupDependencyReport());
  ipcMain.handle("app:install-startup-dependency", (_event, dependencyId: StartupDependencyId) => installStartupDependency(dependencyId));
  ipcMain.handle("app:get-detected-user-identity", () => detectUserIdentity());
  ipcMain.handle("app:get-installed-ides", () => getInstalledIdes());
  ipcMain.handle("app:get-app-settings", () => getAppSettings());
  ipcMain.handle("app:list-chrome-cookie-profiles", (): BrowserCookieProfileSummary[] =>
    listChromeCookieProfiles(process.platform, process.env)
  );
  ipcMain.handle("app:import-chrome-browser-data", (_event, profileId?: string): Promise<BrowserDataImportResult> => {
    const browserSession = session.fromPartition("persist:nora-browser");
    return importChromeBrowserDataToSession(browserSession, process.platform, process.env, {}, profileId || "Default");
  });
  ipcMain.handle("app:get-analytics-runtime-config", (): AnalyticsRuntimeConfig => analyticsRuntimeConfig);
  ipcMain.handle("app:get-linux-apt-setup-status", (): Promise<LinuxAptSetupStatus> => getLinuxAptSetupStatus());
  ipcMain.handle("app:install-linux-apt-updates", (): Promise<LinuxAptSetupStatus> => installLinuxAptUpdates());
  ipcMain.handle("app:get-linux-update-status", (): Promise<LinuxUpdateStatus> => getLinuxUpdateStatus());
  ipcMain.handle("app:get-release-version-status", (): Promise<ReleaseVersionStatus> => getReleaseVersionStatus());
  ipcMain.handle("app:get-auto-update-status", (): AutoUpdateStatus => getAutoUpdateStatus());
  ipcMain.handle("app:get-auto-update-test-support", (): AutoUpdateTestSupport => getAutoUpdateTestSupport());
  ipcMain.handle("app:simulate-auto-update-status", (_event, target: AutoUpdateTestTarget): AutoUpdateStatus =>
    simulateAutoUpdateStatus(target)
  );
  ipcMain.handle("app:install-downloaded-update", () => {
    installDownloadedUpdate();
  });
  ipcMain.handle("app:get-latest-release-assets", (): Promise<LatestReleaseAssetsResult> => getLatestReleaseAssets());
  ipcMain.handle(
    "app:download-release-asset",
    (event, payload: { downloadUrl: string; fileName: string }): Promise<ReleaseAssetDownloadResult> =>
      downloadReleaseAsset(payload.downloadUrl, payload.fileName, (progress) => {
        event.sender.send("release-asset-download:progress", progress);
      })
  );
  ipcMain.handle("app:run-release-installer-in-local-terminal", async () => {
    const installCommand = getReleaseInstallerScriptCommandForLocalTerminal();
    if (!installCommand) {
      throw new Error("This platform does not have a supported installer script command.");
    }

    const localTerminal = await openLocalTerminal();
    await sendTerminalInput(localTerminal.id, `${installCommand}\r`);
  });
  ipcMain.handle("app:reveal-file-in-folder", (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });
  ipcMain.handle("app:save-app-settings", (_event, nextSettings: AppSettings) => saveAppSettings(nextSettings));
  ipcMain.handle("app:show-agent-completion-notification", (_event, payload: AgentCompletionNotificationPayload) =>
    showAgentCompletionNotification(payload)
  );
  ipcMain.handle("app:relaunch", (_event, options?: { hardwareAccelerationEnabled?: boolean }) => {
    const currentSettings = getAppSettings();
    const hardwareAccelerationEnabled =
      typeof options?.hardwareAccelerationEnabled === "boolean"
        ? options.hardwareAccelerationEnabled
        : currentSettings.hardwareAccelerationEnabled;

    const relaunchArgs = process.argv.filter((arg, index) => {
      if (index === 0) {
        return true;
      }
      return arg !== "--disable-gpu";
    });
    if (!hardwareAccelerationEnabled) {
      relaunchArgs.push("--disable-gpu");
    }

    app.relaunch({
      args: relaunchArgs
    });
    app.quit();
  });
  ipcMain.handle("app:open-external-url", (_event, url: string) => {
    const parsed = parseAllowedExternalUrl(url);
    return shell.openExternal(parsed.toString());
  });
  ipcMain.handle("app:open-project-in-ide", (_event, ideId: string, projectPath: string) =>
    openProjectInIde(ideId, projectPath)
  );
  ipcMain.handle("app:transcribe-voice-input", (_event, payload: VoiceInputTranscriptionPayload) =>
    transcribeVoiceInput(getAppSettings(), payload)
  );
}
