import { APP_SHORT_NAME } from "@shared/appMeta";
import { APP_RUNTIME_SETTINGS } from "@shared/constants/appRuntimeSettings";
import type {
  AnalyticsRuntimeConfig,
  AppSettings,
  AppState,
  CreateAgentPayload,
  ImportBrowserImagePayload,
  WriteWorkspaceFilePayload
} from "@shared/appTypes";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { app, BrowserWindow, session } from "electron";
import path from "node:path";
import { AppSettingsStore } from "./appSettingsStore";
import {
  initializeAutoUpdates,
  onAutoUpdateStatusChanged
} from "./autoUpdates";
import { resolveHardwareAccelerationEnabledAtStartup } from "./hardwareAcceleration";
import { parseLaunchCommand } from "./launchCommand";
import { getAppSettingsPath, getProjectsIndexPath, getRecentProjectsPath, getSessionsIndexPath, getToolConfigPath } from "./noraPaths";
import { applyMacDockIcon as applyMacDockIconHelper, getAppIcon as getAppIconHelper, pathIsWithinAnyMount } from "./helpers/appRuntimeAssets";
import { getImportedImageTargetPath } from "./helpers/browserImageImport";
import { createLaunchCommandQueueController } from "./helpers/launchCommandQueue";
import { createMainWindowNotifications } from "./helpers/mainWindowNotifications";
import { createMainUserInteractionsController } from "./helpers/mainUserInteractions";
import { handleSquirrelLifecycle, loadEnvFile } from "./helpers/startupRuntime";
import { configureWebviewGuests, isAllowedBrowserGuestUrl } from "./helpers/webviewSecurity";
import {
  attachWindowStateListeners as attachWindowStateListenersHelper,
  focusMainWindow as focusMainWindowHelper,
  getWindowState as getWindowStateHelper,
  shutdownMainWindow as shutdownMainWindowHelper,
  watchRendererDist as watchRendererDistHelper
} from "./helpers/windowLifecycle";
import {
  parseAllowedExternalUrl as parseAllowedExternalUrlHelper,
  validateCreateAgentPayload as validateCreateAgentPayloadHelper,
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
import { registerSessionIpc } from "./ipc/registerSessionIpc";
import { registerSystemIpc } from "./ipc/registerSystemIpc";
import { registerToolingIpc } from "./ipc/registerToolingIpc";
import { registerWindowIpc } from "./ipc/registerWindowIpc";
import { registerWorkspaceIpc } from "./ipc/registerWorkspaceIpc";
import type { OrchestratorFacade } from "./types/orchestratorFacade.types";
import { unmountRemoteWorkspace } from "./remoteMounts";
import type { MainServices } from "./services/mainServices";

let mainWindow: BrowserWindow | null = null;
let orchestrator: OrchestratorFacade;
let services: MainServices;
let stopRendererWatcher: (() => void) | null = null;
let isClosingMainWindow = false;
const appSettingsStore = new AppSettingsStore(getAppSettingsPath());
let appSettings: AppSettings = DEFAULT_APP_SETTINGS;
const workspaceLoadingTimingByProject = new Map<string, { startedAt: number; lastStepAt: number }>();
const SQUIRREL_WINDOW_LIFETIME_MS = APP_RUNTIME_SETTINGS.main.squirrelWindowLifetimeMs;
const STATE_BROADCAST_INTERVAL_MS = APP_RUNTIME_SETTINGS.main.stateBroadcastIntervalMs;
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

const {
  notifyWindowStateChanged,
  notifyAppClosingProgress,
  notifyTerminalData,
  notifyLocalTerminalChanged,
  notifyRemoteMountOutput,
  notifyToolSkillInstallOutput,
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

function validateCreateAgentPayload(payload: CreateAgentPayload): void {
  validateCreateAgentPayloadHelper(payload);
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
  mainWindow = new BrowserWindow({
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
  mainWindow.maximize();

  void mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  if (process.env.NORA_DEV_WATCH === "1") {
    stopRendererWatcher?.();
    stopRendererWatcher = watchRendererDist();
  }

  mainWindow.on("close", (event) => {
    if (isClosingMainWindow) {
      return;
    }

    event.preventDefault();
    void shutdownMainWindow();
  });

  mainWindow.on("closed", () => {
    stopRendererWatcher?.();
    stopRendererWatcher = null;
    isClosingMainWindow = false;
    mainWindow = null;
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
    validateWriteWorkspaceFilePayload
  });

  registerForgeIpc({
    services,
    notifyForgeOAuthDevicePrompt
  });
  registerDeploymentIpc({
    services,
    notifyVercelRuntimeLogEvent
  });

  registerSessionIpc({
    services,
    withSnapshot,
    validateCreateAgentPayload
  });

  registerSystemIpc({
    parseAllowedExternalUrl,
    showProjectPicker,
    showProjectPickerAtPath,
    getWindowState,
    getAppSettings: () => appSettings,
    saveAppSettings: async (nextSettings) => {
      appSettings = await appSettingsStore.save(nextSettings);
      return appSettings;
    },
    showAgentCompletionNotification,
    analyticsRuntimeConfig
  });

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
  appSettings = await appSettingsStore.load();
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
  orchestrator.onStateChanged((snapshot) => {
    scheduleStateChanged(snapshot);
  });
  orchestrator.onAgentTerminalData((sessionId, data) => {
    notifyTerminalData(sessionId, data);
  });
  registerIpc();
  createWindow();

  const initialSnapshot = await orchestrator.initialize();
  notifyStateChanged(initialSnapshot);
  setLastBroadcastSnapshot(initialSnapshot);
  notifyWindowStateChanged();
  void flushLaunchCommands();
  enqueueParsedLaunchCommand(process.argv, process.cwd());
}

if (!shouldExitForSquirrelLifecycle && hasSingleInstanceLock) {
  app.on("second-instance", (_event, argv, workingDirectory) => {
    focusMainWindow();
    enqueueParsedLaunchCommand(argv, workingDirectory || process.cwd());
  });

  configureWebviewGuests();
  void app.whenReady().then(bootstrap);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
