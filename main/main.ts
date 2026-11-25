import { readAnalyticsConfig } from "./helpers/analytics/config";
import { trackInstallationLaunch } from "./helpers/analytics/launch";
import { createAppInstallRequests } from "./apps/installRequests";
import { APP_INSTALL_SCHEME } from "@shared/apps/installLink";
import { appsInstallRequestedChannel } from "@shared/apps/gateway";
import { createDesktopRemoteAccess } from "./remote-access/desktop";
import { registerRemoteAccessIpc } from "./ipc/registerRemoteAccessIpc";
import { remoteAccessChangedChannel } from "@shared/remote-access/gateway";
import { createDesktopLifecycle } from "./helpers/desktop-lifecycle/desktopLifecycle";
import { createLoginItemAdapter } from "./helpers/desktop-lifecycle/loginItem";
import { createElectronTrayFactory } from "./helpers/desktop-lifecycle/electronTray";
import { countActiveWork } from "./helpers/desktop-lifecycle/activeWork";
import { createQuitConfirmation } from "./helpers/desktop-lifecycle/quitConfirmation";
import { showElectronQuitPrompt } from "./helpers/desktop-lifecycle/electronQuitPrompt";
import type { RemoteAccessService } from "./types/remote-access/service.types";
import { mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import { findEffectiveBot } from "@shared/bots/catalog";
import { registerWindowSettingsIpc } from "./ipc/registerWindowSettingsIpc";
import { createWindowSettingsPort } from "./helpers/windowSettingsPort";
import { WINDOW_SETTINGS_CHANNELS } from "@shared/nora-tools/windowSettings";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { isGitProject } from "@shared/projectVersionControl";
import { APP_RUNTIME_SETTINGS } from "@shared/constants/appRuntimeSettings";
import type {
  AnalyticsRuntimeConfig,
  AppSettings,
  AppState,
  ImportBrowserImagePayload,
  WriteWorkspaceFilePayload
} from "@shared/appTypes";
import { randomUUID } from "node:crypto";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { app, BrowserWindow, session, dialog, ipcMain, shell } from "electron";
import { openOutputFileWithSystem } from "@main/helpers/openOutputFileWithSystem";
import { createWorkerWorkspaces } from "./helpers/workerWorkspaces";
import { createNoraTerminalStore } from "./helpers/noraTerminalStore";
import { openNativeRuntime } from "./helpers/nativeRuntime";
import { withMainOwnedSettings } from "./helpers/mainOwnedSettings";
import { createWindowStartup } from "./helpers/windowStartup";
import { createAccountRuntime } from "./account/runtime";
import { ACCOUNT_SCHEME } from "./account/assets";
import { createMcpAppFrames } from "./helpers/mcpAppFrames";
import { registerAccountIpc } from "./ipc/registerAccountIpc";
import { registerSettingsSyncIpc } from "./ipc/registerSettingsSyncIpc";
import { createSettingsSyncService } from "./settings-sync/service";
import { createSettingsUpdates } from "./helpers/settingsUpdates";
import { SYNC_CHANNELS } from "@shared/settings-sync/contracts";
import { createAppShutdown } from "./helpers/appShutdown";
import { registerConversationIpc } from "./ipc/registerConversationIpc";
import { registerPersonalizationIpc } from "./ipc/registerPersonalizationIpc";
import { registerBotMemoryIpc } from "./ipc/registerBotMemoryIpc";
import { registerBotRoutineIpc } from "./ipc/registerBotRoutineIpc";
import { registerConnectorIpc } from "./ipc/registerConnectorIpc";
import { registerConnectorAuthPromptIpc } from "./ipc/registerConnectorAuthPromptIpc";
import { registerAppsIpc } from "./ipc/registerAppsIpc";
import { createAppFileDialogs } from "./apps/appFileDialogs";
import { appsBuildingChannel, appsChangedChannel, appsDataChannel } from "@shared/apps/gateway";
import { connectorsChangedChannel } from "@shared/connectors/gateway";
import { connectorAuthPromptsChangedChannel } from "@shared/connectors/authPrompt";
import { registerSecretIpc } from "./ipc/registerSecretIpc";
import { secretPromptsChangedChannel, secretVaultChangedChannel } from "@shared/secrets/gateway";
import { registerChatBranchIpc } from "./ipc/registerChatBranchIpc";
import { registerDirectContextIpc } from "./ipc/registerDirectContextIpc";
import { botRoutinesChangedChannel } from "@shared/bots/routines/gateway";
import { startInboxRuntime } from "./inbox/runtime";
import { registerInboxIpc } from "./ipc/registerInboxIpc";
import type { InboxRuntime } from "./types/inbox/inboxRuntime.types";
import { personalizationChangedChannel } from "@shared/personalization/gateway";
import type { NativeRuntime } from "./types/native-runtime/runtime.types";
import path from "node:path";
import { AppSettingsStore } from "./appSettingsStore";
import {
  initializeAutoUpdates,
  onAutoUpdateStatusChanged
} from "./autoUpdates";
import { resolveHardwareAccelerationEnabledAtStartup } from "./hardwareAcceleration";
import { parseLaunchCommand } from "./launchCommand";
import { getAppSettingsPath, getProjectsIndexPath, getRecentProjectsPath, getSessionsIndexPath, getToolConfigPath, getStateDir, getNoraRoot } from "./noraPaths";
import { applyLinuxDesktopIdentity, applyMacDockIcon as applyMacDockIconHelper, getAppIcon as getAppIconHelper, pathIsWithinAnyMount } from "./helpers/appRuntimeAssets";
import { getImportedImageTargetPath } from "./helpers/browserImageImport";
import { createLaunchCommandQueueController } from "./helpers/launchCommandQueue";
import { createMainWindowNotifications } from "./helpers/mainWindowNotifications";
import { attachMainWindowRecovery } from "./helpers/mainWindowRecovery";
import { createMainUserInteractionsController } from "./helpers/mainUserInteractions";
import { createProjectWorkspace } from "./helpers/projectWorkspaceCreation";
import { handleSquirrelLifecycle, loadEnvFile } from "./helpers/startupRuntime";
import { configureWebviewGuests, isAllowedBrowserGuestUrl } from "./helpers/webviewSecurity";
import { attachCloseSessionTabShortcutForwarding } from "./helpers/closeSessionTabShortcutForwarding";
import {
  attachWindowStateListeners as attachWindowStateListenersHelper,
  focusMainWindow as focusMainWindowHelper,
  getWindowState as getWindowStateHelper,
  shutdownMainWindow as shutdownMainWindowHelper,
  watchRendererDist as watchRendererDistHelper
} from "./helpers/windowLifecycle";
import {
  parseAllowedExternalUrl as parseAllowedExternalUrlHelper,
  validateImportBrowserImagePayload as validateImportBrowserImagePayloadHelper,
  validateMoveWorkspaceFilePayload as validateMoveWorkspaceFilePayloadHelper,
  validateWriteWorkspaceFilePayload as validateWriteWorkspaceFilePayloadHelper
} from "./helpers/ipcValidation";
import { deriveAppDomainEvents } from "./helpers/deriveAppDomainEvents";
import { buildStateDelta, compactStateForRenderer } from "./helpers/stateSnapshot";
import { createStateBroadcastController } from "./helpers/stateBroadcast";
import { registerDeploymentIpc } from "./ipc/registerDeploymentIpc";
import { registerForgeIpc } from "./ipc/registerForgeIpc";
import { registerRemoteIpc } from "./ipc/registerRemoteIpc";
import { Orchestrator } from "./orchestrator";
import { registerAgentUsageIpc } from "./ipc/registerAgentUsageIpc";
import { registerSessionIpc } from "./ipc/registerSessionIpc";
import { registerSystemIpc } from "./ipc/registerSystemIpc";
import { registerToolingIpc } from "./ipc/registerToolingIpc";
import { registerMacApplicationMenuIpc } from "./ipc/registerMacApplicationMenuIpc";
import { registerLoopIpc } from "./ipc/registerLoopIpc";
import { registerWindowIpc } from "./ipc/registerWindowIpc";
import { registerWorkspaceIpc } from "./ipc/registerWorkspaceIpc";
import type { OrchestratorFacade } from "./types/orchestratorFacade.types";
import { unmountRemoteWorkspace } from "./remoteMounts";
import type { MainServices } from "./services/mainServices";
import { createLoopStore } from "./loops/loopStore";
import { createLoopRunner } from "./loops/loopRunner";
import { createLoopThreadRuntime } from "./loops/threadRuntime";
import type { LoopRunner } from "./types/loopRunner.types";
import { createWorktreeCheckoutSync, readyWorktreePaths } from "./helpers/worktreeCheckoutSync";
import { applyAppProfile } from "./helpers/appProfile";

// First statement: everything below reads Nora state paths or Electron userData.
applyAppProfile(app, { homeDirectory: os.homedir(), productName: APP_SHORT_NAME });

let mainWindow: BrowserWindow | null = null;
let orchestrator: OrchestratorFacade;
let services: MainServices;
let nativeRuntime: NativeRuntime;
let loopRunner: LoopRunner;
let remoteAccess: RemoteAccessService | null = null;
let stopRendererWatcher: (() => void) | null = null;
let isClosingMainWindow = false;
const windowStartup = createWindowStartup({
  hasWindow: () => !!mainWindow && !mainWindow.isDestroyed(),
  createWindow,
  showWindow: focusMainWindow
});
const desktopLifecycle = createDesktopLifecycle({
  platform: process.platform,
  readSettings: () => appSettings.lifecycle,
  getRemoteAccess: () => remoteAccess,
  getMainWindow: () => mainWindow,
  showMainWindow: () => windowStartup.activate(),
  quit: () => app.quit(),
  createTray: createElectronTrayFactory(path.join(__dirname, "..", "renderer"), process.platform),
  loginItem: createLoginItemAdapter({ platform: process.platform, app,
    fs: { mkdir: async (directory) => { await mkdir(directory, { recursive: true }); },
      writeFile: async (file, content) => { await writeFile(file, content, { mode: 0o600 }); },
      removeFile: async (file) => { await rm(file, { force: true }); } },
    env: process.env, homeDirectory: os.homedir(), execPath: process.execPath, argv: process.argv,
    log: console.error }),
  log: console.error
});
const appShutdown = createAppShutdown({
  confirmQuit: createQuitConfirmation({
    countActiveWork: () => countActiveWork({ conversations: nativeRuntime?.host.summaries() ?? [],
      agents: services?.snapshot.getSnapshot().agents ?? [] }),
    showPrompt: (prompt) => showElectronQuitPrompt(prompt, mainWindow), log: console.error
  }),
  shutdown: async () => {
    desktopLifecycle.dispose();
    await remoteAccess?.shutdown();
    await settingsSync.dispose();
    accountRuntime.dispose();
    loopRunner?.dispose();
    inbox?.stop();
    await nativeRuntime?.shutdown();
    if (mainWindow) await shutdownMainWindow();
  },
  quit: () => app.quit(),
  onFailure: (message) => console.error("Nora shutdown failed:", message)
});
const appSettingsStore = new AppSettingsStore(getAppSettingsPath());
let appSettings: AppSettings = DEFAULT_APP_SETTINGS;
let inbox: InboxRuntime | null = null;
const windowSettingsPort = createWindowSettingsPort({ send(request) {
  if (!mainWindow || mainWindow.isDestroyed()) throw new Error("Open Nora to change window preferences.");
  mainWindow.webContents.send(WINDOW_SETTINGS_CHANNELS.request, request);
} });
const settingsUpdates = createSettingsUpdates({ read: () => appSettings,
  save: async (next) => { appSettings = await appSettingsStore.save(next); return appSettings; },
  onSaved: () => { settingsSync.localChanged(); desktopLifecycle.settingsChanged(); }
});
const workspaceLoadingTimingByProject = new Map<string, { startedAt: number; lastStepAt: number }>();
const SQUIRREL_WINDOW_LIFETIME_MS = APP_RUNTIME_SETTINGS.main.squirrelWindowLifetimeMs;
const STATE_BROADCAST_INTERVAL_MS = APP_RUNTIME_SETTINGS.main.stateBroadcastIntervalMs;
const appInstallRequests = createAppInstallRequests((id) => {
  if (isDevelopmentMode) console.info(`[nora apps] Received install link: ${id}`);
  windowStartup.activate();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(appsInstallRequestedChannel, id);
});

const DEV_ANALYTICS_SWITCH = APP_RUNTIME_SETTINGS.main.devAnalyticsSwitch;
const isDevelopmentMode = process.env.NORA_DEV_WATCH === "1";
const devModeAnalyticsEnabled = app.commandLine.hasSwitch(DEV_ANALYTICS_SWITCH);
const MAX_IMPORTED_IMAGE_BYTES = APP_RUNTIME_SETTINGS.main.maxImportedImageBytes;
const EXTERNAL_URL_ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(APP_RUNTIME_SETTINGS.main.externalUrlAllowedProtocols);
const analyticsRuntimeConfig: AnalyticsRuntimeConfig = {
  isDevelopmentMode,
  devModeAnalyticsSwitch: DEV_ANALYTICS_SWITCH,
  devModeAnalyticsEnabled,
  analyticsAllowedInCurrentRun: !isDevelopmentMode || devModeAnalyticsEnabled
};

function configureMediaPermissions(): void {
  const ses = session.defaultSession;
  if (!ses) {
    return;
  }

  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === "media") {
      callback(true);
      return;
    }
    callback(false);
  });

  ses.setPermissionCheckHandler((_webContents, permission) => permission === "media");
}

