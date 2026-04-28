import type {
  AppState,
  CreateAgentPayload,
  CreateTerminalPayload,
  ProjectSummary,
  SessionRecord,
  WorktreeRecord
} from "@shared/appTypes";
import type { PersistedSessionState } from "./internal.types";

export interface WorktreeSelectionDeps {
  nowIso: () => string;
  getSnapshot: () => AppState;
  createInitialSessionState: (project: ProjectSummary) => Promise<PersistedSessionState>;
  getOrCreateRootWorktree: (
    project: ProjectSummary,
    session: SessionRecord,
    existingWorktrees: WorktreeRecord[]
  ) => Promise<WorktreeRecord>;
  planManagedWorktree: (
    project: ProjectSummary,
    session: SessionRecord,
    agentName: string,
    worktreeBranch?: CreateAgentPayload["worktreeBranch"]
  ) => WorktreeRecord;
  createWorktree: (
    project: ProjectSummary,
    session: SessionRecord,
    agentName: string,
    plannedWorktree?: WorktreeRecord
  ) => Promise<WorktreeRecord>;
  isWindowsUncPath: (value: string) => boolean;
}

export interface WorktreeSelectionHelpers {
  resolveWorktreeForSpawn: (
    project: ProjectSummary,
    payload: CreateAgentPayload,
    agentName: string,
    onCreatingWorktree?: (session: SessionRecord, worktree: WorktreeRecord) => Promise<void>
  ) => Promise<{ session: SessionRecord; worktree: WorktreeRecord; createdWorktree: boolean }>;
  resolveWorktreeForTerminal: (
    project: ProjectSummary,
    target: CreateTerminalPayload["target"]
  ) => Promise<{ session: SessionRecord; worktree: WorktreeRecord }>;
}
