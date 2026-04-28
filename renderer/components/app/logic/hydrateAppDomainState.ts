import {
  buildGitDomainModelFromAppState,
  buildScriptsDomainModelFromAppState,
  buildToolingDomainModelFromAppState,
  buildWorkspaceDomainModelFromAppStateForRenderer,
  compactRootAgentsForDomainEvent,
  compactRootTerminalsForDomainEvent
} from "@shared/appDomainProjectionFromAppState";
import type { AppDomainState, AppState } from "@shared/appTypes";

export function hydrateAppDomainState(snapshot: AppState): AppDomainState {
  return {
    navigation: { screen: snapshot.screen, projectId: snapshot.project?.id ?? null },
    session: { currentSessionId: snapshot.currentSessionId },
    focus: {
      focusedAgentId: snapshot.focusedAgentId,
      focusedTerminalId: snapshot.focusedTerminalId
    },
    workspace: buildWorkspaceDomainModelFromAppStateForRenderer(snapshot),
    git: buildGitDomainModelFromAppState(snapshot),
    tooling: buildToolingDomainModelFromAppState(snapshot),
    remotes: { activeRemoteMounts: snapshot.activeRemoteMounts },
    scripts: buildScriptsDomainModelFromAppState(snapshot),
    agents: { list: compactRootAgentsForDomainEvent(snapshot.agents) },
    terminals: { list: compactRootTerminalsForDomainEvent(snapshot.terminals) },
    error: { message: snapshot.errorMessage }
  };
}

export function getEmptyAppDomainState(): AppDomainState {
  return {
    navigation: { screen: "project-selector", projectId: null },
    session: { currentSessionId: null },
    focus: { focusedAgentId: null, focusedTerminalId: null },
    workspace: {
      project: null,
      projectBranches: [],
      sessions: [],
      worktrees: [],
      workspaces: [],
      recentProjects: []
    },
    git: {
      changesRoot: null,
      changes: [],
      selectedChangePath: null,
      commitHistory: [],
      selectedCommitHash: null,
      selectedCommit: null
    },
    tooling: { agentCatalog: [], agentSkillCatalogs: [], terminalShells: [] },
    remotes: { activeRemoteMounts: [] },
    scripts: { projectScripts: [], defaultWorktreePrepareCommand: null },
    agents: { list: [] },
    terminals: { list: [] },
    error: { message: null }
  };
}