const {
  notifyWindowStateChanged,
  notifyAppClosingProgress,
  notifyTerminalData,
  notifyLocalTerminalChanged,
  notifyRemoteMountOutput,
  notifyToolSkillInstallOutput,
  notifyWorkspaceTasksChanged,
  notifyWorkspaceLoadingProgress,
  notifyVercelRuntimeLogEvent,
  notifyAutoUpdateStatus,
  notifyForgeOAuthDevicePrompt
} = createMainWindowNotifications({
  getMainWindow: () => mainWindow,
  getWindowState,
  workspaceLoadingTimingByProject
});

const {
  notifyStateChanged,
  scheduleStateChanged,
  setLastBroadcastSnapshot
} = createStateBroadcastController({
  getMainWindow: () => mainWindow,
  compactStateForRenderer,
  buildStateDelta,
  deriveAppDomainEvents,
  stateBroadcastIntervalMs: STATE_BROADCAST_INTERVAL_MS
});

const { enqueueParsedLaunchCommand, flushLaunchCommands } = createLaunchCommandQueueController({
  parseLaunchCommand,
  getAppPath: () => app.getAppPath(),
  withSnapshot,
  selectProject: (projectRoot) => services.workspace.selectProject(projectRoot),
  createWorkspaceTask: (projectId, content) => services.workspace.createWorkspaceTask(projectId, content),
  canHandle: () => Boolean(mainWindow && !mainWindow.isDestroyed() && orchestrator)
});

