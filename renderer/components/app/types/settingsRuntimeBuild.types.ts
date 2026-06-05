import type { DevToastPayload, SettingsRuntimeValue } from "@/components/app/types/settings.types";
import type {
  AgentSkillSearchResult,
  AiProvider,
  AnalyticsRuntimeConfig,
  AppSettings,
  AppState,
  BrowserCookieProfileSummary,
  ForgeOAuthProviderConfig,
  InstalledIde
} from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type BuildSettingsRuntimeValueDeps = {
  snapshot: AppState;
  setActiveView: Dispatch<SetStateAction<"main" | "settings">>;
  themeMode: SettingsRuntimeValue["themeMode"];
  updateThemeMode: SettingsRuntimeValue["updateThemeMode"];
  accentColor: SettingsRuntimeValue["accentColor"];
  updateAccentColor: SettingsRuntimeValue["updateAccentColor"];
  uiFontId: SettingsRuntimeValue["uiFontId"];
  updateUiFont: SettingsRuntimeValue["updateUiFont"];
  terminalThemeId: SettingsRuntimeValue["terminalThemeId"];
  updateTerminalTheme: SettingsRuntimeValue["updateTerminalTheme"];
  terminalFontId: SettingsRuntimeValue["terminalFontId"];
  updateTerminalFont: SettingsRuntimeValue["updateTerminalFont"];
  resolvedTheme: SettingsRuntimeValue["resolvedTheme"];
  defaultTerminalShellId: string | null;
  handleDefaultTerminalShellChange: (shellId: string | null) => void;
  installedIdes: InstalledIde[];
  defaultIdeId: string | null;
  updateDefaultIde: (ideId: string | null) => void;
  forgeOAuthProviders: ForgeOAuthProviderConfig[];
  isLoadingForgeOAuthProviders: boolean;
  githubToken: string;
  githubAccountLabel: string | null;
  updateGithubToken: (token: string) => void;
  connectForgeAccount: (provider: "github" | "gitlab" | "vercel") => Promise<void>;
  updateGithubAccountLabel: (label: string | null) => void;
  gitlabToken: string;
  gitlabHost: string;
  gitlabAccountLabel: string | null;
  updateGitlabToken: (token: string) => void;
  updateGitlabHost: (host: string) => void;
  updateGitlabAccountLabel: (label: string | null) => void;
  vercelToken: string;
  vercelAccountLabel: string | null;
  updateVercelToken: (token: string) => void;
  disconnectVercelAccount: () => void;
  appSettings: AppSettings;
  updateFileEditorThemeId: (themeId: AppSettings["fileEditorThemeId"]) => Promise<void>;
  updateHardwareAccelerationEnabled: (enabled: boolean) => Promise<void>;
  updateWorkspaceStateStorageMode: (mode: AppSettings["workspaceStateStorageMode"]) => Promise<void>;
  updateDefaultAgentLaunchTarget: (defaultAgentLaunchTarget: AppSettings["defaultAgentLaunchTarget"]) => Promise<void>;
  updatePreferredAgentToolId: (preferredAgentToolId: AppSettings["preferredAgentToolId"]) => Promise<void>;
  updateSplitViewPreferences: (next: {
    defaultSplitViewGridColumns: AppSettings["defaultSplitViewGridColumns"];
    defaultSplitViewGridRows: AppSettings["defaultSplitViewGridRows"];
    rememberLastSplitViewPerWorkspace: boolean;
    confirmSplitViewDelete: boolean;
    showWorkspaceSessionTabs: boolean;
  }) => Promise<void>;
  canPreviewMacTitleBarChrome: boolean;
  forceMacTitleBarPreview: boolean;
  updateForceMacTitleBarPreview: (enabled: boolean) => void;
  updateNotificationPreferences: (next: { agentCompletionNotificationsEnabled: boolean }) => Promise<void>;
  updateAnalyticsConsentStatus: (status: "granted" | "declined") => Promise<void>;
  analyticsAllowedInCurrentRun: boolean;
  analyticsRuntimeConfig: AnalyticsRuntimeConfig | null;
  updateBrowserPreferences: (next: {
    openInternalBrowserOnNewPortDetection?: boolean;
  }) => Promise<void>;
  chromeCookieProfiles: BrowserCookieProfileSummary[];
  selectedChromeCookieProfileId: string | null;
  isLoadingChromeCookieProfiles: boolean;
  setSelectedChromeCookieProfileId: Dispatch<SetStateAction<string | null>>;
  loadChromeCookieProfiles: () => void;
  handleImportChromeBrowserData: (profileId: string) => void;
  updateTerminalPresets: (presets: AppSettings["terminalPresets"]) => Promise<void>;
  updateTerminalQuickLaunchDefaults: (defaults: AppSettings["terminalQuickLaunchDefaults"]) => Promise<void>;
  updateAiPreferredProvider: (provider: AiProvider) => Promise<void>;
  updateAiApiKey: (provider: AiProvider, apiKey: string) => Promise<void>;
  updateAiModel: (provider: AiProvider, model: string) => Promise<void>;
  updateVoiceSettings: (voice: AppSettings["voice"]) => Promise<void>;
  updateAiSimpleTaskSettings: (
    settings: Pick<AppSettings["ai"], "simpleTaskProvider" | "localLlmModelId">
  ) => Promise<void>;
  aiModelOptions: SettingsRuntimeValue["aiModelOptions"];
  aiModelLoading: SettingsRuntimeValue["aiModelLoading"];
  aiModelError: SettingsRuntimeValue["aiModelError"];
  refreshAiModels: (provider: AiProvider) => Promise<void>;
  relaunchApplication: () => Promise<void>;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  missingOptionalStartupDependencyCount: number;
  openOnboardingFlow: () => void;
  openStartupDependenciesDialog: () => void;
  isWorkspaceSidebarCollapsed: boolean;
  isChangesSidebarCollapsed: boolean;
  sidebarsSwapped: boolean;
  isRemoteMountsSectionCollapsed: boolean;
  isPortsSectionCollapsed: boolean;
  isChatbotsSectionCollapsed: boolean;
  isCliSectionCollapsed: boolean;
  isSkillsSectionCollapsed: boolean;
  isSpecsSectionCollapsed: boolean;
  isLocalTerminalDockCollapsed: boolean;
  setIsWorkspaceSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsChangesSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setSidebarsSwapped: Dispatch<SetStateAction<boolean>>;
  setIsRemoteMountsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsPortsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsChatbotsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsCliSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsSkillsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsSpecsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsLocalTerminalDockCollapsed: Dispatch<SetStateAction<boolean>>;
  showToast: (toast: { variant: DevToastPayload["variant"]; title: string; description?: string }) => void;
  captureError: (error: unknown) => void;
  searchToolSkills: (toolId: string, query: string) => Promise<AgentSkillSearchResult>;
};
