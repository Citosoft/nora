import type { AppDomainState, AppState } from "@shared/appTypes";

/** Inverse of {@link hydrateAppDomainState}: rebuilds `AppState` from a domain projection. */
export function appStateFromAppDomainState(domain: AppDomainState): AppState {
  return {
    screen: domain.navigation.screen,
    project: domain.workspace.project,
    projectBranches: domain.workspace.projectBranches,
    currentSessionId: domain.session.currentSessionId,
    sessions: domain.workspace.sessions,
    worktrees: domain.workspace.worktrees,
    workspaces: domain.workspace.workspaces,
    recentProjects: domain.workspace.recentProjects,
    focusedAgentId: domain.focus.focusedAgentId,
    focusedTerminalId: domain.focus.focusedTerminalId,
    selectedChangePath: domain.git.selectedChangePath,
    selectedCommitHash: domain.git.selectedCommitHash,
    selectedCommit: domain.git.selectedCommit,
    changesRoot: domain.git.changesRoot,
    changes: domain.git.changes,
    commitHistory: domain.git.commitHistory,
    activeRemoteMounts: domain.remotes.activeRemoteMounts,
    projectScripts: domain.scripts.projectScripts,
    defaultWorktreePrepareCommand: domain.scripts.defaultWorktreePrepareCommand,
    agents: domain.agents.list,
    terminals: domain.terminals.list,
    terminalShells: domain.tooling.terminalShells,
    agentCatalog: domain.tooling.agentCatalog,
    agentSkillCatalogs: domain.tooling.agentSkillCatalogs,
    errorMessage: domain.error.message
  };
}