const {
  showAgentCompletionNotification,
  showProjectPicker,
  showProjectPickerAtPath,
  chooseMountedProject
} = createMainUserInteractionsController({
  getMainWindow: () => mainWindow,
  getAppSettings: () => appSettings,
  getAppIcon,
  getSnapshot: () => services.snapshot.getSnapshot(),
  withSnapshot,
  compactStateForRenderer,
  focusMainWindow,
  focusAgent: (agentId) => services.session.focusAgent(agentId),
  onFocusAgentSnapshot: (snapshot) => {
    scheduleStateChanged(snapshot, { preferDelta: false });
  },
  onFocusAgentError: (error) => {
    console.error("Failed to focus agent from notification.", error);
  },
  selectProject: (projectRoot) => services.workspace.selectProject(projectRoot),
  unmountRemoteWorkspace
});

function parseAllowedExternalUrl(value: string): URL {
  return parseAllowedExternalUrlHelper(value, EXTERNAL_URL_ALLOWED_PROTOCOLS);
}

function validateMoveWorkspaceFilePayload(payload: { projectId: string; fromPath: string; toPath: string }): void {
  validateMoveWorkspaceFilePayloadHelper(payload);
}

function validateWriteWorkspaceFilePayload(payload: WriteWorkspaceFilePayload): void {
  validateWriteWorkspaceFilePayloadHelper(payload);
}

