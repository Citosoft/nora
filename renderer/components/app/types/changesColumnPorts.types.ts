import type {
  AppShellSignedInChangesFileHandlersSources,
  AppShellSignedInForgeSources,
  AppShellSignedInForgeWorkItemMutatorSources,
  AppShellSignedInGitBranchSources,
  AppShellSignedInVercelSources
} from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { ChangesPanelSectionBuildDeps } from "@/components/app/types/changesPanelSectionBuild.types";

/** Read surface for the changes sidebar column (git / Forge / Vercel wiring). */
export type ChangesColumnPorts = {
  forge: AppShellSignedInForgeSources;
  forgeWorkItemMutators: AppShellSignedInForgeWorkItemMutatorSources;
  vercel: AppShellSignedInVercelSources;
  gitBranches: AppShellSignedInGitBranchSources;
  changesFileHandlers: AppShellSignedInChangesFileHandlersSources;
  /** Same payload as former `ChangesPanelSectionBuildProvider`; derived from assembly in one place. */
  changesPanelSectionBuild: ChangesPanelSectionBuildDeps;
};
