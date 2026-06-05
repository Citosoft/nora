import { noraToolingManagementClient } from "@/components/app/clients/noraToolingManagementClient";
import type { SettingsRuntimeValue } from "@/components/app/types/settings.types";
import type { BuildSettingsRuntimeValueDeps } from "@/components/app/types/settingsRuntimeBuild.types";
import { withAgentToolEnabled } from "@shared/agentToolState";

export const buildSettingsRuntimeValue = (d: BuildSettingsRuntimeValueDeps): SettingsRuntimeValue => ({
  closeSettingsPage: () => d.setActiveView("main"),
  themeMode: d.themeMode,
  updateThemeMode: d.updateThemeMode,
  accentColor: d.accentColor,
  updateAccentColor: d.updateAccentColor,
  uiFontId: d.uiFontId,
  updateUiFont: d.updateUiFont,
  terminalThemeId: d.terminalThemeId,
  updateTerminalTheme: d.updateTerminalTheme,
  terminalFontId: d.terminalFontId,
  updateTerminalFont: d.updateTerminalFont,
  resolvedTheme: d.resolvedTheme,
  terminalShells: d.snapshot.terminalShells,
  defaultTerminalShellId: d.defaultTerminalShellId,
  updateDefaultTerminalShellId: d.handleDefaultTerminalShellChange,
  installedIdes: d.installedIdes,
  defaultIdeId: d.defaultIdeId,
  updateDefaultIde: d.updateDefaultIde,
  forgeOAuthProviders: d.forgeOAuthProviders,
  isLoadingForgeOAuthProviders: d.isLoadingForgeOAuthProviders,
  githubToken: d.githubToken,
  githubAccountLabel: d.githubAccountLabel,
  updateGithubToken: d.updateGithubToken,
  connectGithubAccount: () => {
    void d.connectForgeAccount("github");
  },
  disconnectGithubAccount: () => {
    d.updateGithubToken("");
    d.updateGithubAccountLabel(null);
  },
  gitlabToken: d.gitlabToken,
  gitlabHost: d.gitlabHost,
  gitlabAccountLabel: d.gitlabAccountLabel,
  updateGitlabToken: d.updateGitlabToken,
  updateGitlabHost: d.updateGitlabHost,
  disconnectGitlabAccount: () => {
    d.updateGitlabToken("");
    d.updateGitlabAccountLabel(null);
  },
  vercelToken: d.vercelToken,
  vercelAccountLabel: d.vercelAccountLabel,
  updateVercelToken: d.updateVercelToken,
  disconnectVercelAccount: d.disconnectVercelAccount,
  appSettings: d.appSettings,
  updateFileEditorThemeId: (fileEditorThemeId) => {
    void d.updateFileEditorThemeId(fileEditorThemeId).catch(d.captureError);
  },
  updateHardwareAcceleration: (enabled) => {
    void d.updateHardwareAccelerationEnabled(enabled).catch(d.captureError);
  },
  updateWorkspaceStateStorageMode: (mode) => {
    void d.updateWorkspaceStateStorageMode(mode).catch(d.captureError);
  },
  updateDefaultAgentLaunchTarget: (defaultAgentLaunchTarget) => {
    void d.updateDefaultAgentLaunchTarget(defaultAgentLaunchTarget).catch(d.captureError);
  },
  updatePreferredAgentToolId: (preferredAgentToolId) => {
    void d.updatePreferredAgentToolId(preferredAgentToolId).catch(d.captureError);
  },
  updateDefaultSplitViewGrid: (defaultSplitViewGridColumns, defaultSplitViewGridRows) => {
    void d.updateSplitViewPreferences({
      defaultSplitViewGridColumns,
      defaultSplitViewGridRows,
      rememberLastSplitViewPerWorkspace: d.appSettings.rememberLastSplitViewPerWorkspace,
      confirmSplitViewDelete: d.appSettings.confirmSplitViewDelete,
      showWorkspaceSessionTabs: d.appSettings.showWorkspaceSessionTabs
    }).catch(d.captureError);
  },
  updateRememberLastSplitViewPerWorkspace: (rememberLastSplitViewPerWorkspace) => {
    void d.updateSplitViewPreferences({
      defaultSplitViewGridColumns: d.appSettings.defaultSplitViewGridColumns,
      defaultSplitViewGridRows: d.appSettings.defaultSplitViewGridRows,
      rememberLastSplitViewPerWorkspace,
      confirmSplitViewDelete: d.appSettings.confirmSplitViewDelete,
      showWorkspaceSessionTabs: d.appSettings.showWorkspaceSessionTabs
    }).catch(d.captureError);
  },
  updateConfirmSplitViewDelete: (confirmSplitViewDelete) => {
    void d.updateSplitViewPreferences({
      defaultSplitViewGridColumns: d.appSettings.defaultSplitViewGridColumns,
      defaultSplitViewGridRows: d.appSettings.defaultSplitViewGridRows,
      rememberLastSplitViewPerWorkspace: d.appSettings.rememberLastSplitViewPerWorkspace,
      confirmSplitViewDelete,
      showWorkspaceSessionTabs: d.appSettings.showWorkspaceSessionTabs
    }).catch(d.captureError);
  },
  updateShowWorkspaceSessionTabs: (showWorkspaceSessionTabs) => {
    void d.updateSplitViewPreferences({
      defaultSplitViewGridColumns: d.appSettings.defaultSplitViewGridColumns,
      defaultSplitViewGridRows: d.appSettings.defaultSplitViewGridRows,
      rememberLastSplitViewPerWorkspace: d.appSettings.rememberLastSplitViewPerWorkspace,
      confirmSplitViewDelete: d.appSettings.confirmSplitViewDelete,
      showWorkspaceSessionTabs
    }).catch(d.captureError);
  },
  canPreviewMacTitleBarChrome: d.canPreviewMacTitleBarChrome,
  forceMacTitleBarPreview: d.forceMacTitleBarPreview,
  updateForceMacTitleBarPreview: d.updateForceMacTitleBarPreview,
  updateAgentCompletionNotifications: (agentCompletionNotificationsEnabled) => {
    void d.updateNotificationPreferences({
      agentCompletionNotificationsEnabled
    }).catch(d.captureError);
  },
  updateAnalyticsConsent: (enabled) => {
    void d.updateAnalyticsConsentStatus(enabled ? "granted" : "declined").catch(d.captureError);
  },
  analyticsAllowedInCurrentRun: d.analyticsAllowedInCurrentRun,
  analyticsDevModeSwitch: d.analyticsRuntimeConfig?.devModeAnalyticsSwitch ?? "enable-dev-analytics",
  updateOpenInternalBrowserOnNewPortDetection: (openInternalBrowserOnNewPortDetection) => {
    void d.updateBrowserPreferences({
      openInternalBrowserOnNewPortDetection
    }).catch(d.captureError);
  },
  chromeCookieProfiles: d.chromeCookieProfiles,
  selectedChromeCookieProfileId: d.selectedChromeCookieProfileId,
  isLoadingChromeCookieProfiles: d.isLoadingChromeCookieProfiles,
  setSelectedChromeCookieProfileId: (profileId) => d.setSelectedChromeCookieProfileId(profileId || null),
  reloadChromeCookieProfiles: d.loadChromeCookieProfiles,
  importChromeBrowserData: d.handleImportChromeBrowserData,
  updateTerminalPresets: (presets) => {
    void d.updateTerminalPresets(presets).catch(d.captureError);
  },
  updateTerminalQuickLaunchDefaults: (terminalQuickLaunchDefaults) => {
    void d.updateTerminalQuickLaunchDefaults(terminalQuickLaunchDefaults).catch(d.captureError);
  },
  updateAiPreferredProvider: (provider) => {
    void d.updateAiPreferredProvider(provider).catch(d.captureError);
  },
  updateAiApiKey: (provider, apiKey) => {
    void d.updateAiApiKey(provider, apiKey).catch(d.captureError);
  },
  updateAiModel: (provider, model) => {
    void d.updateAiModel(provider, model).catch(d.captureError);
  },
  updateVoiceSettings: (voice) => {
    void d.updateVoiceSettings(voice).catch(d.captureError);
  },
  updateAiSimpleTaskSettings: (settings) => {
    void d.updateAiSimpleTaskSettings(settings).catch(d.captureError);
  },
  aiModelOptions: d.aiModelOptions,
  aiModelLoading: d.aiModelLoading,
  aiModelError: d.aiModelError,
  refreshAiModels: (provider) => {
    void d.refreshAiModels(provider).catch(d.captureError);
  },
  relaunchApplication: () => {
    void d.relaunchApplication().catch(d.captureError);
  },
  agentCatalog: d.snapshot.agentCatalog,
  agentSkillCatalogs: d.snapshot.agentSkillCatalogs,
  installTool: (toolId) => {
    const tool = d.snapshot.agentCatalog.find((entry) => entry.id === toolId);
    if (!tool) {
      return;
    }

    void d.safely(() =>
      noraToolingManagementClient.installManagedTool({
        toolId,
        action: "install",
        installCommand: tool.installTemplate
      })
    );
  },
  toggleToolEnabled: (toolId, enabled) => {
    const tool = d.snapshot.agentCatalog.find((entry) => entry.id === toolId);
    if (!tool) {
      return;
    }

    void d.safely(() =>
      noraToolingManagementClient.saveManagedToolConfig({
        toolId,
        values: withAgentToolEnabled(tool.config.values, enabled)
      })
    );
  },
  refreshAgentCatalog: () => {
    void d.safely(() => noraToolingManagementClient.refreshToolCatalog());
  },
  searchToolSkills: d.searchToolSkills,
  installToolSkill: (toolId, skillReference) =>
    d.safely(() => noraToolingManagementClient.installManagedToolSkill({ toolId, skillReference })).then((next) => {
      if (!next) {
        throw new Error("Unable to install skill.");
      }
    }),
  removeToolSkill: (toolId, skillId) => {
    void d.safely(() => noraToolingManagementClient.removeManagedToolSkill({ toolId, skillId }));
  },
  missingOptionalStartupDependencyCount: d.missingOptionalStartupDependencyCount,
  openOnboardingFlow: d.openOnboardingFlow,
  openStartupDependenciesDialog: d.openStartupDependenciesDialog,
  workbenchLayout: {
    isWorkspaceSidebarCollapsed: d.isWorkspaceSidebarCollapsed,
    isChangesSidebarCollapsed: d.isChangesSidebarCollapsed,
    sidebarsSwapped: d.sidebarsSwapped,
    isRemoteMountsSectionCollapsed: d.isRemoteMountsSectionCollapsed,
    isPortsSectionCollapsed: d.isPortsSectionCollapsed,
    isChatbotsSectionCollapsed: d.isChatbotsSectionCollapsed,
    isCliSectionCollapsed: d.isCliSectionCollapsed,
    isSkillsSectionCollapsed: d.isSkillsSectionCollapsed,
    isSpecsSectionCollapsed: d.isSpecsSectionCollapsed,
    isLocalTerminalDockCollapsed: d.isLocalTerminalDockCollapsed
  },
  updateWorkbenchLayout: (next) => {
    if (typeof next.isWorkspaceSidebarCollapsed === "boolean") d.setIsWorkspaceSidebarCollapsed(next.isWorkspaceSidebarCollapsed);
    if (typeof next.isChangesSidebarCollapsed === "boolean") d.setIsChangesSidebarCollapsed(next.isChangesSidebarCollapsed);
    if (typeof next.sidebarsSwapped === "boolean") d.setSidebarsSwapped(next.sidebarsSwapped);
    if (typeof next.isRemoteMountsSectionCollapsed === "boolean") d.setIsRemoteMountsSectionCollapsed(next.isRemoteMountsSectionCollapsed);
    if (typeof next.isPortsSectionCollapsed === "boolean") d.setIsPortsSectionCollapsed(next.isPortsSectionCollapsed);
    if (typeof next.isChatbotsSectionCollapsed === "boolean") d.setIsChatbotsSectionCollapsed(next.isChatbotsSectionCollapsed);
    if (typeof next.isCliSectionCollapsed === "boolean") d.setIsCliSectionCollapsed(next.isCliSectionCollapsed);
    if (typeof next.isSkillsSectionCollapsed === "boolean") d.setIsSkillsSectionCollapsed(next.isSkillsSectionCollapsed);
    if (typeof next.isSpecsSectionCollapsed === "boolean") d.setIsSpecsSectionCollapsed(next.isSpecsSectionCollapsed);
    if (typeof next.isLocalTerminalDockCollapsed === "boolean") d.setIsLocalTerminalDockCollapsed(next.isLocalTerminalDockCollapsed);
  },
  triggerDevToast: (payload) => {
    d.showToast({
      variant: payload.variant,
      title: payload.title,
      description: payload.description
    });
  }
});