function validateImportBrowserImagePayload(payload: ImportBrowserImagePayload): void {
  validateImportBrowserImagePayloadHelper(payload, EXTERNAL_URL_ALLOWED_PROTOCOLS);
}

async function importBrowserImageToWorkspace(payload: ImportBrowserImagePayload): Promise<AppState> {
  console.log("[nora main] importBrowserImageToWorkspace started", payload);
  validateImportBrowserImagePayload(payload);
  let contentType: string | null = payload.mimeType || null;
  let targetPath: string;
  let buffer: Buffer;

  if (payload.data) {
    buffer = Buffer.from(payload.data);
    targetPath = getImportedImageTargetPath(payload, contentType);
    console.log("[nora main] importBrowserImageToWorkspace received binary data", {
      mimeType: contentType,
      byteLength: buffer.byteLength,
      targetPath
    });
  } else {
    if (!payload.sourceUrl) {
      throw new Error("Dropped image did not include file data or a source URL.");
    }

    const browserSession = session.fromPartition("persist:nora-browser");
    const sourceUrl = parseAllowedExternalUrl(payload.sourceUrl).toString();
    const response = await browserSession.fetch(sourceUrl);
    console.log("[nora main] importBrowserImageToWorkspace fetched", {
      sourceUrl: payload.sourceUrl,
      resolvedUrl: response.url,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type")
    });
    if (!response.ok) {
      throw new Error(`Image download failed with status ${response.status}.`);
    }

    contentType = response.headers.get("content-type");
    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      throw new Error(`Dropped content is not an image (${contentType}).`);
    }

    targetPath = getImportedImageTargetPath(payload, contentType, response.url || payload.sourceUrl);
    buffer = Buffer.from(await response.arrayBuffer());
  }
  if (buffer.byteLength > MAX_IMPORTED_IMAGE_BYTES) {
    throw new Error(`Dropped image exceeds ${Math.round(MAX_IMPORTED_IMAGE_BYTES / (1024 * 1024))}MB size limit.`);
  }
  console.log("[nora main] importBrowserImageToWorkspace saving", {
    projectId: payload.projectId,
    rootPath: payload.rootPath,
    directoryPath: payload.directoryPath,
    targetPath,
    byteLength: buffer.byteLength
  });

  return services.workspace.importWorkspaceBinaryFile({
    projectId: payload.projectId,
    path: targetPath,
    rootPath: payload.rootPath,
    content: buffer
  });
}

loadEnvFile(process.cwd());

const shouldExitForSquirrelLifecycle = handleSquirrelLifecycle(SQUIRREL_WINDOW_LIFETIME_MS);
const hasSingleInstanceLock = shouldExitForSquirrelLifecycle ? false : app.requestSingleInstanceLock();
const mcpAppFrames = createMcpAppFrames(ACCOUNT_SCHEME);
const accountRuntime = createAccountRuntime({
  configPath: path.join(__dirname, "..", "runtime", "account-config.json"),
  rendererDirectory: path.join(__dirname, "..", "renderer"),
  mainWindow: () => mainWindow,
  onSessionChanged: () => { settingsSync.sessionChanged(); remoteAccess?.sessionChanged(); },
  hostedFrames: (url) => mcpAppFrames.respond(url)
});
const settingsSync = createSettingsSyncService({ path: path.join(getStateDir(), "settings-sync.json"),
  client: accountRuntime.cloud, session: accountRuntime.session, readSettings: () => appSettings,
  updateSettings: settingsUpdates.update, providers: () => nativeRuntime.personalization.state().providers,
  onSettingsApplied: () => nativeRuntime.personalization.publish(),
  notify: (state) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(SYNC_CHANNELS.changed, state); },
  applied: (input) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(SYNC_CHANNELS.applied, input); }
});

