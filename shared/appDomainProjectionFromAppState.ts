import type {
  GitDomainModel,
  ScriptsDomainModel,
  ToolingDomainModel,
  WorkspaceDomainModel
} from "./types/appDomainState.types";
import type { AgentSession, AppState, TerminalSession, WorkspaceSummary } from "./types/session.types";

export function stripTerminalOutputFromAgent(agent: AgentSession): AgentSession {
  return { ...agent, rawTerminalOutput: "" };
}

export function stripTerminalOutputFromTerminal(terminal: TerminalSession): TerminalSession {
  return { ...terminal, rawTerminalOutput: "" };
}

export function compactAgentsTerminalsInWorkspaces(workspaces: WorkspaceSummary[]): WorkspaceSummary[] {
  return workspaces.map((workspace) => ({
    ...workspace,
    agents: workspace.agents.map(stripTerminalOutputFromAgent),
    terminals: workspace.terminals.map(stripTerminalOutputFromTerminal)
  }));
}

export function buildWorkspaceDomainModelFromAppState(snapshot: AppState): WorkspaceDomainModel {
  return {
    project: snapshot.project,
    projectBranches: snapshot.projectBranches,
    sessions: snapshot.sessions,
    worktrees: snapshot.worktrees,
    workspaces: snapshot.workspaces,
    recentProjects: snapshot.recentProjects
  };
}

/** Align nested session agents/terminals with root lists by id (main snapshot may share refs or drift). */
export function reconcileWorkspaceNestedAgentsTerminals(
  model: WorkspaceDomainModel,
  rootAgents: AgentSession[],
  rootTerminals: TerminalSession[]
): WorkspaceDomainModel {
  const agentsById = new Map(rootAgents.map((agent) => [agent.id, agent]));
  const terminalsById = new Map(rootTerminals.map((terminal) => [terminal.id, terminal]));
  return {
    ...model,
    workspaces: model.workspaces.map((workspace) => ({
      ...workspace,
      agents: workspace.agents.map((agent) => agentsById.get(agent.id) ?? agent),
      terminals: workspace.terminals.map((terminal) => terminalsById.get(terminal.id) ?? terminal)
    }))
  };
}

/** Same as {@link buildWorkspaceDomainModelFromAppState} but strips heavy terminal streams and reconciles nested lists with roots. */
export function buildWorkspaceDomainModelFromAppStateForRenderer(snapshot: AppState): WorkspaceDomainModel {
  const rootAgents = compactRootAgentsForDomainEvent(snapshot.agents);
  const rootTerminals = compactRootTerminalsForDomainEvent(snapshot.terminals);
  const base = buildWorkspaceDomainModelFromAppState(snapshot);
  const compactedWorkspaces = compactAgentsTerminalsInWorkspaces(base.workspaces);
  return reconcileWorkspaceNestedAgentsTerminals(
    { ...base, workspaces: compactedWorkspaces },
    rootAgents,
    rootTerminals
  );
}

export function buildGitDomainModelFromAppState(snapshot: AppState): GitDomainModel {
  return {
    changesRoot: snapshot.changesRoot,
    changes: snapshot.changes,
    selectedChangePath: snapshot.selectedChangePath,
    commitHistory: snapshot.commitHistory,
    selectedCommitHash: snapshot.selectedCommitHash,
    selectedCommit: snapshot.selectedCommit
  };
}

export function buildToolingDomainModelFromAppState(snapshot: AppState): ToolingDomainModel {
  return {
    agentCatalog: snapshot.agentCatalog,
    agentSkillCatalogs: snapshot.agentSkillCatalogs,
    terminalShells: snapshot.terminalShells
  };
}

export function buildScriptsDomainModelFromAppState(snapshot: AppState): ScriptsDomainModel {
  return {
    projectScripts: snapshot.projectScripts,
    defaultWorktreePrepareCommand: snapshot.defaultWorktreePrepareCommand
  };
}

export function compactRootAgentsForDomainEvent(agents: AgentSession[]): AgentSession[] {
  return agents.map(stripTerminalOutputFromAgent);
}

export function compactRootTerminalsForDomainEvent(terminals: TerminalSession[]): TerminalSession[] {
  return terminals.map(stripTerminalOutputFromTerminal);
}
