import type { AppShutdown } from "@main/types/appShutdown.types";
import { importChromeBrowserDataToSession, listChromeCookieProfiles } from "@main/browserDataImport";
import { getInstalledIdes, openProjectInIde } from "@main/ideIntegration";
import { getLinuxAptSetupStatus, installLinuxAptUpdates } from "@main/linuxAptUpdates";
import { getLinuxUpdateStatus, getReleaseVersionStatus } from "@main/linuxUpdates";
import {
  downloadReleaseAsset,
  getLatestReleaseAssets,
  getReleaseInstallerScriptCommandForLocalTerminal
} from "@main/releaseDownloads";
import { getLocalAiModelStatus, installLocalAiModel } from "@main/ai/localAiModels";
import { getLocalAiRuntimeStatus, installLocalAiRuntime } from "@main/ai/localAiRuntime";
import { getLocalVoiceSetupStatus, installLocalVoiceModel } from "@main/ai/local-voice/setup";
import { isLocalVoiceModelId } from "@shared/voice/localModels";
import { transcribeVoiceInput } from "@main/ai/voiceTranscription";
import { getVoiceInputReadiness } from "@main/ai/voiceInputReadiness";
import type {
  AgentCompletionNotificationPayload,
  AppSettings,
  AppState,
  AutoUpdateStatus,
  AutoUpdateTestSupport,
  AutoUpdateTestTarget,
  BrowserCookieProfileSummary,
  BrowserDataImportResult,
  LatestReleaseAssetsResult,
  LocalLlmModelId,
  LocalVoiceModelId,
  LocalTerminalState,
  LinuxAptSetupStatus,
  LinuxUpdateStatus,
  ReleaseAssetDownloadResult,
  ReleaseVersionStatus
} from "@shared/appTypes";
import type { StartupDependencyId } from "@shared/types/startupDependency.types";
import type { VoiceInputTranscriptionPayload } from "@shared/ipc/types/systemGateway.types";
import { app, clipboard, ipcMain, session, shell } from "electron";
import {
  getAutoUpdateStatus,
  getAutoUpdateTestSupport,
  downloadAppUpdate,
  installDownloadedUpdate,
  simulateAutoUpdateStatus
} from "@main/autoUpdates";
import { detectUserIdentity } from "@main/userIdentity";
import { getStartupDependencyReport, installStartupDependency } from "@main/startupDependencies";
import { getRemoteConnectionOptions } from "@main/remoteMounts";
import { checkAppRepositoryStarred, starAppRepository } from "@main/githubRepositoryStar";
import { sampleAppResourceUsage } from "@main/resource-monitor/processResourceSampler";

interface RegisterSystemIpcDeps {
  requestQuit: AppShutdown["request"];
  parseAllowedExternalUrl: (value: string) => URL;
  showProjectPicker: () => Promise<AppState>;
  showProjectPickerAtPath: (defaultPath: string, title?: string) => Promise<AppState>;
  getWindowState: () => { isMaximized: boolean; platform: NodeJS.Platform };
  openLocalTerminal: () => Promise<{ id: string }>;
  sendTerminalInput: (sessionId: string, input: string) => Promise<void>;
  getAppSettings: () => AppSettings;
  saveAppSettings: (nextSettings: AppSettings, baseline: AppSettings) => Promise<AppSettings>;
  showAgentCompletionNotification: (payload: AgentCompletionNotificationPayload) => Promise<void>;
  getSnapshot: () => AppState;
  getLocalTerminalState: () => LocalTerminalState | null;
}