if (!shouldExitForSquirrelLifecycle && !hasSingleInstanceLock) {
  app.quit();
}

const hardwareAccelerationEnabledAtStartup = shouldExitForSquirrelLifecycle
  ? true
  : resolveHardwareAccelerationEnabledAtStartup(getAppSettingsPath(), process.env);

if (!shouldExitForSquirrelLifecycle && !hardwareAccelerationEnabledAtStartup) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
}

if (!shouldExitForSquirrelLifecycle) {
  app.setName(APP_SHORT_NAME);
  applyLinuxDesktopIdentity();
}

if (!shouldExitForSquirrelLifecycle) {
  initializeAutoUpdates();
}

function getAppIcon() {
  return getAppIconHelper(__dirname);
}

function applyMacDockIcon(): void {
  applyMacDockIconHelper(getAppIcon());
}

function getWindowState(): { isMaximized: boolean; platform: NodeJS.Platform } {
  return getWindowStateHelper(mainWindow);
}

function createWindow(): void {
  const startHidden = desktopLifecycle.takeStartHidden();
  mainWindow = new BrowserWindow({
    show: !startHidden,
    width: 1480,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#0b0d12",
    title: APP_SHORT_NAME,
    icon: getAppIcon(),
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.webContents.on("will-attach-webview", (event, webPreferences, params) => {
    if (!isAllowedBrowserGuestUrl(params.src)) {
      event.preventDefault();
      return;
    }

    delete webPreferences.preload;

    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
  });

  if (process.platform === "linux") {
    mainWindow.setIcon(getAppIcon());
  }

  mainWindow.setMenuBarVisibility(false);
  attachWindowStateListeners(mainWindow);
  attachCloseSessionTabShortcutForwarding(mainWindow);
  attachMainWindowRecovery({
    window: mainWindow,
    isClosing: () => isClosingMainWindow,
    quit: () => app.quit()
  });
  if (!startHidden) mainWindow.maximize();

  void accountRuntime.load(mainWindow).catch((error: unknown) => {
    console.error("Nora's renderer could not load:", error);
    dialog.showErrorBox("Nora could not open", "Your local settings could not be restored. Restart Nora to try again.");
  });

  if (process.env.NORA_DEV_WATCH === "1") {
    stopRendererWatcher?.();
    stopRendererWatcher = watchRendererDist();
  }

  mainWindow.on("close", (event) => {
    if (isClosingMainWindow) {
      return;
    }

    event.preventDefault();
    if (appShutdown.isQuitting() || !desktopLifecycle.retainWindowOnClose()) void shutdownMainWindow();
  });

  mainWindow.on("closed", () => {
    stopRendererWatcher?.();
    stopRendererWatcher = null;
    isClosingMainWindow = false;
    mainWindow = null;
    if (desktopLifecycle.shouldQuitWhenWindowsClosed()) app.quit();
  });
}

function focusMainWindow(): void {
  focusMainWindowHelper(mainWindow);
}

async function shutdownMainWindow(): Promise<void> {
  await shutdownMainWindowHelper({
    getMainWindow: () => mainWindow,
    getIsClosing: () => isClosingMainWindow,
    setIsClosing: (nextValue) => {
      isClosingMainWindow = nextValue;
    },
    notifyAppClosingProgress,
    stopAllAgentsGracefully: (onProgress) => services.session.stopAllAgentsGracefully(onProgress)
  });
}

function attachWindowStateListeners(window: BrowserWindow): void {
  attachWindowStateListenersHelper(window, () => notifyWindowStateChanged());
}

function watchRendererDist(): () => void {
  return watchRendererDistHelper({
    rendererDir: path.join(__dirname, "..", "renderer"),
    getMainWindow: () => mainWindow
  });
}

async function withSnapshot(action: () => Promise<AppState>): Promise<AppState> {
  const snapshot = await action();
  scheduleStateChanged(snapshot, { preferDelta: false });
  return compactStateForRenderer(snapshot);
}

function registerIpc(): void {
  const isAllowedSender = (event: import("./types/execution/gateway.types").ConversationInvocation): boolean =>
    !!mainWindow && !mainWindow.isDestroyed() && event.sender.id === mainWindow.webContents.id
      && event.senderFrame === mainWindow.webContents.mainFrame && event.senderFrame.url === mainWindow.webContents.getURL();
  if (remoteAccess) registerRemoteAccessIpc({ ipc: ipcMain, service: remoteAccess, isAllowedSender });
  registerAccountIpc({ ipc: ipcMain, runtime: accountRuntime, isAllowedSender });
  registerWindowSettingsIpc({ ipc: ipcMain, port: windowSettingsPort, isAllowedSender });
  registerSettingsSyncIpc({ ipc: ipcMain, service: settingsSync, isAllowedSender });
  registerConversationIpc({ ipc: ipcMain, isAllowedSender, mcpAppFrames, openOutputFile: openOutputFileWithSystem, resolveHost: (environmentId) => environmentId === nativeRuntime.host.environmentId ? nativeRuntime.host : null });
  registerBotMemoryIpc({ ipc: ipcMain, isAllowedSender, memory: nativeRuntime.memory, reviews: nativeRuntime.memoryReviewLog, now: () => new Date() });
  registerBotRoutineIpc({ ipc: ipcMain, isAllowedSender, routines: nativeRuntime.routines });
  if (inbox) registerInboxIpc({ ipc: ipcMain, isAllowedSender, inbox: inbox.service });
  registerConnectorIpc({ ipc: ipcMain, isAllowedSender, connectors: nativeRuntime.connectors });
  registerConnectorAuthPromptIpc({ ipc: ipcMain, isAllowedSender, prompts: nativeRuntime.connectorAuthPrompts, connectors: nativeRuntime.connectors });
  registerAppsIpc({ ipc: ipcMain, isAllowedSender, apps: nativeRuntime.apps, connectors: nativeRuntime.connectors, installRequests: appInstallRequests, files: createAppFileDialogs(() => mainWindow), now: () => new Date().toISOString() });
  registerSecretIpc({ ipc: ipcMain, isAllowedSender, secrets: nativeRuntime.secrets });
  registerChatBranchIpc({ ipc: ipcMain, isAllowedSender, start: (request) => nativeRuntime.startBranch(request),
    name: (message) => nativeRuntime.nameBranch(message) });
  registerDirectContextIpc({ ipc: ipcMain, isAllowedSender, preview: (request) => nativeRuntime.previewDirectContext(request) });
  registerPersonalizationIpc({ ipc: ipcMain, isAllowedSender, service: nativeRuntime.personalization,
    notify: (state) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(personalizationChangedChannel, state); } });
  onAutoUpdateStatusChanged((status) => {
    notifyAutoUpdateStatus(status);
  });

  registerWorkspaceIpc({
    services,
    withSnapshot,
    compactStateForRenderer,
    getAppSettings: () => appSettings,
    importBrowserImageToWorkspace,
    validateMoveWorkspaceFilePayload,
    validateWriteWorkspaceFilePayload,
    createProjectWorkspace: (payload) =>
      createProjectWorkspace(payload, {
        getMainWindow: () => mainWindow,
        getSnapshot: () => services.snapshot.getSnapshot(),
        compactStateForRenderer,
        withSnapshot,
        selectProject: (projectRoot) => services.workspace.selectProject(projectRoot)
      })
  });

  registerForgeIpc({
    services,
    notifyForgeOAuthDevicePrompt
  });
  registerDeploymentIpc({
    services,
    notifyVercelRuntimeLogEvent
  });

  registerSessionIpc({ services, withSnapshot });

  registerLoopIpc({ loopRunner });

  registerAgentUsageIpc();

  registerSystemIpc({
    parseAllowedExternalUrl,
    showProjectPicker,
    showProjectPickerAtPath,
    getWindowState,
    openLocalTerminal: () => services.session.openLocalTerminal(),
    sendTerminalInput: (sessionId, input) => services.session.sendTerminalInput(sessionId, input),
    getAppSettings: () => appSettings,
    requestQuit: appShutdown.request,
    saveAppSettings: (nextSettings, baseline) => settingsUpdates.update((current) => withMainOwnedSettings(current, nextSettings, baseline)),
    showAgentCompletionNotification,
    analyticsRuntimeConfig,
    getSnapshot: () => services.snapshot.getSnapshot(),
    getLocalTerminalState: () => services.snapshot.getLocalTerminalState()
  });

  registerMacApplicationMenuIpc(() => mainWindow);

  registerRemoteIpc({
    services,
    withSnapshot,
    chooseMountedProject,
    notifyRemoteMountOutput,
    pathIsWithinAnyMount
  });

  registerToolingIpc({
    services,
    withSnapshot,
    notifyToolSkillInstallOutput
  });
  registerWindowIpc({
    getMainWindow: () => mainWindow,
    getWindowState
  });
}

async function bootstrap(): Promise<void> {
  void trackInstallationLaunch({
    allowed: analyticsRuntimeConfig.analyticsAllowedInCurrentRun,
    config: readAnalyticsConfig(path.join(__dirname, "..", "runtime", "analytics-config.json")),
    statePath: path.join(app.getPath("userData"), "analytics-installation.json"),
    context: { appVersion: app.getVersion(), environment: isDevelopmentMode ? "development" : "production",
      platform: process.platform, countryCode: app.getLocaleCountryCode() || null }
  }).catch(() => console.warn("[analytics] Could not send app launch count."));
  appSettings = await appSettingsStore.load();
  configureMediaPermissions();
  applyMacDockIcon();
  if (process.platform === "win32") {
    app.setAppUserModelId("com.nora.desktop");
  }

  orchestrator = new Orchestrator({
    recentProjectsPath: getRecentProjectsPath(),
    toolConfigPath: getToolConfigPath(),
    projectsIndexPath: getProjectsIndexPath(),
    sessionsIndexPath: getSessionsIndexPath(),
    onWorkspaceLoadingProgress: notifyWorkspaceLoadingProgress,
    onLocalTerminalChanged: notifyLocalTerminalChanged
  });
  services = orchestrator.createServices();
  const loopStore = createLoopStore({
    resolveStatePath: (projectId, relativePath) => {
      const project = services.snapshot.getSnapshot().workspaces
        .map((workspace) => workspace.project)
        .find((candidate) => candidate.id === projectId) ?? services.snapshot.getSnapshot().project;
      if (project?.id === projectId && project.location?.kind === "ssh") {
        throw new Error("Workflows currently require a local or mounted workspace.");
      }
      return services.workspace.resolveWorkspaceStatePath({ projectId, path: relativePath });
    }
  });
  loopRunner = createLoopRunner({
    store: loopStore,
    resolveBot: (projectId, botId) => {
      const boot = nativeRuntime.personalization.state();
      const workspaceId = boot.workspaces.find((entry) => entry.shellProjectId === projectId)?.id;
      return workspaceId ? findEffectiveBot(boot.personalization.bots, workspaceId, boot.sharedBots, botId) : null;
    },
    nowIso: () => new Date().toISOString(),
    randomId: () => randomUUID(),
    prepareWorktree: (input) => orchestrator.prepareLoopRunWorktree(input),
    runtime: createLoopThreadRuntime({ host: () => nativeRuntime.host, boot: () => nativeRuntime.personalization.state(),
      registerCheckouts: (projectId, paths) => nativeRuntime.catalog.setProjectCheckouts(projectId, paths), nextId: randomUUID }),
    notifyRunChanged: (run) => {
      inbox?.service.observeWorkflowRun(run);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("loop-run:changed", run);
      }
    },
    notifyRunDeleted: (_projectId, runId) => { inbox?.service.forgetWorkflowRun(runId); },
    notifyRunOutput: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("loop-run:output", payload);
      }
    },
    notifyDefinitionChanged: (definition) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("loop-definition:changed", definition);
      }
    },
    resolveWorkspaceStatePath: (projectId, relativePath) =>
      services.workspace.resolveWorkspaceStatePath({ projectId, path: relativePath })
  });
  // Threads can run in any of a project's worktrees; the native catalog learns them once the runtime is up.
  const syncWorktreeCheckouts = createWorktreeCheckoutSync({
    sync: (projectId) => nativeRuntime.personalization.syncCheckouts(projectId),
    onError: (error) => console.error("Could not register worktree checkouts for threads", error)
  });
  orchestrator.onStateChanged((snapshot) => {
    scheduleStateChanged(snapshot);
    if (nativeRuntime) syncWorktreeCheckouts(snapshot);
  });
  orchestrator.onAgentTerminalData((sessionId, data) => {
    notifyTerminalData(sessionId, data);
  });
  const initialSnapshot = await orchestrator.initialize();
  nativeRuntime = await openNativeRuntime({ stateDirectory: getStateDir(), personalDirectory: path.join(getNoraRoot(), "Personal"),
    readSettings: () => appSettings, updateSettings: settingsUpdates.update,
    windowSettings: windowSettingsPort, settingsSync,
    onSettingsChanged: (settings) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("app:settings-changed", settings); },
    projects: () => {
      const state = services.snapshot.getSnapshot();
      return [...new Map([...(state.project ? [state.project] : []), ...state.workspaces.map((entry) => entry.project)].map((project) => [project.id, project])).values()];
    },
    projectCheckouts: (projectId) => readyWorktreePaths(services.snapshot.getSnapshot(), projectId),
    activateWorkspace: async (selectedPath) => { await services.workspace.selectProject(selectedPath); },
    chooseFolder: async () => { const selection = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "Add workspace" });
      const selectedPath = selection.canceled ? null : selection.filePaths[0]; return selectedPath ? { path: selectedPath, name: path.basename(selectedPath) } : null; },
    openFolder: async (selectedPath) => { const error = await shell.openPath(selectedPath); if (error) throw new Error(error); },
    onTasksChanged: notifyWorkspaceTasksChanged,
    onRoutinesChanged: (botId) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(botRoutinesChangedChannel, { botId }); },
    openExternal: (url) => shell.openExternal(url),
    onConnectorsChanged: (connectors) => { inbox?.service.refreshConnectors(); if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(connectorsChangedChannel, connectors); },
    onConnectorAuthPromptsChanged: (prompts) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(connectorAuthPromptsChangedChannel, prompts); },
    onSecretPromptsChanged: (prompts) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(secretPromptsChangedChannel, prompts); },
    onSecretVaultChanged: (secrets) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(secretVaultChangedChannel, secrets); },
    onAppsChanged: (apps) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(appsChangedChannel, apps); },
    onAppData: (data) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(appsDataChannel, data); },
    onAppBuildStep: (step) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(appsBuildingChannel, step); },
    onAppAlertsChanged: () => { inbox?.service.refreshAlerts(); },
    workerWorkspaces: createWorkerWorkspaces({
      boot: () => nativeRuntime.personalization.state(), nextId: randomUUID,
      createWorktree: (payload) => services.session.createWorktree(payload),
      syncCheckouts: (projectId) => nativeRuntime.personalization.request({ kind: "sync-checkouts", projectId })
    }),
    tasks: {
      read: (projectId, path) => services.workspace.readWorkspaceFile({ projectId, path }),
      move: async (projectId, fromPath, toPath) => { await services.workspace.moveWorkspaceFile({ projectId, fromPath, toPath }); },
      list: (projectId) => services.workspace.listWorkspaceTasks(projectId), board: (projectId) => services.workspace.getWorkspaceTaskBoard(projectId),
      saveBoard: (projectId, board) => services.workspace.saveWorkspaceTaskBoard(projectId, board),
      create: (projectId, title, content) => services.workspace.createWorkspaceTaskFile(projectId, title, content) },
    workflows: {
      runner: loopRunner,
      // Runs prepare against the project open in the window, in a new worktree when it is a Git repository.
      runPlacement: (projectId) => {
        const project = services.snapshot.getSnapshot().project;
        if (project?.id !== projectId) return "unavailable";
        return isGitProject(project) ? "worktree" : "project-folder";
      }
    },
    terminals: createNoraTerminalStore({
      workspaceTerminals: () => services.snapshot.getSnapshot().terminals,
      getLocalTerminal: () => services.snapshot.getLocalTerminalState(),
      openShellProjectId: () => services.snapshot.getSnapshot().project?.id ?? null,
      openLocalTerminal: () => services.session.openLocalTerminal(),
      createWorkspaceTerminal: (payload) => services.session.createTerminal(payload),
      sendInput: (sessionId, input) => services.session.sendTerminalInput(sessionId, input),
      focusWorkspaceTerminal: async (sessionId) => { await services.session.focusTerminal(sessionId); }
    })
  });
  inbox = startInboxRuntime({ host: nativeRuntime.host, stateDirectory: getStateDir(), getMainWindow: () => mainWindow, getAppIcon, focusMainWindow,
    notificationsEnabled: () => appSettings.agentCompletionNotificationsEnabled,
    projectIds: () => nativeRuntime.personalization.state().workspaces.flatMap((entry) => entry.shellProjectId ? [entry.shellProjectId] : []),
    listWorkflowRuns: (projectId) => loopRunner.listRuns(projectId),
    workspaceForProject: (projectId) => nativeRuntime.personalization.state().workspaces.find((entry) => entry.shellProjectId === projectId)?.id ?? null,
    connectors: () => nativeRuntime.connectors.list(), alerts: () => nativeRuntime.apps.activeAlerts() });
  remoteAccess = createDesktopRemoteAccess({ directory: getStateDir(), runtimeVersion: app.getVersion(), name: os.hostname(),
    management: nativeRuntime.personalization, account: accountRuntime, host: nativeRuntime.host, inbox: inbox.service, boot: () => nativeRuntime.personalization.state(),
    phonePushEnabled: () => appSettings.phonePushNotificationsEnabled,
    onChanged: (view) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(remoteAccessChangedChannel, view); }
  });
  desktopLifecycle.attachRemoteAccess(remoteAccess);
  await remoteAccess.start();
  syncWorktreeCheckouts(services.snapshot.getSnapshot());
  registerIpc();
  await settingsSync.initialize();
  accountRuntime.initialize();
  desktopLifecycle.start();
  windowStartup.start();
  notifyStateChanged(initialSnapshot);
  setLastBroadcastSnapshot(initialSnapshot);
  notifyWindowStateChanged();
  void flushLaunchCommands();
  enqueueParsedLaunchCommand(process.argv, process.cwd());
}

if (!shouldExitForSquirrelLifecycle && hasSingleInstanceLock) {
  app.on("second-instance", (_event, argv, workingDirectory) => {
    windowStartup.activate();
    for (const value of argv) appInstallRequests.enqueue(value);
    enqueueParsedLaunchCommand(argv, workingDirectory || process.cwd());
  });

  app.on("open-url", (event, url) => { if (appInstallRequests.enqueue(url)) event.preventDefault(); });
  for (const value of process.argv) appInstallRequests.enqueue(value);
  void app.whenReady().then(() => {
    if (process.defaultApp && process.argv[1]) app.setAsDefaultProtocolClient(APP_INSTALL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
    else app.setAsDefaultProtocolClient(APP_INSTALL_SCHEME);
  });
  configureWebviewGuests();
  void app.whenReady().then(bootstrap);
}

app.on("window-all-closed", () => {
  if (desktopLifecycle.shouldQuitWhenWindowsClosed()) app.quit();
});

app.on("before-quit", (event) => appShutdown.beforeQuit(event));

app.on("activate", () => {
  if (!appShutdown.isQuitting()) windowStartup.activate();
});
