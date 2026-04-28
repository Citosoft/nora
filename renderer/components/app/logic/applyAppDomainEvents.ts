import type { AgentSession, AppDomainEvent, AppDomainState, TerminalSession } from "@shared/appTypes";

function applyAgentPatch(state: AppDomainState, changed: AgentSession[]): AppDomainState {
  const byId = new Map(changed.map((agent) => [agent.id, agent]));
  const list = state.agents.list.map((agent) => byId.get(agent.id) ?? agent);
  const workspaces = state.workspace.workspaces.map((workspace) => ({
    ...workspace,
    agents: workspace.agents.map((agent) => byId.get(agent.id) ?? agent)
  }));
  return {
    ...state,
    agents: { list },
    workspace: { ...state.workspace, workspaces }
  };
}

function applyTerminalPatch(state: AppDomainState, changed: TerminalSession[]): AppDomainState {
  const byId = new Map(changed.map((terminal) => [terminal.id, terminal]));
  const list = state.terminals.list.map((terminal) => byId.get(terminal.id) ?? terminal);
  const workspaces = state.workspace.workspaces.map((workspace) => ({
    ...workspace,
    terminals: workspace.terminals.map((terminal) => byId.get(terminal.id) ?? terminal)
  }));
  return {
    ...state,
    terminals: { list },
    workspace: { ...state.workspace, workspaces }
  };
}

function applyAgentModel(state: AppDomainState, agents: AgentSession[]): AppDomainState {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const workspaces = state.workspace.workspaces.map((workspace) => ({
    ...workspace,
    agents: workspace.agents.map((agent) => byId.get(agent.id) ?? agent)
  }));
  return {
    ...state,
    agents: { list: agents },
    workspace: { ...state.workspace, workspaces }
  };
}

function applyTerminalModel(state: AppDomainState, terminals: TerminalSession[]): AppDomainState {
  const byId = new Map(terminals.map((terminal) => [terminal.id, terminal]));
  const workspaces = state.workspace.workspaces.map((workspace) => ({
    ...workspace,
    terminals: workspace.terminals.map((terminal) => byId.get(terminal.id) ?? terminal)
  }));
  return {
    ...state,
    terminals: { list: terminals },
    workspace: { ...state.workspace, workspaces }
  };
}

function applySingleAppDomainEvent(state: AppDomainState, event: AppDomainEvent): AppDomainState {
  switch (event.kind) {
    case "app.navigation":
      return { ...state, navigation: { screen: event.screen, projectId: event.projectId } };
    case "app.session.current":
      return { ...state, session: { currentSessionId: event.sessionId } };
    case "app.focus":
      return {
        ...state,
        focus: {
          focusedAgentId: event.focusedAgentId,
          focusedTerminalId: event.focusedTerminalId
        }
      };
    case "app.error":
      return { ...state, error: { message: event.message } };
    case "workspace.topology":
      return state;
    case "workspace.model":
      return { ...state, workspace: event.model };
    case "git.model":
      return { ...state, git: event.model };
    case "tooling.model":
      return { ...state, tooling: event.model };
    case "remotes.model":
      return { ...state, remotes: { activeRemoteMounts: event.mounts } };
    case "scripts.model":
      return { ...state, scripts: event.model };
    case "agent.patch":
      return applyAgentPatch(state, event.agents);
    case "terminal.patch":
      return applyTerminalPatch(state, event.terminals);
    case "agent.model":
      return applyAgentModel(state, event.agents);
    case "terminal.model":
      return applyTerminalModel(state, event.terminals);
    default: {
      const _exhaustive: never = event;
      throw new Error(`Unhandled domain event: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function applyAppDomainEvents(state: AppDomainState, events: AppDomainEvent[]): AppDomainState {
  return events.reduce((next, event) => applySingleAppDomainEvent(next, event), state);
}
