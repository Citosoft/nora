import type {
  AgentCompletionNotificationPayload,
  AnalyticsRuntimeConfig,
  AppSettings,
  AutoUpdateStatus,
  AutoUpdateTestSupport,
  AutoUpdateTestTarget,
  BrowserCookieProfileSummary,
  BrowserDataImportResult,
  LatestReleaseAssetsResult,
  ForgeOAuthDevicePrompt,
  InstalledIde,
  LinuxAptSetupStatus,
  LinuxUpdateStatus,
  ReleaseVersionStatus,
  ReleaseAssetDownloadProgressPayload,
  ReleaseAssetDownloadResult,
  RemoteConnectionOptions
} from "../../appTypes";
import type {
  PastedImageReference,
  SavePastedImagePayload
} from "../../types/agentInput.types";
import type {
  StartupDependencyId,
  StartupDependencyReport
} from "../../types/startupDependency.types";
import type { AgentUsageScanRequest, LocalAgentUsageReport } from "../../types/agentUsageStats.types";
import type { MacApplicationMenuCommand, MacApplicationMenuSyncPayload } from "../../types/macApplicationMenu.types";
import type { DetectedUserIdentity } from "../../types/userIdentity.types";

export interface WindowState {
  isMaximized: boolean;
  platform: NodeJS.Platform;
}

export interface AppClosingProgressPayload {
  detail: string;
  command: string | null;
}

export interface RemoteMountOutputPayload {
  line: string;
}

export interface VoiceInputTranscriptionPayload {
  audioData: number[];
  mimeType: string;
}

export interface SystemBridge {
  openExternalUrl: (url: string) => Promise<void>;
  copyText: (text: string) => Promise<void>;
  closeWindow: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<WindowState>;
  getWindowState: () => Promise<WindowState>;
  onWindowStateChanged: (listener: (state: WindowState) => void) => () => void;
  getDetectedUserIdentity: () => Promise<DetectedUserIdentity>;
  getAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (settings: AppSettings) => Promise<AppSettings>;
  relaunchApplication: (options?: { hardwareAccelerationEnabled?: boolean }) => Promise<void>;
  getAnalyticsRuntimeConfig: () => Promise<AnalyticsRuntimeConfig>;
  getStartupDependencyReport: () => Promise<StartupDependencyReport>;
  installStartupDependency: (dependencyId: StartupDependencyId) => Promise<StartupDependencyReport>;
  getLinuxAptSetupStatus: () => Promise<LinuxAptSetupStatus>;
  installLinuxAptUpdates: () => Promise<LinuxAptSetupStatus>;
  getLinuxUpdateStatus: () => Promise<LinuxUpdateStatus>;
  getReleaseVersionStatus: () => Promise<ReleaseVersionStatus>;
  getAutoUpdateStatus: () => Promise<AutoUpdateStatus>;
  getAutoUpdateTestSupport: () => Promise<AutoUpdateTestSupport>;
  simulateAutoUpdateStatus: (target: AutoUpdateTestTarget) => Promise<AutoUpdateStatus>;
  installDownloadedUpdate: () => Promise<void>;
  getLatestReleaseAssets: () => Promise<LatestReleaseAssetsResult>;
  downloadReleaseAsset: (payload: { downloadUrl: string; fileName: string }) => Promise<ReleaseAssetDownloadResult>;
  runReleaseInstallerInLocalTerminal: () => Promise<void>;
  revealFileInFolder: (filePath: string) => Promise<void>;
  onReleaseAssetDownloadProgress: (listener: (payload: ReleaseAssetDownloadProgressPayload) => void) => () => void;
  onAutoUpdateStatus: (listener: (payload: AutoUpdateStatus) => void) => () => void;
  onForgeOAuthDevicePrompt: (listener: (payload: ForgeOAuthDevicePrompt) => void) => () => void;
  getInstalledIdes: () => Promise<InstalledIde[]>;
  openProjectInIde: (ideId: string, projectPath: string) => Promise<void>;
  getRemoteConnectionOptions: () => Promise<RemoteConnectionOptions>;
  installRemoteMountSupport: () => Promise<RemoteConnectionOptions>;
  onRemoteMountOutput: (listener: (payload: RemoteMountOutputPayload) => void) => () => void;
  listChromeCookieProfiles: () => Promise<BrowserCookieProfileSummary[]>;
  importChromeBrowserData: (profileId?: string) => Promise<BrowserDataImportResult>;
  transcribeVoiceInput: (payload: VoiceInputTranscriptionPayload) => Promise<string>;
  savePastedImage: (payload: SavePastedImagePayload) => Promise<PastedImageReference>;
  showAgentCompletionNotification: (payload: AgentCompletionNotificationPayload) => Promise<void>;
  onAppClosingProgress: (listener: (payload: AppClosingProgressPayload) => void) => () => void;
  logAnalytics: (level: "info" | "warn" | "debug" | "error", message: string) => Promise<void>;
  scanLocalAgentUsage: (request: AgentUsageScanRequest) => Promise<LocalAgentUsageReport>;
  checkAppRepositoryStarred: () => Promise<boolean | null>;
  starAppRepository: () => Promise<boolean>;
  syncMacApplicationMenu: (payload: MacApplicationMenuSyncPayload) => Promise<void>;
  onMacApplicationMenuCommand: (listener: (command: MacApplicationMenuCommand) => void) => () => void;
}

export interface SystemGateway extends SystemBridge {}
