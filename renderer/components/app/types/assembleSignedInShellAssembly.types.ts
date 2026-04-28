import type { UseWorkspaceContentControllerResult } from "@/components/app/types/appHooks.types";
import type {
  AppShellSignedInAiModelSources,
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

/** Coarse bundles passed from `AppRoot` into signed-in shell slice assembly. */
export type AssembleSignedInShellAssemblyInput = {
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
};
