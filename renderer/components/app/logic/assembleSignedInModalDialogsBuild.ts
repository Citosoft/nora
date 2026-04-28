import type { AppModalDialogsBuildDeps } from "@/components/app/types/appModalDialogsBuild.types";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";

type SignedInModalDialogsAssemblySlice = Pick<
  AppShellSignedInAssemblySources,
  "core" | "modalExtras" | "workspaceCatalog" | "forge" | "gitBranches"
>;

export const assembleSignedInModalDialogsBuild = (s: SignedInModalDialogsAssemblySlice): AppModalDialogsBuildDeps => {
  const { core, modalExtras, workspaceCatalog, forge, gitBranches } = s;
  const { handleCreateForgePullRequest } = forge;

  return {
    ...core,
    ...modalExtras,
    workspaceTasks: workspaceCatalog.workspaceTasks,
    forgeOverview: forge.forgeOverview,
    handleCreateForgePullRequest,
    openAddRemoteWorkspaceModal: core.openAddRemoteWorkspaceModal,
    activeBranch: gitBranches.activeBranch,
    parentRepoBranch: gitBranches.parentRepoBranch,
    windowUiStatePlatform: core.windowUiState.platform
  };
};
