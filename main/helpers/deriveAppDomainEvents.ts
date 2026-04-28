import type { AppDomainEvent, AppState } from "@shared/appTypes";
import {
  buildGitDomainModelFromAppState,
  buildScriptsDomainModelFromAppState,
  buildToolingDomainModelFromAppState,
  buildWorkspaceDomainModelFromAppStateForRenderer,
  compactRootAgentsForDomainEvent,
  compactRootTerminalsForDomainEvent
} from "@shared/appDomainProjectionFromAppState";

import { hasStableAppStateTopology } from "./stateSnapshot";

function workspaceDomainModelRefsChanged(previous: AppState, next: AppState): boolean {
  return (
    previous.project !== next.project ||
    previous.projectBranches !== next.projectBranches ||
    previous.sessions !== next.sessions ||
    previous.worktrees !== next.worktrees ||
    previous.workspaces !== next.workspaces ||
    previous.recentProjects !== next.recentProjects
  );
}

function gitDomainModelRefsChanged(previous: AppState, next: AppState): boolean {
  return (
    previous.changesRoot !== next.changesRoot ||
    previous.changes !== next.changes ||
    previous.selectedChangePath !== next.selectedChangePath ||
    previous.commitHistory !== next.commitHistory ||
    previous.selectedCommitHash !== next.selectedCommitHash ||
    previous.selectedCommit !== next.selectedCommit
  );
}

function toolingDomainModelRefsChanged(previous: AppState, next: AppState): boolean {
  return (
    previous.agentCatalog !== next.agentCatalog ||
    previous.agentSkillCatalogs !== next.agentSkillCatalogs ||
    previous.terminalShells !== next.terminalShells
  );
}

function scriptsDomainModelRefsChanged(previous: AppState, next: AppState): boolean {
  return (
    previous.projectScripts !== next.projectScripts ||
    previous.defaultWorktreePrepareCommand !== next.defaultWorktreePrepareCommand
  );
}

export function deriveAppDomainEvents(previous: AppState | null, next: AppState): AppDomainEvent[] {
  if (!previous) {
    return [];
  }

  const events: AppDomainEvent[] = [];

  if (previous.screen !== next.screen || previous.project?.id !== next.project?.id) {
    events.push({
      kind: "app.navigation",
      screen: next.screen,
      projectId: next.project?.id ?? null
    });
  }

  if (previous.currentSessionId !== next.currentSessionId) {
    events.push({ kind: "app.session.current", sessionId: next.currentSessionId });
  }

  if (previous.focusedAgentId !== next.focusedAgentId || previous.focusedTerminalId !== next.focusedTerminalId) {
    events.push({
      kind: "app.focus",
      focusedAgentId: next.focusedAgentId,
      focusedTerminalId: next.focusedTerminalId
    });
  }

  if (previous.errorMessage !== next.errorMessage) {
    events.push({ kind: "app.error", message: next.errorMessage });
  }

  if (!hasStableAppStateTopology(previous, next)) {
    events.push({ kind: "workspace.topology", reason: "structureChanged" });
    events.push({ kind: "workspace.model", model: buildWorkspaceDomainModelFromAppStateForRenderer(next) });
    events.push({ kind: "git.model", model: buildGitDomainModelFromAppState(next) });
    events.push({ kind: "tooling.model", model: buildToolingDomainModelFromAppState(next) });
    events.push({ kind: "remotes.model", mounts: next.activeRemoteMounts });
    events.push({ kind: "scripts.model", model: buildScriptsDomainModelFromAppState(next) });
    events.push({ kind: "agent.model", agents: compactRootAgentsForDomainEvent(next.agents) });
    events.push({ kind: "terminal.model", terminals: compactRootTerminalsForDomainEvent(next.terminals) });
    return events;
  }

  if (workspaceDomainModelRefsChanged(previous, next)) {
    events.push({ kind: "workspace.model", model: buildWorkspaceDomainModelFromAppStateForRenderer(next) });
  }

  if (gitDomainModelRefsChanged(previous, next)) {
    events.push({ kind: "git.model", model: buildGitDomainModelFromAppState(next) });
  }

  if (toolingDomainModelRefsChanged(previous, next)) {
    events.push({ kind: "tooling.model", model: buildToolingDomainModelFromAppState(next) });
  }

  if (previous.activeRemoteMounts !== next.activeRemoteMounts) {
    events.push({ kind: "remotes.model", mounts: next.activeRemoteMounts });
  }

  if (scriptsDomainModelRefsChanged(previous, next)) {
    events.push({ kind: "scripts.model", model: buildScriptsDomainModelFromAppState(next) });
  }

  const changedAgents = next.agents
    .filter((agent, index) => previous.agents[index] !== agent)
    .map((agent) => ({
      ...agent,
      rawTerminalOutput: ""
    }));
  if (changedAgents.length) {
    events.push({ kind: "agent.patch", agents: changedAgents });
  }

  const changedTerminals = next.terminals
    .filter((terminal, index) => previous.terminals[index] !== terminal)
    .map((terminal) => ({
      ...terminal,
      rawTerminalOutput: ""
    }));
  if (changedTerminals.length) {
    events.push({ kind: "terminal.patch", terminals: changedTerminals });
  }

  return events;
}
