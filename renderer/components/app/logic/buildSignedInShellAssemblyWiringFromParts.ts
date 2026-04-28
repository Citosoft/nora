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

/** Packs the twelve coarse bundles produced in `AppRoot` into `AppShellSignedInAssemblySources` for assembly. */
export const buildSignedInShellAssemblyWiringFromParts = (
  core: AppShellSignedInCoreSources,
  workspaceCatalog: AppShellSignedInWorkspaceCatalogSources,
  workspaceContent: UseWorkspaceContentControllerResult,
  forge: AppShellSignedInForgeSources,
  forgeWorkItemMutators: AppShellSignedInForgeWorkItemMutatorSources,
  vercel: AppShellSignedInVercelSources,
  gitBranches: AppShellSignedInGitBranchSources,
  sessionSurface: AppShellSignedInSessionSurfaceSources,
  centerTabs: AppShellSignedInCenterTabsSources,
  aiModels: AppShellSignedInAiModelSources,
  modalExtras: AppShellSignedInModalExtrasSources,
  workspaceSidebarRest: AppShellSignedInWorkspaceSidebarRestSources,
  changesFileHandlers: AppShellSignedInChangesFileHandlersSources,
  chromeShell: AppShellSignedInChromeShellSources
): AppShellSignedInAssemblySources => ({
  core,
  workspaceCatalog,
  workspaceContent,
  forge,
  forgeWorkItemMutators,
  vercel,
  gitBranches,
  sessionSurface,
  centerTabs,
  aiModels,
  modalExtras,
  workspaceSidebarRest,
  changesFileHandlers,
  chromeShell
});
