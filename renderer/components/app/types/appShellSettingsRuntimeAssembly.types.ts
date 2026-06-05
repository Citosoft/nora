import type { BuildSettingsRuntimeValueDeps } from "@/components/app/types/settingsRuntimeBuild.types";

/** Grouped inputs for `assembleSettingsRuntimeBuildDeps` — disjoint key sets that merge to `BuildSettingsRuntimeValueDeps`. */
export type AppShellSettingsRuntimeAssemblyInput = {
  nav: Pick<BuildSettingsRuntimeValueDeps, "snapshot" | "setActiveView">;
  appearance: Pick<
    BuildSettingsRuntimeValueDeps,
    | "themeMode"
    | "updateThemeMode"
    | "accentColor"
    | "updateAccentColor"
    | "uiFontId"
    | "updateUiFont"
    | "terminalThemeId"
    | "updateTerminalTheme"
    | "terminalFontId"
    | "updateTerminalFont"
    | "resolvedTheme"
    | "defaultTerminalShellId"
    | "handleDefaultTerminalShellChange"
  >;
  integrations: Pick<
    BuildSettingsRuntimeValueDeps,
    | "installedIdes"
    | "defaultIdeId"
    | "updateDefaultIde"
    | "forgeOAuthProviders"
    | "isLoadingForgeOAuthProviders"
    | "githubToken"
    | "githubAccountLabel"
    | "updateGithubToken"
    | "connectForgeAccount"
    | "updateGithubAccountLabel"
    | "gitlabToken"
    | "gitlabHost"
    | "gitlabAccountLabel"
    | "updateGitlabToken"
    | "updateGitlabHost"
    | "updateGitlabAccountLabel"
    | "vercelToken"
    | "vercelAccountLabel"
    | "updateVercelToken"
    | "disconnectVercelAccount"
  >;
  appPrefs: Pick<
    BuildSettingsRuntimeValueDeps,
    | "appSettings"
    | "updateFileEditorThemeId"
    | "updateHardwareAccelerationEnabled"
    | "updateWorkspaceStateStorageMode"
    | "updateDefaultAgentLaunchTarget"
    | "updatePreferredAgentToolId"
    | "updateSplitViewPreferences"
    | "canPreviewMacTitleBarChrome"
    | "forceMacTitleBarPreview"
    | "updateForceMacTitleBarPreview"
    | "updateNotificationPreferences"
    | "updateAnalyticsConsentStatus"
    | "analyticsAllowedInCurrentRun"
    | "analyticsRuntimeConfig"
    | "updateBrowserPreferences"
    | "chromeCookieProfiles"
    | "selectedChromeCookieProfileId"
    | "isLoadingChromeCookieProfiles"
    | "setSelectedChromeCookieProfileId"
    | "loadChromeCookieProfiles"
    | "handleImportChromeBrowserData"
    | "updateTerminalPresets"
    | "updateTerminalQuickLaunchDefaults"
    | "updateAiPreferredProvider"
    | "updateAiApiKey"
    | "updateAiModel"
    | "updateVoiceSettings"
    | "updateAiSimpleTaskSettings"
    | "aiModelOptions"
    | "aiModelLoading"
    | "aiModelError"
    | "refreshAiModels"
    | "relaunchApplication"
  >;
  runtime: Pick<
    BuildSettingsRuntimeValueDeps,
    | "safely"
    | "missingOptionalStartupDependencyCount"
    | "openOnboardingFlow"
    | "openStartupDependenciesDialog"
  >;
  sidebarLayout: Pick<
    BuildSettingsRuntimeValueDeps,
    | "isWorkspaceSidebarCollapsed"
    | "isChangesSidebarCollapsed"
    | "sidebarsSwapped"
    | "isRemoteMountsSectionCollapsed"
    | "isPortsSectionCollapsed"
    | "isChatbotsSectionCollapsed"
    | "isCliSectionCollapsed"
    | "isSkillsSectionCollapsed"
    | "isSpecsSectionCollapsed"
    | "isLocalTerminalDockCollapsed"
    | "setIsWorkspaceSidebarCollapsed"
    | "setIsChangesSidebarCollapsed"
    | "setSidebarsSwapped"
    | "setIsRemoteMountsSectionCollapsed"
    | "setIsPortsSectionCollapsed"
    | "setIsChatbotsSectionCollapsed"
    | "setIsCliSectionCollapsed"
    | "setIsSkillsSectionCollapsed"
    | "setIsSpecsSectionCollapsed"
    | "setIsLocalTerminalDockCollapsed"
  >;
  toasts: Pick<BuildSettingsRuntimeValueDeps, "showToast" | "captureError" | "searchToolSkills">;
};
