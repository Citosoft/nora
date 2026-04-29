import type { AccentColor, ResolvedTheme, TerminalFontId, TerminalThemeId } from "@/components/app/types";
import type {
  AgentCatalogEntry,
  AgentLaunchTargetPreference,
  AgentSkillCatalog,
  AgentSkillSearchResult,
  AiModelCatalogEntry,
  AiProvider,
  AppSettings,
  BrowserCookieProfileSummary,
  ForgeOAuthProviderConfig,
  InstalledIde,
  TerminalShellOption
} from "@shared/appTypes";

export type DevToastVariant = "info" | "success" | "error";

export type DevToastPayload = {
  variant: DevToastVariant;
  title: string;
  description?: string;
};

export type SettingsPageProps = {
  initialGroup?: SettingsGroup;
};

export type SettingsRuntimeValue = {
  closeSettingsPage: () => void;
  themeMode: "system" | "light" | "dark";
  updateThemeMode: (mode: "system" | "light" | "dark") => void;
  accentColor: AccentColor;
  updateAccentColor: (accentColor: AccentColor) => void;
  terminalThemeId: TerminalThemeId;
  updateTerminalTheme: (themeId: TerminalThemeId) => void;
  terminalFontId: TerminalFontId;
  updateTerminalFont: (fontId: TerminalFontId) => void;
  resolvedTheme: ResolvedTheme;
  terminalShells: TerminalShellOption[];
  defaultTerminalShellId: string | null;
  updateDefaultTerminalShellId: (shellId: string | null) => void;
  installedIdes: InstalledIde[];
  defaultIdeId: string | null;
  updateDefaultIde: (ideId: string | null) => void;
  forgeOAuthProviders: ForgeOAuthProviderConfig[];
  isLoadingForgeOAuthProviders: boolean;
  githubToken: string;
  githubAccountLabel: string | null;
  updateGithubToken: (token: string) => void;
  connectGithubAccount: () => void;
  disconnectGithubAccount: () => void;
  gitlabToken: string;
  gitlabHost: string;
  gitlabAccountLabel: string | null;
  updateGitlabToken: (token: string) => void;
  updateGitlabHost: (host: string) => void;
  disconnectGitlabAccount: () => void;
  vercelToken: string;
  vercelAccountLabel: string | null;
  updateVercelToken: (token: string) => void;
  disconnectVercelAccount: () => void;
  appSettings: AppSettings;
  updateFileEditorThemeId: (themeId: AppSettings["fileEditorThemeId"]) => void;
  updateHardwareAcceleration: (enabled: boolean) => void;
  updateWorkspaceStateStorageMode: (mode: AppSettings["workspaceStateStorageMode"]) => void;
  updateDefaultAgentLaunchTarget: (launchTarget: AgentLaunchTargetPreference) => void;
  updateDefaultSplitViewGrid: (gridColumns: AppSettings["defaultSplitViewGridColumns"], gridRows: AppSettings["defaultSplitViewGridRows"]) => void;
  updateRememberLastSplitViewPerWorkspace: (enabled: boolean) => void;
  updateConfirmSplitViewDelete: (enabled: boolean) => void;
  updateShowWorkspaceSessionTabs: (enabled: boolean) => void;
  canPreviewMacTitleBarChrome: boolean;
  forceMacTitleBarPreview: boolean;
  updateForceMacTitleBarPreview: (enabled: boolean) => void;
  updateAgentCompletionNotifications: (enabled: boolean) => void;
  updateAnalyticsConsent: (enabled: boolean) => void;
  analyticsAllowedInCurrentRun: boolean;
  analyticsDevModeSwitch: string;
  updateOpenInternalBrowserOnNewPortDetection: (enabled: boolean) => void;
  chromeCookieProfiles: BrowserCookieProfileSummary[];
  selectedChromeCookieProfileId: string | null;
  isLoadingChromeCookieProfiles: boolean;
  setSelectedChromeCookieProfileId: (profileId: string) => void;
  reloadChromeCookieProfiles: () => void;
  importChromeBrowserData: (profileId: string) => void;
  updateTerminalPresets: (presets: AppSettings["terminalPresets"]) => void;
  updateTerminalQuickLaunchDefaults: (defaults: AppSettings["terminalQuickLaunchDefaults"]) => void;
  updateAiPreferredProvider: (provider: AiProvider) => void;
  updateAiApiKey: (provider: AiProvider, apiKey: string) => void;
  updateAiModel: (provider: AiProvider, model: string) => void;
  aiModelOptions: Record<AiProvider, AiModelCatalogEntry[]>;
  aiModelLoading: Record<AiProvider, boolean>;
  aiModelError: Record<AiProvider, string | null>;
  refreshAiModels: (provider: AiProvider) => void;
  relaunchApplication: () => void;
  agentCatalog: AgentCatalogEntry[];
  agentSkillCatalogs: AgentSkillCatalog[];
  toggleToolEnabled: (toolId: string, enabled: boolean) => void;
  refreshAgentCatalog: () => void;
  searchToolSkills: (toolId: string, query: string) => Promise<AgentSkillSearchResult>;
  installToolSkill: (toolId: string, skillReference: string) => Promise<void>;
  removeToolSkill: (toolId: string, skillId: string) => void;
  missingOptionalStartupDependencyCount: number;
  openStartupDependenciesDialog: () => void;
  workbenchLayout: {
    isWorkspaceSidebarCollapsed: boolean;
    isChangesSidebarCollapsed: boolean;
    isRemoteMountsSectionCollapsed: boolean;
    isPortsSectionCollapsed: boolean;
    isChatbotsSectionCollapsed: boolean;
    isCliSectionCollapsed: boolean;
    isSkillsSectionCollapsed: boolean;
    isSpecsSectionCollapsed: boolean;
    isLocalTerminalDockCollapsed: boolean;
  };
  updateWorkbenchLayout: (next: Partial<SettingsRuntimeValue["workbenchLayout"]>) => void;
  triggerDevToast?: (payload: DevToastPayload) => void;
};

export type SettingsGroup =
  | "appearance"
  | "general"
  | "workbench"
  | "terminal"
  | "browser"
  | "cli"
  | "skills"
  | "integrations"
  | "ai"
  | "privacy"
  | "system"
  | "dev";

export type SettingsPageToolSkillSearch = (toolId: string, query: string) => Promise<AgentSkillSearchResult>;
export type WorkspaceLayoutPatch = Partial<SettingsRuntimeValue["workbenchLayout"]>;
export type SettingsPageGroup = SettingsGroup;
export type DevSettingsSectionProps = Pick<SettingsRuntimeValue, "triggerDevToast">;
