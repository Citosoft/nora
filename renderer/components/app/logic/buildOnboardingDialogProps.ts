import type { OnboardingDialogProps } from "@/components/app/dialogs/OnboardingDialog";
import type { BuildOnboardingDialogPropsDeps } from "@/components/app/types/onboardingDialogBuild.types";

export const buildOnboardingDialogProps = (d: BuildOnboardingDialogPropsDeps): OnboardingDialogProps => ({
  open: true,
  dependencies: d.effectiveStartupDependencyReport?.dependencies ?? [],
  isLoadingDependencies: d.isStartupDependencyDialogBusy,
  installTargetId: d.startupDependencyInstallTargetId,
  installErrorMessage: d.startupDependencyInstallErrorMessage,
  tools: d.mode === "onboarding" ? d.snapshot?.agentCatalog ?? [] : [],
  installCommandDrafts: d.installCommandDrafts,
  isRefreshingTools: d.mode === "onboarding" ? d.isRefreshingOnboardingTools : false,
  currentWorkspaceName: d.mode === "onboarding" ? d.snapshot?.project?.name || null : null,
  currentWorkspacePath: d.mode === "onboarding" ? d.snapshot?.project?.rootPath || null : null,
  currentWorkspaceFramework: d.mode === "onboarding" ? d.snapshot?.project?.framework || null : null,
  currentWorkspaceBaseBranch: d.mode === "onboarding" ? d.snapshot?.project?.baseBranch || null : null,
  currentWorkspacePlatform: d.mode === "onboarding" ? d.snapshot?.project?.platform || null : null,
  isChoosingWorkspace: d.isAddingWorkspace,
  themeMode: d.themeMode,
  accentColor: d.accentColor,
  hardwareAccelerationEnabled: d.appSettings.hardwareAccelerationEnabled,
  workspaceStateStorageMode: d.appSettings.workspaceStateStorageMode,
  installedIdes: d.installedIdes,
  defaultIdeId: d.defaultIdeId,
  userDisplayName: d.userDisplayName,
  onThemeModeChange: d.updateThemeMode,
  onAccentColorChange: d.updateAccentColor,
  onHardwareAccelerationChange: (enabled) => {
    void d.updateHardwareAccelerationEnabled(enabled);
  },
  onWorkspaceStateStorageModeChange: (mode) => {
    void d.updateWorkspaceStateStorageMode(mode);
  },
  onDefaultIdeChange: d.updateDefaultIde,
  onUserDisplayNameChange: d.updateUserDisplayName,
  onInstallDependency: (dependencyId) => {
    void d.installStartupDependencyWithRefresh(dependencyId);
  },
  onCopyInstructions: d.copyStartupDependencyInstructions,
  onReloadDependencies: () => {
    void d.reloadStartupDependencyReport();
  },
  onRefreshTools: () => {
    void d.refreshOnboardingTools();
  },
  onInstallDraftChange: d.setInstallCommandDraft,
  onInstallTool: (toolId) => {
    void d.installOnboardingTool(toolId);
  },
  onSetToolEnabled: (toolId, enabled) => {
    void d.setOnboardingToolEnabled(toolId, enabled);
  },
  onChooseWorkspace: () => {
    void d.openAddWorkspaceModal();
  },
  onSkipOnboarding: d.completeOnboarding,
  onStart: d.completeOnboarding
});
