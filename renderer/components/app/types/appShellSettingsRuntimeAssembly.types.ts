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
    | "openStartupDependenciesDialog"
  >;
  sidebarLayout: Pick<
    BuildSettingsRuntimeValueDeps,
    | "isWorkspaceSidebarCollapsed"
    | "isChangesSidebarCollapsed"
    | "isRemoteMountsSectionCollapsed"
    | "isPortsSectionCollapsed"
    | "isChatbotsSectionCollapsed"
    | "isCliSectionCollapsed"
    | "isSkillsSectionCollapsed"
    | "isSpecsSectionCollapsed"
    | "isLocalTerminalDockCollapsed"
    | "setIsWorkspaceSidebarCollapsed"
    | "setIsChangesSidebarCollapsed"
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
