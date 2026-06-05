import type {
  AgentSession,
  AppState,
  ProjectSummary,
  TerminalSession,
  TerminalShellOption,
  WorktreeRecord
} from "@shared/appTypes";
import type { RuntimeSession, WorkspaceTarget } from "./internal.types";

export interface SessionLifecycleHelperDeps {
  nowIso: () => string;
  normalizeAgentLaunchCommand: (toolId: string, command: string) => string;
  buildResumeCommand: (agent: Pick<AgentSession, "toolId" | "command" | "resumeSessionId" | "resumeCommand">) => string | null;
  getSnapshot: () => AppState;
  setState: (partial: Partial<AppState>) => void;
  updateState: (updater: (state: AppState) => AppState) => void;
  refreshProjectState: () => Promise<AppState>;
  getRuntimeSession: (sessionId: string) => RuntimeSession | undefined;
  deleteRuntimeSession: (sessionId: string) => void;
  deleteLiveTerminalSnapshot: (terminalId: string) => void;
  getToolEnv: (toolId: string) => Record<string, string>;
  resolveTerminalShell: (shellId?: string) => TerminalShellOption;
  resetAgentTranscript: (agent: AgentSession) => Promise<void>;
  resetTerminalTranscript: (terminal: TerminalSession) => Promise<void>;
  appendAgentOutput: (agentId: string, chunk: string) => void;
  appendTerminalOutput: (terminalId: string, chunk: string) => void;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  updateTerminal: (terminalId: string, partial: Partial<TerminalSession>) => void;
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
  detachAgentFromWorktree: (agent: AgentSession) => Promise<WorktreeRecord | null>;
  detachTerminalFromWorktree: (terminal: TerminalSession) => Promise<WorktreeRecord | null>;
  upsertWorktree: (worktrees: WorktreeRecord[], worktree: WorktreeRecord) => WorktreeRecord[];
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  execGit: (target: WorkspaceTarget, args: string[], maxBuffer?: number) => Promise<{ stdout: string; stderr: string }>;
  getWorktreeDir: (projectId: string, sessionId: string, worktreeId: string) => string;
  setTerminalBuffer: (sessionId: string, value: string) => void;
  deleteTerminalBuffer: (sessionId: string) => void;
  deleteTerminalActivity: (sessionId: string) => void;
  deleteContextWriteChain: (agentId: string) => void;
}

export interface SessionLifecycleHelpers {
  focusAgent: (agentId: string) => Promise<AppState>;
  focusTerminal: (terminalId: string) => Promise<AppState>;
  focusWorktree: (worktreeId: string) => Promise<AppState>;
  restartAgent: (agentId: string) => Promise<AppState>;
  restartTerminal: (terminalId: string) => Promise<AppState>;
  destroyAgent: (agentId: string) => Promise<AppState>;
  destroyTerminal: (terminalId: string) => Promise<AppState>;
  removeWorktree: (worktreeId: string) => Promise<AppState>;
  refreshWorktreeCollectionAfterDetach: (
    project: ProjectSummary,
    worktrees: WorktreeRecord[],
    remainingAgents: AgentSession[],
    removedAgent: AgentSession
  ) => Promise<WorktreeRecord[]>;
  refreshWorktreeCollectionAfterTerminalDetach: (
    project: ProjectSummary,
    worktrees: WorktreeRecord[],
    remainingAgents: AgentSession[],
    remainingTerminals: TerminalSession[],
    removedTerminal: TerminalSession
  ) => Promise<WorktreeRecord[]>;
}
