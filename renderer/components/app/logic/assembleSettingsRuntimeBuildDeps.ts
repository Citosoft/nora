import type { AppShellSettingsRuntimeAssemblyInput } from "@/components/app/types/appShellSettingsRuntimeAssembly.types";
import type { BuildSettingsRuntimeValueDeps } from "@/components/app/types/settingsRuntimeBuild.types";

/**
 * Flattens grouped settings assembly input into the single bag consumed by
 * `buildSettingsRuntimeValue` / `SettingsRuntimeBuildProvider`.
 * Inverse: {@link buildAppShellSettingsRuntimeAssemblyInputFromDeps}.
 */
export const assembleSettingsRuntimeBuildDeps = (
  input: AppShellSettingsRuntimeAssemblyInput
): BuildSettingsRuntimeValueDeps => ({
  ...input.nav,
  ...input.appearance,
  ...input.integrations,
  ...input.appPrefs,
  ...input.runtime,
  ...input.sidebarLayout,
  ...input.toasts
});

/**
 * Groups flat settings runtime deps into the nested shape consumed by
 * `buildSettingsRuntimeInput` (signed-in wiring and elsewhere).
 * Inverse: {@link assembleSettingsRuntimeBuildDeps}.
 */
export const buildAppShellSettingsRuntimeAssemblyInputFromDeps = (
  deps: BuildSettingsRuntimeValueDeps
): AppShellSettingsRuntimeAssemblyInput => ({
  nav: {
    snapshot: deps.snapshot,
    setActiveView: deps.setActiveView as AppShellSettingsRuntimeAssemblyInput["nav"]["setActiveView"]
  },
  appearance: {
    themeMode: deps.themeMode,
    updateThemeMode: deps.updateThemeMode,
    accentColor: deps.accentColor,
    updateAccentColor: deps.updateAccentColor,
    terminalThemeId: deps.terminalThemeId,
    updateTerminalTheme: deps.updateTerminalTheme,
    terminalFontId: deps.terminalFontId,
    updateTerminalFont: deps.updateTerminalFont,
    resolvedTheme: deps.resolvedTheme,
    defaultTerminalShellId: deps.defaultTerminalShellId,
    handleDefaultTerminalShellChange: deps.handleDefaultTerminalShellChange
  },
  integrations: {
    installedIdes: deps.installedIdes,
    defaultIdeId: deps.defaultIdeId,
    updateDefaultIde: deps.updateDefaultIde,
    forgeOAuthProviders: deps.forgeOAuthProviders,
    isLoadingForgeOAuthProviders: deps.isLoadingForgeOAuthProviders,
    githubToken: deps.githubToken,
    githubAccountLabel: deps.githubAccountLabel,
    updateGithubToken: deps.updateGithubToken,
    connectForgeAccount: deps.connectForgeAccount,
    updateGithubAccountLabel: deps.updateGithubAccountLabel,
    gitlabToken: deps.gitlabToken,
    gitlabHost: deps.gitlabHost,
    gitlabAccountLabel: deps.gitlabAccountLabel,
    updateGitlabToken: deps.updateGitlabToken,
    updateGitlabHost: deps.updateGitlabHost,
    updateGitlabAccountLabel: deps.updateGitlabAccountLabel,
    vercelToken: deps.vercelToken,
    vercelAccountLabel: deps.vercelAccountLabel,
    updateVercelToken: deps.updateVercelToken,
    disconnectVercelAccount: deps.disconnectVercelAccount
  },
  appPrefs: {
    appSettings: deps.appSettings,
    updateFileEditorThemeId: deps.updateFileEditorThemeId,
    updateHardwareAccelerationEnabled: deps.updateHardwareAccelerationEnabled,
    updateWorkspaceStateStorageMode: deps.updateWorkspaceStateStorageMode,
    updateDefaultAgentLaunchTarget: deps.updateDefaultAgentLaunchTarget,
    updateSplitViewPreferences: deps.updateSplitViewPreferences,
    canPreviewMacTitleBarChrome: deps.canPreviewMacTitleBarChrome,
    forceMacTitleBarPreview: deps.forceMacTitleBarPreview,
    updateForceMacTitleBarPreview: deps.updateForceMacTitleBarPreview,
    updateNotificationPreferences: deps.updateNotificationPreferences,
    updateAnalyticsConsentStatus: deps.updateAnalyticsConsentStatus,
    analyticsAllowedInCurrentRun: deps.analyticsAllowedInCurrentRun,
    analyticsRuntimeConfig: deps.analyticsRuntimeConfig,
    updateBrowserPreferences: deps.updateBrowserPreferences,
    chromeCookieProfiles: deps.chromeCookieProfiles,
    selectedChromeCookieProfileId: deps.selectedChromeCookieProfileId,
    isLoadingChromeCookieProfiles: deps.isLoadingChromeCookieProfiles,
    setSelectedChromeCookieProfileId: deps.setSelectedChromeCookieProfileId,
    loadChromeCookieProfiles: deps.loadChromeCookieProfiles,
    handleImportChromeBrowserData: deps.handleImportChromeBrowserData,
    updateTerminalPresets: deps.updateTerminalPresets,
    updateTerminalQuickLaunchDefaults: deps.updateTerminalQuickLaunchDefaults,
    updateAiPreferredProvider: deps.updateAiPreferredProvider,
    updateAiApiKey: deps.updateAiApiKey,
    updateAiModel: deps.updateAiModel,
    aiModelOptions: deps.aiModelOptions,
    aiModelLoading: deps.aiModelLoading,
    aiModelError: deps.aiModelError,
    refreshAiModels: deps.refreshAiModels,
    relaunchApplication: deps.relaunchApplication
  },
  runtime: {
    safely: deps.safely,
    missingOptionalStartupDependencyCount: deps.missingOptionalStartupDependencyCount,
    openStartupDependenciesDialog: deps.openStartupDependenciesDialog
  },
  sidebarLayout: {
    isWorkspaceSidebarCollapsed: deps.isWorkspaceSidebarCollapsed,
    isChangesSidebarCollapsed: deps.isChangesSidebarCollapsed,
    isRemoteMountsSectionCollapsed: deps.isRemoteMountsSectionCollapsed,
    isPortsSectionCollapsed: deps.isPortsSectionCollapsed,
    isChatbotsSectionCollapsed: deps.isChatbotsSectionCollapsed,
    isCliSectionCollapsed: deps.isCliSectionCollapsed,
    isSkillsSectionCollapsed: deps.isSkillsSectionCollapsed,
    isSpecsSectionCollapsed: deps.isSpecsSectionCollapsed,
    isLocalTerminalDockCollapsed: deps.isLocalTerminalDockCollapsed,
    setIsWorkspaceSidebarCollapsed: deps.setIsWorkspaceSidebarCollapsed,
    setIsChangesSidebarCollapsed: deps.setIsChangesSidebarCollapsed,
    setIsRemoteMountsSectionCollapsed: deps.setIsRemoteMountsSectionCollapsed,
    setIsPortsSectionCollapsed: deps.setIsPortsSectionCollapsed,
    setIsChatbotsSectionCollapsed: deps.setIsChatbotsSectionCollapsed,
    setIsCliSectionCollapsed: deps.setIsCliSectionCollapsed,
    setIsSkillsSectionCollapsed: deps.setIsSkillsSectionCollapsed,
    setIsSpecsSectionCollapsed: deps.setIsSpecsSectionCollapsed,
    setIsLocalTerminalDockCollapsed: deps.setIsLocalTerminalDockCollapsed
  },
  toasts: {
    showToast: deps.showToast,
    captureError: deps.captureError,
    searchToolSkills: deps.searchToolSkills
  }
});
