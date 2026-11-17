import type { InstructionsWorkspace } from "@/components/app/types/workspaceInstructions.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
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
  instructionsWorkspace: InstructionsWorkspace | null;
  memoryWorkspace: NativeWorkspace | null;
  forge: AppShellSignedInForgeSources;
  forgeWorkItemMutators: AppShellSignedInForgeWorkItemMutatorSources;
  vercel: AppShellSignedInVercelSources;
  gitBranches: AppShellSignedInGitBranchSources;
  changesFileHandlers: AppShellSignedInChangesFileHandlersSources;
  /** Same payload as former `ChangesPanelSectionBuildProvider`; derived from assembly in one place. */
  changesPanelSectionBuild: ChangesPanelSectionBuildDeps;
};
