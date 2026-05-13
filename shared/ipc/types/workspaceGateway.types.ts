import type {
  AgentContextSelection,
  AppState,
  CommitChangesPayload,
  ConnectRemoteProjectPayload,
  CreateWorkspaceDirectoryPayload,
  ExternalHarnessContextRef,
  ExternalHarnessSessionSummary,
  GenerateCommitMessagePayload,
  GenerateCommitMessageResult,
  ImportBrowserImagePayload,
  ImportedContextBundleSummary,
  NoraDetectableContextBundleSummary,
  TerminalPreset,
  WorkspaceFileRequest,
  WorkspaceGitStatusSummary,
  WorkspaceNoteSummary,
  WorkspacePathStatResult,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary,
  WriteWorkspaceFilePayload
} from "../../appTypes";
import type { WorkspaceImageFileContent } from "../../types/workspaceFile.types";

export interface WorkspaceLoadingProgressPayload {
  projectId: string;
  detail: string;
  command: string | null;
}

export interface WorkspaceBridge {
  chooseProject: () => Promise<AppState>;
  chooseProjectAtPath: (defaultPath: string, title?: string) => Promise<AppState>;
  openSshProject: (payload: ConnectRemoteProjectPayload) => Promise<AppState>;
  mountRemoteProject: (payload: ConnectRemoteProjectPayload) => Promise<{ mountPoint: string; mountedUnc: string }>;
  connectRemoteProject: (mountPoint: string, host: string) => Promise<AppState>;
  unmountRemoteProject: (mountPoint: string) => Promise<AppState>;
  selectProject: (projectRoot: string) => Promise<AppState>;
  focusWorkspace: (projectId: string) => Promise<AppState>;
  closeProject: () => Promise<AppState>;
  removeProject: (projectRoot: string) => Promise<AppState>;
  refresh: () => Promise<AppState>;
  resetWorkspaces: () => Promise<AppState>;
  listWorkspaceFiles: (projectId: string, rootPath?: string) => Promise<string[]>;
  listWorkspaceDirectories: (projectId: string, rootPath?: string) => Promise<string[]>;
  listWorkspaceTasks: (projectId: string) => Promise<WorkspaceTaskSummary[]>;
  listWorkspaceSpecs: (projectId: string) => Promise<WorkspaceSpecSummary[]>;
  listWorkspaceNotes: (projectId: string) => Promise<WorkspaceNoteSummary[]>;
  resolveWorkspaceStatePath: (payload: WorkspaceFileRequest) => Promise<string>;
  getWorkspaceTaskBoard: (projectId: string) => Promise<WorkspaceTaskBoard>;
  saveWorkspaceTaskBoard: (projectId: string, board: WorkspaceTaskBoard) => Promise<WorkspaceTaskBoard>;
  getWorkspaceSplitViews: (projectId: string) => Promise<WorkspaceSplitViewCollection>;
  saveWorkspaceSplitViews: (
    projectId: string,
    collection: WorkspaceSplitViewCollection
  ) => Promise<WorkspaceSplitViewCollection>;
  saveWorkspaceTerminalPresets: (projectId: string, presets: TerminalPreset[]) => Promise<AppState>;
  readWorkspaceFile: (payload: WorkspaceFileRequest) => Promise<string>;
  readWorkspaceImageFile: (payload: WorkspaceFileRequest) => Promise<WorkspaceImageFileContent>;
  writeWorkspaceFile: (payload: WriteWorkspaceFilePayload) => Promise<AppState>;
  createWorkspaceDirectory: (payload: CreateWorkspaceDirectoryPayload) => Promise<AppState>;
  importBrowserImageToWorkspace: (payload: ImportBrowserImagePayload) => Promise<AppState>;
  moveWorkspaceFile: (payload: {
    projectId: string;
    fromPath: string;
    toPath: string;
    rootPath?: string;
  }) => Promise<AppState>;
  deleteWorkspaceFile: (payload: WorkspaceFileRequest) => Promise<AppState>;
  searchWorkspaceFiles: (payload: WorkspaceSearchRequest) => Promise<WorkspaceSearchResult[]>;
  listImportedContextBundles: (projectId: string, rootPath?: string) => Promise<ImportedContextBundleSummary[]>;
  listExternalHarnessContextSessions: (
    projectId: string,
    rootPath?: string
  ) => Promise<ExternalHarnessSessionSummary[]>;
  composeExternalHarnessContextSelections: (
    projectId: string,
    ref: ExternalHarnessContextRef
  ) => Promise<AgentContextSelection[]>;
  listNoraDetectableContextBundles: (
    projectId: string,
    sessionId: string,
    worktreeId: string
  ) => Promise<NoraDetectableContextBundleSummary[]>;
  importNoraDetectableContextBundle: (payload: {
    projectId: string;
    sessionId: string;
    worktreeId: string;
    bundleId: string;
    workspaceRoot: string;
  }) => Promise<string | null>;
  readNoraDetectableContextBundle: (payload: {
    projectId: string;
    sessionId: string;
    worktreeId: string;
    bundleId: string;
  }) => Promise<string | null>;
  deleteNoraDetectableContextBundle: (payload: {
    projectId: string;
    sessionId: string;
    worktreeId: string;
    bundleId: string;
  }) => Promise<boolean>;
  statWorkspacePath: (payload: WorkspaceFileRequest) => Promise<WorkspacePathStatResult>;
  getWorkspaceGitStatusSummary: (
    payload: { projectId: string; rootPath?: string }
  ) => Promise<WorkspaceGitStatusSummary>;
  selectChange: (pathName: string) => Promise<AppState>;
  discardChange: (pathName: string) => Promise<AppState>;
  inspectCommit: (hash: string) => Promise<AppState>;
  clearCommitInspection: () => Promise<AppState>;
  commitChanges: (payload: CommitChangesPayload) => Promise<AppState>;
  generateCommitMessage: (payload?: GenerateCommitMessagePayload) => Promise<GenerateCommitMessageResult>;
  pullChanges: () => Promise<AppState>;
  pushChanges: () => Promise<AppState>;
  onWorkspaceLoadingProgress: (listener: (payload: WorkspaceLoadingProgressPayload) => void) => () => void;
}

export interface WorkspaceGateway extends Omit<WorkspaceBridge, "commitChanges" | "connectRemoteProject"> {
  connectRemoteProject: (mountPoint: string, host?: string) => Promise<AppState>;
  commitChanges: (message: string, paths?: string[]) => Promise<AppState>;
}
