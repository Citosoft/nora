import type {
  AppState,
  ChangeEntry,
  CommitHistoryEntry,
  ProjectSummary,
  RecentProject,
  TerminalSession,
  WorkspaceInstructionFile,
  WorkspaceScriptLauncher,
  WorktreeRecord
} from "@shared/appTypes";
import type { PersistedSessionState, WorkspaceTarget } from "./internal.types";

export interface WorkspaceRefreshHelperDeps {
  nowIso: () => string;
  readActiveRemoteMounts: () => Promise<AppState["activeRemoteMounts"]>;
  getSnapshot: () => AppState;
  setState: (partial: Partial<AppState>) => void;
  updateState: (updater: (state: AppState) => AppState) => void;
  getActiveChangesRoot: (state: AppState) => string;
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  getWorktreeTarget: (
    project: ProjectSummary,
    worktree: Pick<WorktreeRecord, "path" | "location">
  ) => WorkspaceTarget;
  readCurrentBranch: (target: WorkspaceTarget) => Promise<string>;
  getGitProgressCommand: (target: WorkspaceTarget, args: string[]) => Promise<string>;
  reportWorkspaceLoadingProgress: (projectId: string, detail: string, command: string | null) => void;
  detectWorkspaceScripts: (target: WorkspaceTarget) => Promise<WorkspaceScriptLauncher[]>;
  detectDefaultWorktreePrepareCommand: (target: WorkspaceTarget) => Promise<string | null>;
  detectWorkspaceInstructionFile: (target: WorkspaceTarget) => Promise<WorkspaceInstructionFile | null | undefined>;
  readCommitHistory: (target: WorkspaceTarget) => Promise<CommitHistoryEntry[]>;
  readProjectBranches: (target: WorkspaceTarget) => Promise<string[]>;
  readGitChanges: (target: WorkspaceTarget) => Promise<ChangeEntry[]>;
  normalizeLocalPath: (value: string) => string;
  summarizeChanges: (changes: ChangeEntry[]) => { additions: number; deletions: number } | null;
  isExecTimeoutError: (error: unknown) => boolean;
  describeGitTimeout: (operation: string) => string;
  readCommitEntry: (target: WorkspaceTarget, hash: string) => Promise<CommitHistoryEntry | null>;
  readCommitChanges: (target: WorkspaceTarget, hash: string) => Promise<ChangeEntry[]>;
  refreshWorkspaceSummaries: (reason: string) => Promise<void>;
  loadIndexedProjects: () => Promise<ProjectSummary[]>;
  loadRecentProjects: () => Promise<RecentProject[]>;
  readStoredProjectFiles: () => Promise<ProjectSummary[]>;
  isWorkspaceSuppressed: (project: Pick<ProjectSummary, "id" | "rootPath">) => boolean;
  isSuppressedWorkspaceRoot: (rootPath: string) => boolean;
  getProjectMetadata: (target: WorkspaceTarget) => Promise<ProjectSummary>;
  mergePersistedProjectSummary: (baseProject: ProjectSummary, persistedProject?: ProjectSummary | null) => ProjectSummary;
  saveAllProjects: (projects: ProjectSummary[]) => Promise<void>;
  loadStatesForProject: (projectId: string) => Promise<PersistedSessionState[]>;
  getLiveTerminalSnapshots: () => TerminalSession[];
}

export interface WorkspaceRefreshHelpers {
  refreshProjectState: () => Promise<AppState>;
  runRefreshWorkspaceSummaries: (reason: string) => Promise<void>;
}
