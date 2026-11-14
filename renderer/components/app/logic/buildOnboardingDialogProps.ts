import { noraToolingManagementClient } from "@/components/app/clients/noraToolingManagementClient";
import { createAgentSkillCatalogMap, getSharedAgentSkillCatalog, SHARED_AGENT_SKILLS_TOOL_ID } from "@/components/app/logic/agentSkills";
import { NORA_SKILL_NAME, NORA_SKILL_REFERENCE } from "@shared/skills/bundled";
import type { OnboardingDialogProps } from "@/components/app/dialogs/OnboardingDialog";
import type { BuildOnboardingDialogPropsDeps } from "@/components/app/types/onboardingDialogBuild.types";

export const buildOnboardingDialogProps = (d: BuildOnboardingDialogPropsDeps): OnboardingDialogProps => {
  const skillCatalog = getSharedAgentSkillCatalog(createAgentSkillCatalogMap(d.snapshot?.agentSkillCatalogs ?? []));
  return {
    open: true,
    isNoraSkillInstalled: skillCatalog?.skills.some((skill) => skill.id === NORA_SKILL_NAME) ?? false,
    canInstallNoraSkill: skillCatalog?.supported ?? false,
    onInstallNoraSkill: async () => {
      const next = await d.safely(() => noraToolingManagementClient.installManagedToolSkill({ toolId: SHARED_AGENT_SKILLS_TOOL_ID, skillReference: NORA_SKILL_REFERENCE }));
      if (!next) throw new Error("Unable to install the Nora skill. Try again or install it later from Settings → Skills.");
    },
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
  };
};
