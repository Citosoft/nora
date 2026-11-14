import { assembleSignedInCenterContentBuild } from "@/components/app/logic/assembleSignedInCenterContentBuild";
import { assembleSignedInChangesPanelSectionBuild } from "@/components/app/logic/assembleSignedInChangesPanelSectionBuild";
import { assembleSignedInWorkspaceSidebarBuild } from "@/components/app/logic/assembleSignedInWorkspaceSidebarBuild";
import { buildAppToolsProps } from "@/components/app/logic/buildAppToolsProps";
import { buildTitleBarProps } from "@/components/app/logic/buildTitleBarProps";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { ChangesColumnPorts } from "@/components/app/types/changesColumnPorts.types";
import type { ChromeShellPorts } from "@/components/app/types/chromeShellPorts.types";
import type { ModalClusterPorts } from "@/components/app/types/modalClusterPorts.types";
import type { SessionCenterPorts } from "@/components/app/types/sessionCenterPorts.types";
import type { WorkspaceSidebarPorts } from "@/components/app/types/workspaceSidebarPorts.types";
import type { AppChromeShellComposeSlice } from "@/components/app/types/appChromeShellComposeSlice.types";
import type { AppModalDialogsBuildDeps } from "@/components/app/types/appModalDialogsBuild.types";
import type { ThreadForgeClient } from "@/components/app/types/threadForge.types";
import type { CenterDiffPorts } from "@/components/app/types/centerDiff.types";
import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";

/** Session center surface fields (terminal dock theme + tabs/editor slices) without center-column build deps. */
export const buildSessionCenterSurfacePortsFromAssembly = (
  a: AppShellSignedInAssemblySources
): Omit<SessionCenterPorts, "centerContentBuild"> => ({
  forgeItems: {
    projectId: a.core.snapshot.project?.id ?? null,
    overview: a.forge.forgeOverview,
    loading: a.forge.isLoadingForgeOverview,
    refresh: a.forge.refreshForgeOverview,
    readDetail: (projectId, kind, item) => {
      const repo = a.forge.forgeOverview?.repo;
      if (projectId !== a.core.snapshot.project?.id || !repo) return Promise.reject(new Error("This item’s workspace is no longer active."));
      return noraIntegrationClient.getForgeWorkItemDetail(projectId, kind, item.number, {
        githubToken: a.workspaceSidebarRest.githubToken,
        gitlabToken: a.workspaceSidebarRest.gitlabToken,
        gitlabHost: a.workspaceSidebarRest.gitlabHost,
        forgeRepoHostOverride: repo.provider === "gitlab" ? repo.host : null,
        forgeRepoFullNameOverride: repo.provider === "gitlab" ? repo.fullName : null
      });
    },
    openIntegrations: () => a.core.openSettingsPage("integrations"),
    open: (projectId, kind, item) => {
      if (projectId !== a.core.snapshot.project?.id) return;
      a.sessionSurface.setActiveWorkspaceContentTab(null);
      a.sessionSurface.workspaceSessionViews.setActiveViewId(null);
      a.workspaceContent.setTaskEditorState(null);
      a.workspaceContent.setIsTaskBoardOpen(false);
      a.workspaceContent.setIsSpecBrowserOpen(false);
      a.workspaceContent.setIsNoteBrowserOpen(false);
      const repo = a.forge.forgeOverview?.repo;
      const override = repo?.provider === "gitlab" ? { host: repo.host, fullName: repo.fullName } : null;
      a.centerTabs.openForgeViewer(projectId, kind, item.number, `${kind === "pull_request" && repo?.provider === "gitlab" ? "!" : "#"}${item.number} ${item.title}`, override);
    }
  },
  onOpenThreadSettings: () => a.core.openSettingsPage("threads"),
  onOpenBotSettings: () => a.core.openSettingsPage("bots"),
  sessionSurface: a.sessionSurface,
  centerTabs: a.centerTabs,
  aiModels: a.aiModels,
  resolvedTheme: a.core.resolvedTheme,
  terminalThemeId: a.sessionSurface.terminalThemeId,
  terminalFontId: a.sessionSurface.terminalFontId
});

export const buildSessionCenterPortsFromAssembly = (a: AppShellSignedInAssemblySources): SessionCenterPorts => ({
  ...buildSessionCenterSurfacePortsFromAssembly(a),
  centerContentBuild: assembleSignedInCenterContentBuild(a)
});

export const buildChangesColumnPortsFromAssembly = (
  a: AppShellSignedInAssemblySources,
  centerDiff: Pick<CenterDiffPorts, "openWorkspaceDiff">
): ChangesColumnPorts => ({
  forge: a.forge,
  forgeWorkItemMutators: a.forgeWorkItemMutators,
  vercel: a.vercel,
  gitBranches: a.gitBranches,
  changesFileHandlers: a.changesFileHandlers,
  changesPanelSectionBuild: assembleSignedInChangesPanelSectionBuild(a, centerDiff)
});

export const buildModalClusterPorts = (modalDialogs: AppModalDialogsBuildDeps): ModalClusterPorts => ({
  modalDialogs
});

export const buildWorkspaceSidebarPortsFromAssembly = (a: AppShellSignedInAssemblySources, chrome: AppChromeShellComposeSlice, threadForge: ThreadForgeClient): WorkspaceSidebarPorts => {
  const onOpenConnectionsSettings = () => a.core.openSettingsPage("connections");
  return {
    sidebarBuild: assembleSignedInWorkspaceSidebarBuild(a),
    utilities: {
      status: chrome.workspaceStatus,
      updates: chrome.updateIndicators,
      appTools: { ...buildAppToolsProps(buildTitleBarProps(chrome.titleBar)), onOpenConnectionsSettings,
        onOpenHomeTerminal: () => { void a.chromeShell.focusLocalTerminalDock(); }
      }
    },
    threadForge,
    recentWorkspaces: chrome.titleBar.recentWorkspaces,
    onOpenRecentWorkspace: chrome.titleBar.handleOpenRecentWorkspace,
    onOpenConnectionsSettings,
    onAddRemoteWorkspace: a.core.openAddRemoteWorkspaceModal
  };
};

export const buildChromeShellPorts = (
  compose: AppChromeShellComposeSlice,
  sources: AppShellSignedInAssemblySources["chromeShell"]
): ChromeShellPorts => ({
  compose,
  sources
});
