import type { AppState, ProjectSummary } from "@shared/appTypes";
import type { createWorktreeHelpers } from "@main/orchestrator/worktrees";

export interface CreateWorkspaceWorktreeDeps {
  worktrees: Pick<ReturnType<typeof createWorktreeHelpers>, "createInitialSessionState" | "planManagedWorktree" | "createWorktree" | "upsertSession" | "upsertWorktree" | "upsertWorkspaceSummary">;
  getSnapshot(): AppState;
  validateBranch(project: ProjectSummary, branch: string): Promise<void>;
  updateState(update: (state: AppState) => AppState): void;
  persistWorkspaceState(state: AppState): Promise<void>;
  refreshProjectState(): Promise<AppState>;
}
