import type { AppState, AppStateDelta } from "@shared/appTypes";

export function compactStateForRenderer(snapshot: AppState): AppState {
  return {
    ...snapshot,
    agents: snapshot.agents.map((agent) => ({
      ...agent,
      rawTerminalOutput: ""
    })),
    terminals: snapshot.terminals.map((terminal) => ({
      ...terminal,
      rawTerminalOutput: ""
    })),
    workspaces: snapshot.workspaces.map((workspace) => ({
      ...workspace,
      agents: workspace.agents.map((agent) => ({
        ...agent,
        rawTerminalOutput: ""
      })),
      terminals: workspace.terminals.map((terminal) => ({
        ...terminal,
        rawTerminalOutput: ""
      }))
    }))
  };
}

export function hasStableAppStateTopology(previous: AppState, next: AppState): boolean {
  return (
    previous.screen === next.screen &&
    previous.project === next.project &&
    previous.currentSessionId === next.currentSessionId &&
    previous.projectBranches === next.projectBranches &&
    previous.sessions === next.sessions &&
    previous.worktrees === next.worktrees &&
    previous.recentProjects === next.recentProjects &&
    previous.changesRoot === next.changesRoot &&
    previous.changes === next.changes &&
    previous.commitHistory === next.commitHistory &&
    previous.activeRemoteMounts === next.activeRemoteMounts &&
    previous.projectScripts === next.projectScripts &&
    previous.defaultWorktreePrepareCommand === next.defaultWorktreePrepareCommand &&
    previous.agentCatalog === next.agentCatalog &&
    previous.agentSkillCatalogs === next.agentSkillCatalogs &&
    previous.workspaces.length === next.workspaces.length &&
    previous.workspaces.every((workspace, index) => workspace.project.id === next.workspaces[index]?.project.id) &&
    previous.agents.length === next.agents.length &&
    previous.agents.every((agent, index) => agent.id === next.agents[index]?.id) &&
    previous.terminals.length === next.terminals.length &&
    previous.terminals.every((terminal, index) => terminal.id === next.terminals[index]?.id)
  );
}

export function buildStateDelta(previous: AppState | null, next: AppState): AppStateDelta | null {
  if (!previous) {
    return null;
  }

  if (!hasStableAppStateTopology(previous, next)) {
    return null;
  }

  const changedAgents = next.agents
    .filter((agent, index) => previous.agents[index] !== agent)
    .map((agent) => ({
      ...agent,
      rawTerminalOutput: ""
    }));
  const changedTerminals = next.terminals
    .filter((terminal, index) => previous.terminals[index] !== terminal)
    .map((terminal) => ({
      ...terminal,
      rawTerminalOutput: ""
    }));

  if (!changedAgents.length && !changedTerminals.length && previous.errorMessage === next.errorMessage) {
    return null;
  }

  return {
    changedAgents,
    changedTerminals,
    focusedAgentId: next.focusedAgentId,
    focusedTerminalId: next.focusedTerminalId,
    errorMessage: next.errorMessage
  };
}
