import type { ActiveRemoteMount } from "./remote.types";
import type {
  AgentCatalogEntry,
  AgentSession,
  AgentSkillCatalog,
  ChangeEntry,
  CommitHistoryEntry,
  RecentProject,
  SessionRecord,
  TerminalSession,
  WorkspaceScriptLauncher,
  WorkspaceSummary,
  WorktreeRecord
} from "./session.types";
import type { Screen, TerminalShellOption } from "./system.types";
import type { ProjectSummary } from "./workspace.types";

/** Workspace / project / session tree (everything except git, tooling, and root agent lists). */
export type WorkspaceDomainModel = {
  project: ProjectSummary | null;
  projectBranches: string[];
  sessions: SessionRecord[];
  worktrees: WorktreeRecord[];
  workspaces: WorkspaceSummary[];
  recentProjects: RecentProject[];
};

export type GitDomainModel = {
  changesRoot: string | null;
  changes: ChangeEntry[];
  selectedChangePath: string | null;
  commitHistory: CommitHistoryEntry[];
  selectedCommitHash: string | null;
  selectedCommit: CommitHistoryEntry | null;
};

export type ToolingDomainModel = {
  agentCatalog: AgentCatalogEntry[];
  agentSkillCatalogs: AgentSkillCatalog[];
  terminalShells: TerminalShellOption[];
};

export type ScriptsDomainModel = {
  projectScripts: WorkspaceScriptLauncher[];
  defaultWorktreePrepareCommand: string | null;
};

/**
 * Renderer-facing projection of {@link import("./session.types").AppState} by domain.
 * Source of truth remains the latest snapshot until incremental event application is trusted everywhere.
 */
export type AppDomainState = {
  navigation: { screen: Screen; projectId: string | null };
  session: { currentSessionId: string | null };
  focus: { focusedAgentId: string | null; focusedTerminalId: string | null };
  workspace: WorkspaceDomainModel;
  git: GitDomainModel;
  tooling: ToolingDomainModel;
  remotes: { activeRemoteMounts: ActiveRemoteMount[] };
  scripts: ScriptsDomainModel;
  agents: { list: AgentSession[] };
  terminals: { list: TerminalSession[] };
  error: { message: string | null };
};
