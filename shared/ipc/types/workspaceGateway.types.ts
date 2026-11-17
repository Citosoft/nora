import type { WorkspaceDiscoveryResult } from "../../types/workspaceImport.types";
import type {
  ArchiveExternalHarnessThreadPayload,
  AppState,
  CommitChangesPayload,
  CreateProjectWorkspacePayload,
  CreateProjectWorkspaceResult,
  ConnectRemoteProjectPayload,
  CreateWorkspaceDirectoryPayload,
  GenerateCommitMessagePayload,
  GenerateCommitMessageResult,
  ImportBrowserImagePayload,
  NoraDetectableContextBundleSummary,
  TerminalPreset,
  WorkspaceFileRequest,
  WorkspaceGitStatusSummary,
  SetWorkspaceUpstreamPayload,
  WorkspaceNoteSummary,
  WorkspacePathStatResult,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary,
  CheckoutWorkspaceBranchPayload,
  SelectChangesCheckoutPayload,
  WriteWorkspaceFilePayload
} from "../../appTypes";
import type { WorkspaceImageFileContent } from "../../types/workspaceFile.types";

export interface WorkspaceLoadingProgressPayload {
  projectId: string;
  detail: string;
  command: string | null;
}

export interface WorkspaceBridge {
  discoverWorkspaces: () => Promise<WorkspaceDiscoveryResult>;
  onWorkspaceTasksChanged: (listener: (projectId: string) => void) => () => void;
  chooseProject: () => Promise<AppState>;
  chooseProjectAtPath: (defaultPath: string, title?: string) => Promise<AppState>;
  createProjectWorkspace: (payload: CreateProjectWorkspacePayload) => Promise<CreateProjectWorkspaceResult>;
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
  /** The project's own logo for its avatar, or null when none is detected. */
  readWorkspaceLogo: (projectId: string) => Promise<WorkspaceImageFileContent | null>;
  /** Opens a document file (e.g. a PDF) Nora cannot render in the OS default app. */
  openWorkspaceFileExternally: (payload: WorkspaceFileRequest) => Promise<void>;
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
  archiveExternalHarnessThread: (payload: ArchiveExternalHarnessThreadPayload) => Promise<void>;
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
  checkoutWorkspaceBranch: (payload: CheckoutWorkspaceBranchPayload) => Promise<AppState>;
  selectChangesCheckout: (payload: SelectChangesCheckoutPayload) => Promise<AppState>;
  setWorkspaceUpstream: (payload: SetWorkspaceUpstreamPayload) => Promise<WorkspaceGitStatusSummary>;
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
