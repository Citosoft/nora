import type { WorktreeRecord } from "@shared/appTypes";

export type WorktreeRemovalWorkspace = {
  agents: Array<{ worktreeId: string }>;
  terminals: Array<{ worktreeId: string }>;
};

export type RemovableWorktree = Pick<WorktreeRecord, "id" | "status">;
