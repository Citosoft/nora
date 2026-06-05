import type {
  AgentContextSelection,
  AgentContextSourceSummary,
  AgentContextState,
  AgentContextPreview,
  AgentPromptDispatchResult,
  AgentPromptSubmission,
  AgentSkillInstallOutputEvent,
  AgentSkillSearchResult,
  AppState,
  CommitChangesPayload,
  CreateAgentPayload,
  CreateTerminalPayload,
  CreateWorkspaceDirectoryPayload,
  ExternalHarnessContextRef,
  ExternalHarnessSessionSummary,
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeCreatePullRequestPayload,
  ForgeOverview,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemDetail,
  ForgeWorkflowRunDetail,
  ForgeWorkItemKind,
  InstallAgentSkillPayload,
  InstallToolPayload,
  LocalTerminalState,
  RemoveAgentSkillPayload,
  SaveToolConfigPayload,
  TerminalPreset,
  ToolUsageInfo,
  VercelDeploymentSummary,
  VercelProjectSummary,
  VercelRedeployPayload,
  VercelRuntimeLogEntry,
  VercelRuntimeLogStreamRequest,
  WorkspaceFileRequest,
  WorkspaceGitStatusSummary,
  ImportedContextBundleSummary,
  NoraDetectableContextBundleSummary,
  WorkspaceNoteSummary,
  WorkspacePathStatResult,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary,
  WriteWorkspaceFilePayload
} from "@shared/appTypes";
import type { WorkspaceImageFileContent } from "@shared/types/workspaceFile.types";

export interface SnapshotService {
  getSnapshot: () => AppState;
  getAgentTerminalBuffer: (agentId: string) => string;
  getTerminalBuffer: (sessionId: string) => string;
  getLocalTerminalState: () => LocalTerminalState | null;
  getAgentContextPreview: (agentId: string) => Promise<AgentContextPreview>;
  getAgentContextState: (agentId: string) => Promise<AgentContextState>;
  listWorkspaceAgentContextSources: (
    projectId: string,
    excludeAgentId?: string
  ) => Promise<AgentContextSourceSummary[]>;
}

export interface WorkspaceService {
  selectProject: (projectRoot: string) => Promise<AppState>;
  focusWorkspace: (projectId: string) => Promise<AppState>;
  closeProject: () => Promise<AppState>;
  removeProject: (projectRoot: string) => Promise<AppState>;
  openDirectSshProject: (
    payload: { host: string; user?: string; port?: number | null; remotePath: string; alias?: string }
  ) => Promise<AppState>;
  removeProjectsWithinMount: (
    mountPoint: string,
    relatedMountRoots?: string[]
  ) => Promise<void>;
  refreshProjectState: () => Promise<AppState>;
  resetWorkspaces: () => Promise<AppState>;
  readWorkspaceFile: (payload: WorkspaceFileRequest) => Promise<string>;
  resolveWorkspaceStatePath: (payload: WorkspaceFileRequest) => Promise<string>;
  readWorkspaceImageFile: (
    payload: WorkspaceFileRequest
  ) => Promise<WorkspaceImageFileContent>;
  listWorkspaceFiles: (
    projectId: string,
    rootPath?: string
  ) => Promise<string[]>;
  listWorkspaceDirectories: (
    projectId: string,
    rootPath?: string
  ) => Promise<string[]>;
  listWorkspaceSpecs: (projectId: string) => Promise<WorkspaceSpecSummary[]>;
  listWorkspaceNotes: (projectId: string) => Promise<WorkspaceNoteSummary[]>;
  searchWorkspaceFiles: (
    payload: WorkspaceSearchRequest
  ) => Promise<WorkspaceSearchResult[]>;
  listImportedContextBundles: (
    projectId: string,
    rootPath?: string
  ) => Promise<ImportedContextBundleSummary[]>;
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
  getWorkspaceGitStatusSummary: (payload: {
    projectId: string;
    rootPath?: string;
  }) => Promise<WorkspaceGitStatusSummary>;
  listWorkspaceTasks: (projectId: string) => Promise<WorkspaceTaskSummary[]>;
  getWorkspaceTaskBoard: (projectId: string) => Promise<WorkspaceTaskBoard>;
  saveWorkspaceTaskBoard: (
    projectId: string,
    board: WorkspaceTaskBoard
  ) => Promise<WorkspaceTaskBoard>;
  createWorkspaceTask: (
    projectId: string,
    taskDescription: string
  ) => Promise<AppState>;
  getWorkspaceSplitViews: (projectId: string) => Promise<WorkspaceSplitViewCollection>;
  saveWorkspaceSplitViews: (
    projectId: string,
    collection: WorkspaceSplitViewCollection
  ) => Promise<WorkspaceSplitViewCollection>;
  saveWorkspaceTerminalPresets: (
    projectId: string,
    presets: TerminalPreset[]
  ) => Promise<AppState>;
  createWorkspaceDirectory: (payload: CreateWorkspaceDirectoryPayload) => Promise<AppState>;
  moveWorkspaceFile: (
    payload: { projectId: string; fromPath: string; toPath: string; rootPath?: string }
  ) => Promise<AppState>;
  deleteWorkspaceFile: (payload: WorkspaceFileRequest) => Promise<AppState>;
  writeWorkspaceFile: (payload: WriteWorkspaceFilePayload) => Promise<AppState>;
  importWorkspaceBinaryFile: (payload: { projectId: string; path: string; content: Buffer; rootPath?: string }) => Promise<AppState>;
  selectChange: (pathName: string) => AppState;
  discardChange: (pathName: string) => Promise<AppState>;
  inspectCommit: (hash: string) => Promise<AppState>;
  clearCommitInspection: () => Promise<AppState>;
  commitChanges: (payload: CommitChangesPayload) => Promise<AppState>;
  pullChanges: () => Promise<AppState>;
  pushChanges: () => Promise<AppState>;
}

