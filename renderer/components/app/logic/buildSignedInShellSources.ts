import type { UseWorkspaceContentControllerResult } from "@/components/app/types/appHooks.types";
import type {
  AppShellSignedInAiModelSources,
  AppShellSignedInAssemblySources,
  AppShellSignedInCenterTabsSources,
  AppShellSignedInChangesFileHandlersSources,
  AppShellSignedInChromeShellSources,
  AppShellSignedInCoreSources,
  AppShellSignedInForgeSources,
  AppShellSignedInForgeWorkItemMutatorSources,
  AppShellSignedInGitBranchSources,
  AppShellSignedInModalExtrasSources,
  AppShellSignedInSessionSurfaceSources,
  AppShellSignedInVercelSources,
  AppShellSignedInWorkspaceCatalogSources,
  AppShellSignedInWorkspaceSidebarRestSources
} from "@/components/app/types/appShellSignedInAssemblySources.types";

export function buildSignedInShellSources(input: {
  core: AppShellSignedInCoreSources;
  workspaceCatalog: AppShellSignedInWorkspaceCatalogSources;
  workspaceContent: UseWorkspaceContentControllerResult;
  forge: AppShellSignedInForgeSources;
  forgeWorkItemMutators: AppShellSignedInForgeWorkItemMutatorSources;
  vercel: AppShellSignedInVercelSources;
  gitBranches: AppShellSignedInGitBranchSources;
  sessionSurface: AppShellSignedInSessionSurfaceSources;
  centerTabs: AppShellSignedInCenterTabsSources;
  aiModels: AppShellSignedInAiModelSources;
  modalExtras: AppShellSignedInModalExtrasSources;
  workspaceSidebarRest: AppShellSignedInWorkspaceSidebarRestSources;
  changesFileHandlers: AppShellSignedInChangesFileHandlersSources;
  chromeShell: AppShellSignedInChromeShellSources;
}): AppShellSignedInAssemblySources {
  return {
    core: buildSignedInCoreSources(input.core),
    workspaceCatalog: buildSignedInWorkspaceCatalogSources(input.workspaceCatalog),
    workspaceContent: buildSignedInWorkspaceContentSources(input.workspaceContent),
    forge: buildSignedInForgeSources(input.forge),
    forgeWorkItemMutators: buildSignedInForgeWorkItemMutatorSources(input.forgeWorkItemMutators),
    vercel: buildSignedInVercelSources(input.vercel),
    gitBranches: buildSignedInGitBranchSources(input.gitBranches),
    sessionSurface: buildSignedInSessionSurfaceSources(input.sessionSurface),
    centerTabs: buildSignedInCenterTabsSources(input.centerTabs),
    aiModels: buildSignedInAiModelSources(input.aiModels),
    modalExtras: buildSignedInModalExtrasSources(input.modalExtras),
    workspaceSidebarRest: buildSignedInWorkspaceSidebarRestSources(input.workspaceSidebarRest),
    changesFileHandlers: buildSignedInChangesFileHandlersSources(input.changesFileHandlers),
    chromeShell: buildSignedInChromeShellSources(input.chromeShell)
  };
}

function buildSignedInCoreSources(core: AppShellSignedInCoreSources): AppShellSignedInCoreSources {
  return core;
}

function buildSignedInWorkspaceCatalogSources(
  workspaceCatalog: AppShellSignedInWorkspaceCatalogSources
): AppShellSignedInWorkspaceCatalogSources {
  return workspaceCatalog;
}

function buildSignedInWorkspaceContentSources(
  workspaceContent: UseWorkspaceContentControllerResult
): UseWorkspaceContentControllerResult {
  return workspaceContent;
}

function buildSignedInForgeSources(forge: AppShellSignedInForgeSources): AppShellSignedInForgeSources {
  return forge;
}

function buildSignedInForgeWorkItemMutatorSources(
  forgeWorkItemMutators: AppShellSignedInForgeWorkItemMutatorSources
): AppShellSignedInForgeWorkItemMutatorSources {
  return forgeWorkItemMutators;
}

function buildSignedInVercelSources(vercel: AppShellSignedInVercelSources): AppShellSignedInVercelSources {
  return vercel;
}

function buildSignedInGitBranchSources(
  gitBranches: AppShellSignedInGitBranchSources
): AppShellSignedInGitBranchSources {
  return gitBranches;
}

function buildSignedInSessionSurfaceSources(
  sessionSurface: AppShellSignedInSessionSurfaceSources
): AppShellSignedInSessionSurfaceSources {
  return sessionSurface;
}

function buildSignedInCenterTabsSources(
  centerTabs: AppShellSignedInCenterTabsSources
): AppShellSignedInCenterTabsSources {
  return centerTabs;
}

function buildSignedInAiModelSources(aiModels: AppShellSignedInAiModelSources): AppShellSignedInAiModelSources {
  return aiModels;
}

function buildSignedInModalExtrasSources(
  modalExtras: AppShellSignedInModalExtrasSources
): AppShellSignedInModalExtrasSources {
  return modalExtras;
}

function buildSignedInWorkspaceSidebarRestSources(
  workspaceSidebarRest: AppShellSignedInWorkspaceSidebarRestSources
): AppShellSignedInWorkspaceSidebarRestSources {
  return workspaceSidebarRest;
}

function buildSignedInChangesFileHandlersSources(
  changesFileHandlers: AppShellSignedInChangesFileHandlersSources
): AppShellSignedInChangesFileHandlersSources {
  return changesFileHandlers;
}

function buildSignedInChromeShellSources(
  chromeShell: AppShellSignedInChromeShellSources
): AppShellSignedInChromeShellSources {
  return chromeShell;
}
