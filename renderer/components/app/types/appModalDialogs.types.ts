import type { WindowUiState } from "@/components/app/types";
import type {
  AboutDialogProps,
  AddWorkspaceDialogProps,
  AnalyticsConsentDialogProps,
  BrowserCookieImportPromptDialogProps,
  CreateAgentDialogProps,
  CreatePullRequestDialogProps,
  CreateTerminalDialogProps,
  DestroyAgentDialogProps,
  ErrorDialogProps,
  LinuxAptSetupDialogProps,
  OAuthDeviceCodeDialogProps,
  RemoteWorkspaceDialogProps,
  RemoveMissingWorkspaceDialogProps,
  ResetWorkspacesDialogProps,
  ResourceMonitorDialogProps,
  StartupDependenciesDialogProps,
  WorkspaceSwitcherDialogProps,
  WorkspaceTerminalPresetsDialogProps
} from "@/components/app/types/chromeDialog.types";

export type AppModalDialogsKeyboardShortcutsSlice = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: WindowUiState["platform"];
};

export type AppModalDialogsContextValue = {
  createAgent: CreateAgentDialogProps;
  destroyAgent: DestroyAgentDialogProps;
  error: ErrorDialogProps;
  oauthDevice: OAuthDeviceCodeDialogProps;
  startupDependencies: StartupDependenciesDialogProps;
  removeMissingWorkspace: RemoveMissingWorkspaceDialogProps;
  resetWorkspaces: ResetWorkspacesDialogProps;
  workspaceTerminalPresets: WorkspaceTerminalPresetsDialogProps;
  createTerminal: CreateTerminalDialogProps;
  createPullRequest: CreatePullRequestDialogProps;
  addWorkspace: AddWorkspaceDialogProps;
  remoteWorkspace: RemoteWorkspaceDialogProps;
  linuxAptSetup: LinuxAptSetupDialogProps;
  browserCookieImport: BrowserCookieImportPromptDialogProps;
  analyticsConsent: AnalyticsConsentDialogProps;
  about: AboutDialogProps;
  keyboardShortcuts: AppModalDialogsKeyboardShortcutsSlice;
  resourceMonitor: ResourceMonitorDialogProps;
  workspaceSwitcher: WorkspaceSwitcherDialogProps;
};
