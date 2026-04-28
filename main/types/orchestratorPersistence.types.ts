import type {
  AgentSession,
  AppState,
  ProjectSummary,
  RecentProject,
  TerminalSession,
  TerminalShellOption,
} from "@shared/appTypes";
import type { PersistedSessionState } from "./internal.types";

export interface PersistenceHelperDeps {
  nowIso: () => string;
  saveProject: (project: ProjectSummary) => Promise<void>;
  saveSessionState: (state: PersistedSessionState) => Promise<void>;
  loadRecentProjects: () => Promise<RecentProject[]>;
  loadIndexedProjects: () => Promise<ProjectSummary[]>;
  resolveProjectTarget: (projectRoot: string) => Promise<{ path: string; location?: ProjectSummary["location"] }>;
  getProjectMetadata: (target: { path: string; location?: ProjectSummary["location"] }) => Promise<ProjectSummary>;
  mergePersistedProjectSummary: (baseProject: ProjectSummary, persistedProject?: ProjectSummary | null) => ProjectSummary;
  focusWorkspace: (projectId: string) => Promise<AppState>;
  resolveTerminalShell: (shellId?: string) => TerminalShellOption;
  getWorktreeArtifactPaths: (
    projectId: string,
    sessionId: string,
    worktreeId: string,
    agentId?: string
  ) => { contextFilePath: string; terminalStreamPath: string };
  setTerminalBuffer: (sessionId: string, value: string) => void;
}

export interface PersistenceHelpers {
  persistWorkspaceState: (state: AppState) => Promise<void>;
  restoreWorkspaceState: () => Promise<void>;
  getRestorableAgents: (agents: AgentSession[]) => Promise<AgentSession[]>;
  getRestorableTerminals: (terminals: TerminalSession[]) => Promise<TerminalSession[]>;
  getPersistedSessionPayload: (state: AppState, sessionId: string) => PersistedSessionState;
}
