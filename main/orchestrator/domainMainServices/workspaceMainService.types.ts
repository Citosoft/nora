import type { AppState, CommitChangesPayload } from "@shared/appTypes";
import type { WorkspaceLifecycleHelpers } from "../../types/orchestratorWorkspaceLifecycle.types";
import type { WorkspaceMutationHelpers } from "../../types/orchestratorWorkspaceMutations.types";
import type { WorkspaceNavigationHelpers } from "../../types/orchestratorWorkspaceNavigation.types";
import type { WorkspaceRefreshHelpers } from "../../types/orchestratorWorkspaceRefresh.types";

type WorkspaceActionsHandle = ReturnType<
  (typeof import("../workspaceActions"))["createWorkspaceActions"]
>;

export type WorkspaceMainServiceDeps = {
  getWorkspaceActions: () => WorkspaceActionsHandle;
  navigation: WorkspaceNavigationHelpers;
  lifecycle: WorkspaceLifecycleHelpers;
  refresh: WorkspaceRefreshHelpers;
  mutations: WorkspaceMutationHelpers;
  commitChanges: (payload: CommitChangesPayload) => Promise<AppState>;
  pullChanges: () => Promise<AppState>;
  pushChanges: () => Promise<AppState>;
};