export function registerSystemIpc({
  requestQuit,
  parseAllowedExternalUrl,
  showProjectPicker,
  showProjectPickerAtPath,
  getWindowState,
  openLocalTerminal,
  sendTerminalInput,
  getAppSettings,
  saveAppSettings,
  showAgentCompletionNotification,
  getSnapshot,
  getLocalTerminalState
}: RegisterSystemIpcDeps): void {
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
  ipcMain.handle("app:get-local-voice-setup-status", (_event, modelId: unknown) => getLocalVoiceSetupStatus(requireLocalVoiceModelId(modelId)));
  ipcMain.handle("app:install-local-voice-model", (_event, modelId: unknown) => installLocalVoiceModel(requireLocalVoiceModelId(modelId)));
  ipcMain.handle("app:get-local-ai-model-status", (_event, modelId: LocalLlmModelId) =>
    getLocalAiModelStatus(modelId)
  );
  ipcMain.handle("app:get-local-ai-runtime-status", () => getLocalAiRuntimeStatus());
  ipcMain.handle("app:install-local-ai-model", (_event, modelId: LocalLlmModelId) =>
    installLocalAiModel(modelId)
  );
  ipcMain.handle("app:install-local-ai-runtime", () => installLocalAiRuntime());
  ipcMain.handle("app:get-linux-apt-setup-status", (): Promise<LinuxAptSetupStatus> => getLinuxAptSetupStatus());
  ipcMain.handle("app:install-linux-apt-updates", (): Promise<LinuxAptSetupStatus> => installLinuxAptUpdates());
  ipcMain.handle("app:get-linux-update-status", (): Promise<LinuxUpdateStatus> => getLinuxUpdateStatus());
  ipcMain.handle("app:get-release-version-status", (): Promise<ReleaseVersionStatus> => getReleaseVersionStatus());
  ipcMain.handle("app:get-resource-monitor-snapshot", () =>
    sampleAppResourceUsage(getSnapshot(), getLocalTerminalState())
  );
  ipcMain.handle("app:check-app-repository-starred", (): Promise<boolean | null> => checkAppRepositoryStarred());
  ipcMain.handle("app:star-app-repository", (): Promise<boolean> => starAppRepository());
  ipcMain.handle("app:get-auto-update-status", (): AutoUpdateStatus => getAutoUpdateStatus());
  ipcMain.handle("app:get-auto-update-test-support", (): AutoUpdateTestSupport => getAutoUpdateTestSupport());
  ipcMain.handle("app:simulate-auto-update-status", (_event, target: AutoUpdateTestTarget): AutoUpdateStatus =>
    simulateAutoUpdateStatus(target)
  );
  ipcMain.handle("app:download-app-update", () => downloadAppUpdate());
  ipcMain.handle("app:install-downloaded-update", () => {
    return installDownloadedUpdate(requestQuit);
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
  ipcMain.handle("app:save-app-settings", (_event, nextSettings: AppSettings, baseline: AppSettings) => saveAppSettings(nextSettings, baseline));
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

    return requestQuit("relaunch", () => {
      app.relaunch({ args: relaunchArgs });
      app.quit();
    });
  });
  ipcMain.handle("app:open-external-url", (_event, url: string) => {
    const parsed = parseAllowedExternalUrl(url);
    return shell.openExternal(parsed.toString());
  });
  ipcMain.handle("app:copy-text", (_event, text: string) => {
    clipboard.writeText(text);
    if (clipboard.readText() !== text) {
      throw new Error("The clipboard did not accept the copied text.");
    }
  });
  ipcMain.handle("app:read-clipboard-text", () => clipboard.readText());
  ipcMain.handle("app:open-project-in-ide", (_event, ideId: string, projectPath: string) =>
    openProjectInIde(ideId, projectPath)
  );
  ipcMain.handle("app:get-voice-input-readiness", () => getVoiceInputReadiness(getAppSettings(), {
    getLocalSetupStatus: getLocalVoiceSetupStatus
  }));
  ipcMain.handle("app:transcribe-voice-input", (_event, payload: VoiceInputTranscriptionPayload) =>
    transcribeVoiceInput(getAppSettings(), payload)
  );
}

function requireLocalVoiceModelId(value: unknown): LocalVoiceModelId {
  if (!isLocalVoiceModelId(value)) throw new Error("Unknown local voice model.");
  return value;
}
