import type {
  AgentCatalogEntry,
  AgentDetectionInfo,
  AgentSession,
  AgentSkillCatalog,
  AgentToolConfig,
  AppState,
  ProjectSummary,
  TerminalSession,
  TerminalShellOption,
  WorkspaceScriptLauncher,
  WorktreeRecord
} from "@shared/appTypes";
import type { PersistedSessionState, WorkspaceTarget } from "./internal.types";

export interface OpenProjectOptions {
  focusedAgentMode: "first-agent" | "none";
}

export interface ProjectOpenHelperDeps {
  nowIso: () => string;
  sameWorkspaceLocation: (left?: ProjectSummary["location"], right?: ProjectSummary["location"]) => boolean;
  getGitProgressCommand: (target: WorkspaceTarget, args: string[]) => Promise<string>;
  getProjectMetadata: (
    target: WorkspaceTarget,
    onProgress?: (detail: string, command: string | null) => void
  ) => Promise<ProjectSummary>;
  mergePersistedProjectSummary: (baseProject: ProjectSummary, persistedProject?: ProjectSummary | null) => ProjectSummary;
  readActiveRemoteMounts: () => Promise<AppState["activeRemoteMounts"]>;
  detectRemoteAgentCatalog: (target: WorkspaceTarget) => Promise<AgentDetectionInfo[]>;
  detectWorkspaceScripts: (target: WorkspaceTarget) => Promise<WorkspaceScriptLauncher[]>;
  detectDefaultWorktreePrepareCommand: (target: WorkspaceTarget) => Promise<string | null>;
  readProjectBranches: (target: WorkspaceTarget) => Promise<string[]>;
  detectLocalAgentCatalog: () => Promise<AgentDetectionInfo[]>;
  buildAgentCatalog: (
    detections: AgentDetectionInfo[],
    existingCatalog: AgentCatalogEntry[],
    toolConfigs: Record<string, AgentToolConfig>
  ) => AgentCatalogEntry[];
  readAgentSkillCatalogs: (toolIds: string[]) => Promise<AgentSkillCatalog[]>;
  sharedAgentSkillsToolId: string;
  getSnapshot: () => AppState;
  loadIndexedProjects: () => Promise<ProjectSummary[]>;
  persistWorkspaceState: (state: AppState) => Promise<void>;
  stopAllAgents: () => Promise<void>;
  recordRecentProject: (project: { name: string; rootPath: string; baseBranch: string }) => Promise<AppState["recentProjects"]>;
  saveProject: (project: ProjectSummary) => Promise<void>;
  loadStatesForProject: (projectId: string) => Promise<PersistedSessionState[]>;
  createInitialSessionState: (project: ProjectSummary) => Promise<PersistedSessionState>;
  getRestorableAgents: (agents: AgentSession[]) => Promise<AgentSession[]>;
  getRestorableTerminals: (terminals: TerminalSession[]) => Promise<TerminalSession[]>;
  getLiveTerminalSnapshots: () => TerminalSession[];
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  updateState: (updater: (state: AppState) => AppState) => void;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  buildResumeCommand: (agent: Pick<AgentSession, "toolId" | "command" | "resumeSessionId" | "resumeCommand">) => string | null;
  normalizeAgentLaunchCommand: (toolId: string, command: string) => string;
  resetAgentTranscript: (agent: AgentSession) => Promise<void>;
  getWorktreeTarget: (project: ProjectSummary, worktree: Pick<WorktreeRecord, "path" | "location">) => WorkspaceTarget;
  getToolEnv: (toolId: string) => Record<string, string>;
  spawnAgentPty: (
    agentId: string,
    command: string,
    target: WorkspaceTarget,
    toolEnv: Record<string, string>
  ) => Promise<void>;
  hasRuntimeSession: (sessionId: string) => boolean;
  resetTerminalTranscript: (terminal: TerminalSession) => Promise<void>;
  resolveTerminalShell: (shellId?: string) => TerminalShellOption;
  spawnTerminalPty: (
    terminalId: string,
    command: string,
    target: WorkspaceTarget,
    shell: TerminalShellOption
  ) => Promise<void>;
  refreshProjectState: () => Promise<AppState>;
  reportWorkspaceLoadingProgress: (
    projectId: string,
    detail: string,
    command: string | null
  ) => void;
  unsuppressWorkspace: (projectRoot: string, projectId?: string | null) => void;
  toolConfigs: Record<string, AgentToolConfig>;
}

export interface ProjectOpenHelpers {
  openProject: (projectTarget: WorkspaceTarget, options: OpenProjectOptions) => Promise<AppState>;
}
