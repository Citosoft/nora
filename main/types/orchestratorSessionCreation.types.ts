import type {
  AgentCatalogEntry,
  AgentSession,
  AppState,
  CreateAgentPayload,
  CreateTerminalPayload,
  ProjectSummary,
  SessionRecord,
  TerminalSession,
  TerminalShellOption,
  WorkspaceSummary,
  WorktreeRecord
} from "@shared/appTypes";
import type { WorkspaceTarget } from "../types/internal.types";

export interface SessionCreationDeps {
  nowIso: () => string;
  futureIso: (milliseconds: number) => string;
  randomId: () => string;
  getSnapshot: () => AppState;
  resolveAgentLaunchCommand: (tool: AgentCatalogEntry, payload: CreateAgentPayload) => string;
  getToolEnv: (toolId: string) => Record<string, string>;
  getWorktreeArtifactPaths: (
    projectId: string,
    sessionId: string,
    worktreeId: string,
    agentId?: string
  ) => { contextFilePath: string; terminalStreamPath: string };
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
  resolveTerminalShell: (shellId?: string) => TerminalShellOption;
  initializeAgentContextFiles: (agent: AgentSession) => Promise<void>;
  attachAgentToWorktree: (agent: AgentSession, worktree: WorktreeRecord) => Promise<void>;
  attachTerminalToWorktree: (terminal: TerminalSession, worktree: WorktreeRecord) => Promise<void>;
  upsertSession: (sessions: SessionRecord[], session: SessionRecord) => SessionRecord[];
  upsertWorktree: (worktrees: WorktreeRecord[], worktree: WorktreeRecord) => WorktreeRecord[];
  upsertWorkspaceSummary: (workspaces: WorkspaceSummary[], workspace: WorkspaceSummary) => WorkspaceSummary[];
  updateState: (updater: (state: AppState) => AppState) => void;
  setTerminalBuffer: (sessionId: string, value: string) => void;
  setLiveTerminalSnapshot: (sessionId: string, terminal: TerminalSession) => void;
  persistWorkspaceState: (state: AppState) => Promise<void>;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  refreshProjectState: () => Promise<AppState>;
  getWorktreeTarget: (
    project: ProjectSummary,
    worktree: Pick<WorktreeRecord, "path" | "location">
  ) => WorkspaceTarget;
  checkoutBranchForLaunch: (
    target: WorkspaceTarget,
    branchCheckout: NonNullable<CreateAgentPayload["branchCheckout"]>
  ) => Promise<string>;
  appendAgentSystemMessage: (agentId: string, message: string) => void;
  getBranchCheckoutFailureTranscript: (
    branchCheckout: NonNullable<CreateAgentPayload["branchCheckout"]>,
    error: unknown
  ) => string;
  prepareWorktree: (target: WorkspaceTarget, command: string) => Promise<void>;
  getPreparationFailureTranscript: (command: string, error: unknown) => string;
  spawnAgentPty: (
    agentId: string,
    command: string,
    target: WorkspaceTarget,
    toolEnv: Record<string, string>
  ) => Promise<void>;
  spawnTerminalPty: (
    terminalId: string,
    command: string,
    target: WorkspaceTarget,
    shell: TerminalShellOption
  ) => Promise<void>;
}

export interface SessionCreationHelpers {
  createAgent: (payload: CreateAgentPayload) => Promise<AppState>;
  createTerminal: (payload: CreateTerminalPayload) => Promise<AppState>;
}
