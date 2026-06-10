import type { AppState, CreateAgentPayload, ProjectSummary, StartLoopRunPayload, WorktreeRecord } from "@shared/appTypes";
import type { WorkspaceTarget } from "@main/types/internal.types";

export type PrepareLoopRunWorktreeDeps = {
  nowIso: () => string;
  getSnapshot: () => AppState;
  resolveWorktreeForSpawn: (
    project: ProjectSummary,
    payload: CreateAgentPayload,
    agentName: string,
    onCreatingWorktree?: (session: import("@shared/appTypes").SessionRecord, worktree: WorktreeRecord) => Promise<void>
  ) => Promise<{ session: import("@shared/appTypes").SessionRecord; worktree: WorktreeRecord; createdWorktree: boolean }>;
  getWorktreeTarget: (project: ProjectSummary, worktree: Pick<WorktreeRecord, "path" | "location">) => WorkspaceTarget;
  checkoutBranchForLaunch: (
    target: WorkspaceTarget,
    branchCheckout: NonNullable<CreateAgentPayload["branchCheckout"]>
  ) => Promise<string>;
  prepareWorktree: (target: WorkspaceTarget, command: string) => Promise<void>;
  updateState: (updater: (state: AppState) => AppState) => void;
  upsertSession: (sessions: AppState["sessions"], session: AppState["sessions"][number]) => AppState["sessions"];
  upsertWorktree: (worktrees: AppState["worktrees"], worktree: WorktreeRecord) => AppState["worktrees"];
  upsertWorkspaceSummary: (workspaces: AppState["workspaces"], workspace: AppState["workspaces"][number]) => AppState["workspaces"];
  persistWorkspaceState: (state: AppState) => Promise<void>;
};

export type PreparedLoopRunWorktree = {
  sessionId: string;
  worktreeId: string;
  worktreePath: string;
};

export type PrepareLoopRunWorktreeInput = {
  payload: StartLoopRunPayload;
  writerToolId: string;
  writerName: string;
  onProgress?: (message: string) => Promise<void>;
};
