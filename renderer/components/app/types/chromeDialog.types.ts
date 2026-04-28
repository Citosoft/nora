import type {
  CreateAgentDialogDefaults,
  CreateTerminalDialogDefaults,
  ResolvedTheme,
  ThemeMode,
  WindowUiState
} from "@/components/app/types";
import type { TitleBarWorkspaceQuickSearchConfig } from "@/components/app/types/titlebarWorkspaceSearch.types";
import type { ShortcutDefinition } from "@/components/app/types/workflow.types";
import type {
  AgentCatalogEntry,
  AgentLaunchTargetPreference,
  AgentSession,
  AgentSkillCatalog,
  AppSettings,
  BrowserCookieProfileSummary,
  ConnectRemoteProjectPayload,
  CreateAgentPayload,
  CreateTerminalPayload,
  ForgeOAuthDevicePrompt,
  ForgeProvider,
  InstalledIde,
  LinuxAptSetupStatus,
  LinuxUpdateStatus,
  ProjectSummary,
  RecentProject,
  TerminalPreset,
  TerminalShellOption,
  WorkspaceSpecSummary,
  WorkspaceSummary,
  WorkspaceTaskSummary,
  WorktreeRecord
} from "@shared/appTypes";
import type { StartupDependency, StartupDependencyId } from "@shared/types/startupDependency.types";
import type { ReactNode } from "react";

export type LinuxUpdateBannerProps = {
  status: Extract<LinuxUpdateStatus, { kind: "available" }>;
  onCopyCommand: () => void;
  onOpenRelease: () => void;
  onDismiss: () => void;
};

export type SplashScreenProps = {
  title: string;
  subtitle: string;
  children?: ReactNode;
};

export type TitleBarProps = {
  windowUiState: WindowUiState;
  useMacTitleBarChrome: boolean;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  settingsActive: boolean;
  onOpenKeyboardShortcuts: () => void;
  onOpenAbout: () => void;
  onSubmitIssue: () => void;
  canOpenProjectInIde: boolean;
  installedIdes: InstalledIde[];
  isLoadingInstalledIdes: boolean;
  preferredIde: InstalledIde | null;
  defaultIdeId: string | null;
  onOpenProjectInIde: (ideId: string) => void;
  isWorkspaceSidebarCollapsed: boolean;
  onToggleWorkspaceSidebar: () => void;
  onAddWorkspace: () => void;
  onAddRemoteWorkspace: () => void;
  onCloseWorkspace: () => void;
  onRefreshWorkspace: () => void;
  onCreateTerminal: () => void;
  onCreateAgent: () => void;
  onCreateBrowser: () => void;
  recentWorkspaces: RecentProject[];
  onOpenRecentWorkspace: (rootPath: string, name: string) => void;
  hasActiveWorkspace: boolean;
  isChangesSidebarCollapsed: boolean;
  onToggleChangesSidebar: () => void;
  onToggleLocalTerminalDock: () => void;
  onFocusLocalTerminalDock: () => void;
  onFocusPreviousSessionTab: () => void;
  onFocusNextSessionTab: () => void;
  onOpenStartupDependencies: () => void;
  splitViewSelection?: {
    views: Array<{ id: string; name: string }>;
    activeViewId: string | null;
    onActiveViewChange: (viewId: string | null) => void;
    onCreateView: () => void;
  } | null;
  workspaceQuickSearch?: TitleBarWorkspaceQuickSearchConfig | null;
};

export type AddWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseLocal: () => void;
  onChooseRemote: () => void;
};

export type CreateAgentDialogProps = {
  open: boolean;
  project: ProjectSummary | null;
  tools: AgentCatalogEntry[];
  agentSkillCatalogs: AgentSkillCatalog[];
  workspaceTasks: WorkspaceTaskSummary[];
  worktrees: WorktreeRecord[];
  projectBranches: string[];
  activeBranch: string;
  defaultLaunchTargetMode: LaunchTargetMode;
  defaultWorktreePrepareCommand: string | null;
  defaults: CreateAgentDialogDefaults | null;
  workspaceTerminalPresets: TerminalPreset[];
  globalTerminalPresets: TerminalPreset[];
  onOpenChange: (open: boolean) => void;
  onCreateAgent: (payload: CreateAgentPayload, taskPath: string | null) => void;
};

