import type { AutoUpdateStatus, ForgeOAuthDevicePrompt } from "@shared/appTypes";
import type {
  AppClosingProgressPayload,
  RemoteMountOutputPayload,
  SystemBridge,
  WindowState
} from "@shared/ipc/types/systemGateway.types";
import { clipboard } from "electron";

import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createSystemBridge(): SystemBridge {
  return {
    openExternalUrl: (url) => invokeIpc("app:open-external-url", url),
    copyText: (text) => Promise.resolve(clipboard.writeText(text)),
    closeWindow: () => invokeIpc("window:close"),
    minimizeWindow: () => invokeIpc("window:minimize"),
    toggleMaximizeWindow: () => invokeIpc("window:toggle-maximize"),
    getWindowState: () => invokeIpc("window:get-state"),
    onWindowStateChanged: (listener) => subscribeToIpcEvent<WindowState>("window:state-changed", listener),
    getDetectedUserIdentity: () => invokeIpc("app:get-detected-user-identity"),
    getAppSettings: () => invokeIpc("app:get-app-settings"),
    saveAppSettings: (settings) => invokeIpc("app:save-app-settings", settings),
    relaunchApplication: (options) => invokeIpc("app:relaunch", options),
    getAnalyticsRuntimeConfig: () => invokeIpc("app:get-analytics-runtime-config"),
    getStartupDependencyReport: () => invokeIpc("app:get-startup-dependency-report"),
    installStartupDependency: (dependencyId) => invokeIpc("app:install-startup-dependency", dependencyId),
    getLinuxAptSetupStatus: () => invokeIpc("app:get-linux-apt-setup-status"),
    installLinuxAptUpdates: () => invokeIpc("app:install-linux-apt-updates"),
    getLinuxUpdateStatus: () => invokeIpc("app:get-linux-update-status"),
    getReleaseVersionStatus: () => invokeIpc("app:get-release-version-status"),
    getAutoUpdateStatus: () => invokeIpc("app:get-auto-update-status"),
    getAutoUpdateTestSupport: () => invokeIpc("app:get-auto-update-test-support"),
    simulateAutoUpdateStatus: (target) => invokeIpc("app:simulate-auto-update-status", target),
    installDownloadedUpdate: () => invokeIpc("app:install-downloaded-update"),
    onAutoUpdateStatus: (listener) => subscribeToIpcEvent<AutoUpdateStatus>("auto-update:status", listener),
    onForgeOAuthDevicePrompt: (listener) =>
      subscribeToIpcEvent<ForgeOAuthDevicePrompt>("forge-oauth:device-prompt", listener),
    getInstalledIdes: () => invokeIpc("app:get-installed-ides"),
    openProjectInIde: (ideId, projectPath) => invokeIpc("app:open-project-in-ide", ideId, projectPath),
    getRemoteConnectionOptions: () => invokeIpc("app:get-remote-connection-options"),
    installRemoteMountSupport: () => invokeIpc("app:install-remote-mount-support"),
    onRemoteMountOutput: (listener) =>
      subscribeToIpcEvent<RemoteMountOutputPayload>("remote-mount:output", listener),
    listChromeCookieProfiles: () => invokeIpc("app:list-chrome-cookie-profiles"),
    importChromeBrowserData: (profileId) => invokeIpc("app:import-chrome-browser-data", profileId),
    transcribeVoiceInput: (payload) => invokeIpc("app:transcribe-voice-input", payload),
    savePastedImage: (payload) => invokeIpc("app:save-pasted-image", payload),
    showAgentCompletionNotification: (payload) => invokeIpc("app:show-agent-completion-notification", payload),
    onAppClosingProgress: (listener) =>
      subscribeToIpcEvent<AppClosingProgressPayload>("app:closing-progress", listener),
    logAnalytics: (level, message) => invokeIpc("app:log-analytics", { level, message }),
    scanLocalAgentUsage: (request) => invokeIpc("app:scan-local-agent-usage", request)
  };
}