export interface SessionService {
  createAgent: (payload: CreateAgentPayload) => Promise<AppState>;
  createTerminal: (payload: CreateTerminalPayload) => Promise<AppState>;
  renameTerminal: (sessionId: string, name: string) => Promise<AppState>;
  openLocalTerminal: (shellId?: string) => Promise<LocalTerminalState>;
  clearAgentContext: (agentId: string) => Promise<AgentContextPreview>;
  clearAgentTerminal: (agentId: string) => Promise<AppState>;
  clearTerminal: (sessionId: string) => Promise<AppState>;
  clearLocalTerminal: () => Promise<LocalTerminalState | null>;
  sendAgentInput: (agentId: string, input: string) => Promise<AppState>;
  sendAgentPrompt: (agentId: string, input: AgentPromptSubmission) => Promise<AgentPromptDispatchResult>;
  sendAgentTerminalInput: (
    agentId: string,
    input: string
  ) => Promise<void>;
  sendTerminalInput: (
    sessionId: string,
    input: string
  ) => Promise<void>;
  resizeAgentTerminal: (
    agentId: string,
    cols: number,
    rows: number
  ) => AppState;
  resizeTerminal: (
    sessionId: string,
    cols: number,
    rows: number
  ) => AppState;
  focusWorktree: (worktreeId: string) => Promise<AppState>;
  focusAgent: (agentId: string) => Promise<AppState>;
  focusTerminal: (sessionId: string) => Promise<AppState>;
  restartAgent: (agentId: string) => Promise<AppState>;
  restartTerminal: (sessionId: string) => Promise<AppState>;
  restartLocalTerminal: () => Promise<LocalTerminalState>;
  destroyAgent: (agentId: string) => Promise<AppState>;
  destroyTerminal: (sessionId: string) => Promise<AppState>;
  removeWorktree: (worktreeId: string) => Promise<AppState>;
  destroyLocalTerminal: () => Promise<LocalTerminalState | null>;
  stopAllAgentsGracefully: (
    onProgress?: (payload: { detail: string; command: string | null }) => void
  ) => Promise<void>;
}

export interface ToolingService {
  refreshCatalog: (options?: import("@main/types/agentDetectionCache.types").RefreshCatalogOptions) => Promise<AppState>;
  scheduleCatalogRefresh: () => void;
  installAgentTool: (payload: InstallToolPayload) => Promise<AppState>;
  searchToolSkills: (toolId: string, query: string) => Promise<AgentSkillSearchResult>;
  installToolSkill: (
    payload: InstallAgentSkillPayload,
    onOutput?: (event: Omit<AgentSkillInstallOutputEvent, "toolId">) => void
  ) => Promise<AppState>;
  removeToolSkill: (payload: RemoveAgentSkillPayload) => Promise<AppState>;
  saveToolConfig: (payload: SaveToolConfigPayload) => Promise<AppState>;
  getToolUsage: (toolId: string) => Promise<ToolUsageInfo | null>;
  switchToolAccount: (toolId: string) => Promise<void>;
}

export interface ForgeService {
  getForgeOverview: (
    projectId: string,
    options: ForgeRequestOptions
  ) => Promise<ForgeOverview>;
  getForgeBranchPullRequestStatus: (
    projectId: string,
    branch: string,
    options: ForgeRequestOptions
  ) => Promise<ForgeBranchPullRequestStatus | null>;
  getForgeWorkItemDetail: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  getForgeWorkflowRunDetail: (
    projectId: string,
    runId: number,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkflowRunDetail>;
  addForgeWorkItemComment: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  createForgePullRequest: (
    projectId: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  performForgeWorkItemAction: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
}

export interface DeploymentService {
  listVercelProjects: (token: string) => Promise<VercelProjectSummary[]>;
  listVercelDeployments: (
    token: string,
    vercelProjectId: string,
    teamId?: string | null
  ) => Promise<VercelDeploymentSummary[]>;
  redeployVercelDeployment: (
    token: string,
    payload: VercelRedeployPayload
  ) => Promise<VercelDeploymentSummary>;
  startVercelRuntimeLogStream: (
    request: VercelRuntimeLogStreamRequest,
    listener: {
      onConnected: () => void;
      onEntry: (entry: VercelRuntimeLogEntry) => void;
      onError: (message: string) => void;
      onEnded: () => void;
    }
  ) => Promise<void>;
  stopVercelRuntimeLogStream: () => void;
}

export interface MainServices {
  snapshot: SnapshotService;
  workspace: WorkspaceService;
  session: SessionService;
  tooling: ToolingService;
  forge: ForgeService;
  deployment: DeploymentService;
}