export type LaunchTargetMode = AgentLaunchTargetPreference;

export type CreatePullRequestDialogProps = {
  open: boolean;
  provider: ForgeProvider | null;
  sourceBranch: string;
  baseBranch: string;
  availableBaseBranches: string[];
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { title: string; body: string; baseBranch: string }) => Promise<void>;
};

export type CreateTerminalDialogProps = {
  open: boolean;
  project: ProjectSummary | null;
  worktrees: WorktreeRecord[];
  terminalShells: TerminalShellOption[];
  activeBranch: string;
  defaults: CreateTerminalDialogDefaults | null;
  onOpenChange: (open: boolean) => void;
  onCreateTerminal: (payload: CreateTerminalPayload) => void;
};

export type DestroyAgentDialogProps = {
  agent: AgentSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export type ErrorDialogProps = {
  open: boolean;
  message: string | null;
  onOpenChange: (open: boolean) => void;
};

export type StartupDependenciesDialogProps = {
  open: boolean;
  dependencies: StartupDependency[];
  isLoading: boolean;
  installTargetId: StartupDependencyId | null;
  installErrorMessage: string | null;
  simulatedMissingDependencyIds: StartupDependencyId[];
  onOpenChange: (open: boolean) => void;
  onInstallDependency: (dependencyId: StartupDependencyId) => void;
  onCopyInstructions: (dependency: StartupDependency) => void;
  onToggleSimulatedMissing: (dependencyId: StartupDependencyId) => void;
  onClearSimulation: () => void;
  onReload: () => void;
  onQuit: () => void;
};

export type WorkspaceOption = {
  projectId: string;
  projectName: string;
  projectRootPath: string;
  specs: WorkspaceSpecSummary[];
};

export type GenerateTasksDialogProps = {
  open: boolean;
  workspaces: WorkspaceOption[];
  tools: AgentCatalogEntry[];
  defaultWorkspaceId: string | null;
  defaultToolId: string;
  defaultSpecPath?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { projectId: string; toolId: string; brief: string | null; specPath: string | null }) => Promise<void>;
};

export type LinuxAptSetupDialogProps = {
  open: boolean;
  status: Extract<LinuxAptSetupStatus, { kind: "missing" }> | null;
  isInstalling: boolean;
  errorMessage: string | null;
  onOpenChange: (open: boolean) => void;
  onEnable: () => void;
  onCopyManualCommands: () => void;
};

export type AnalyticsConsentDialogProps = {
  open: boolean;
  onAllow: () => void;
  onDecline: () => void;
};

export type BrowserCookieImportPromptDialogProps = {
  open: boolean;
  profiles: BrowserCookieProfileSummary[];
  selectedProfileId: string | null;
  isLoadingProfiles: boolean;
  isImporting: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectedProfileIdChange: (profileId: string | null) => void;
  onReloadProfiles: () => void;
  onImport: (profileId: string) => void;
  onSkip: () => void;
};

export type OAuthDeviceCodeDialogProps = {
  open: boolean;
  prompt: ForgeOAuthDevicePrompt | null;
  onOpenChange: (open: boolean) => void;
  onCopyCode: (code: string) => Promise<void>;
  onOpenVerificationUrl: (url: string) => void;
};

export type RemoteMode = "saved" | "manual";
export type ConnectionMode = "mount" | "ssh";
export type DialogTab = "connect" | "help";

export type RemoteWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (payload: ConnectRemoteProjectPayload) => Promise<void> | void;
};

export type RemoveMissingWorkspaceDialogProps = {
  projectRoot: string | null;
  errorMessage: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export type ResetWorkspacesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export type WorkspaceTerminalPresetsDialogProps = {
  open: boolean;
  project: ProjectSummary | null;
  terminalShells: TerminalShellOption[];
  onOpenChange: (open: boolean) => void;
  onChange: (presets: AppSettings["terminalPresets"]) => Promise<void> | void;
};

export type WorkspaceSwitcherDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (projectId: string) => void;
};

export type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: ShortcutDefinition[];
  chromeHidden: boolean;
};

export type AboutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
