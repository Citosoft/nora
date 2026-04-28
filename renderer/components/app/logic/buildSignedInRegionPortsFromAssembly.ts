import { assembleSignedInCenterContentBuild } from "@/components/app/logic/assembleSignedInCenterContentBuild";
import { assembleSignedInChangesPanelSectionBuild } from "@/components/app/logic/assembleSignedInChangesPanelSectionBuild";
import { assembleSignedInWorkspaceSidebarBuild } from "@/components/app/logic/assembleSignedInWorkspaceSidebarBuild";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { ChangesColumnPorts } from "@/components/app/types/changesColumnPorts.types";
import type { ChromeShellPorts } from "@/components/app/types/chromeShellPorts.types";
import type { ModalClusterPorts } from "@/components/app/types/modalClusterPorts.types";
import type { SessionCenterPorts } from "@/components/app/types/sessionCenterPorts.types";
import type { WorkspaceSidebarPorts } from "@/components/app/types/workspaceSidebarPorts.types";
import type { AppChromeShellComposeSlice } from "@/components/app/types/appChromeShellComposeSlice.types";
import type { AppModalDialogsBuildDeps } from "@/components/app/types/appModalDialogsBuild.types";

/** Session center surface fields (terminal dock theme + tabs/editor slices) without center-column build deps. */
export const buildSessionCenterSurfacePortsFromAssembly = (
  a: AppShellSignedInAssemblySources
): Omit<SessionCenterPorts, "centerContentBuild"> => ({
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

export const buildChangesColumnPortsFromAssembly = (a: AppShellSignedInAssemblySources): ChangesColumnPorts => ({
  forge: a.forge,
  forgeWorkItemMutators: a.forgeWorkItemMutators,
  vercel: a.vercel,
  gitBranches: a.gitBranches,
  changesFileHandlers: a.changesFileHandlers,
  changesPanelSectionBuild: assembleSignedInChangesPanelSectionBuild(a)
});

export const buildModalClusterPorts = (modalDialogs: AppModalDialogsBuildDeps): ModalClusterPorts => ({
  modalDialogs
});

export const buildWorkspaceSidebarPortsFromAssembly = (a: AppShellSignedInAssemblySources): WorkspaceSidebarPorts => ({
  sidebarBuild: assembleSignedInWorkspaceSidebarBuild(a)
});

export const buildChromeShellPorts = (
  compose: AppChromeShellComposeSlice,
  sources: AppShellSignedInAssemblySources["chromeShell"]
): ChromeShellPorts => ({
  compose,
  sources
});
