import type { AppState, CommitChangesPayload } from "@shared/appTypes";
import type { WorkspaceTarget } from "../types/internal.types";

type SessionActionsDependencies = {
  getSnapshot: () => AppState;
  refreshProjectState: () => Promise<AppState>;
  commitWorkspaceChanges: (target: WorkspaceTarget, message: string, paths: string[] | null) => Promise<void>;
  pullWorkspaceChanges: (target: WorkspaceTarget) => Promise<void>;
  pushWorkspaceChanges: (target: WorkspaceTarget) => Promise<void>;
  appendAgentSystemMessage: (agentId: string, message: string) => void;
  stopAllAgents: () => Promise<void>;
  killAgentSession: (agentId: string) => void;
  setAgentStopped: (agentId: string) => void;
  hasAgentSession: (agentId: string) => boolean;
  writeAgentSessionInput: (agentId: string, input: string) => void;
  delay: (ms: number) => Promise<void>;
};

export function getActiveChangesRoot(state: AppState): string {
  const focusedAgent = state.agents.find((agent) => agent.id === state.focusedAgentId);
  if (focusedAgent?.workspace) {
    return state.worktrees.find((worktree) => worktree.id === focusedAgent.worktreeId)?.path || focusedAgent.workspace;
  }

  const focusedTerminal = state.terminals.find((terminal) => terminal.id === state.focusedTerminalId);
  if (focusedTerminal?.workspace) {
    return state.worktrees.find((worktree) => worktree.id === focusedTerminal.worktreeId)?.path ||
      state.project?.rootPath ||
      focusedTerminal.workspace;
  }

  const currentSession = state.sessions.find((session) => session.id === state.currentSessionId);
  const focusedWorktree = state.worktrees.find((worktree) => worktree.id === currentSession?.focusedWorktreeId);
  return focusedWorktree?.path || state.project?.rootPath || process.cwd();
}

export async function commitChangesWithValidation(
  deps: SessionActionsDependencies,
  payload: CommitChangesPayload
): Promise<AppState> {
  const state = deps.getSnapshot();
  if (!state.project) {
    throw new Error("Choose a project before committing changes.");
  }

  const message = payload.message.trim();
  if (!message) {
    throw new Error("Enter a commit message.");
  }

  const selectedPathsRaw = Array.isArray(payload.paths)
    ? payload.paths.map((pathName) => pathName.trim()).filter((pathName, index, all) => !!pathName && all.indexOf(pathName) === index)
    : null;
  if (Array.isArray(payload.paths) && (selectedPathsRaw?.length ?? 0) === 0) {
    throw new Error("Select at least one file to commit.");
  }
  const selectedPaths = selectedPathsRaw;

  const availablePaths = new Set(state.changes.map((change) => change.path));
  if (selectedPaths && selectedPaths.some((pathName) => !availablePaths.has(pathName))) {
    throw new Error("Some selected files are no longer available in the working tree.");
  }

  const changesRoot = getActiveChangesRoot(state);
  await deps.commitWorkspaceChanges({ path: changesRoot, location: state.project.location }, message, selectedPaths);
  return deps.refreshProjectState();
}

export async function pushChangesWithValidation(deps: SessionActionsDependencies): Promise<AppState> {
  const state = deps.getSnapshot();
  if (!state.project) {
    throw new Error("Choose a project before pushing changes.");
  }

  const changesRoot = getActiveChangesRoot(state);
  await deps.pushWorkspaceChanges({ path: changesRoot, location: state.project.location });
  return deps.refreshProjectState();
}

export async function pullChangesWithValidation(deps: SessionActionsDependencies): Promise<AppState> {
  const state = deps.getSnapshot();
  if (!state.project) {
    throw new Error("Choose a project before pulling changes.");
  }

  const changesRoot = getActiveChangesRoot(state);
  try {
    await deps.pullWorkspaceChanges({ path: changesRoot, location: state.project.location });
  } catch (error: unknown) {
    await deps.refreshProjectState().catch(() => null);
    throw error;
  }

  return deps.refreshProjectState();
}

export async function stopAllAgents(deps: SessionActionsDependencies): Promise<void> {
  for (const agent of deps.getSnapshot().agents) {
    if (!deps.hasAgentSession(agent.id)) {
      continue;
    }
    deps.killAgentSession(agent.id);
    deps.setAgentStopped(agent.id);
  }
}

export async function stopAllAgentsGracefully(
  deps: SessionActionsDependencies,
  onProgress?: (payload: { detail: string; command: string | null }) => void
): Promise<void> {
  const runningAgents = deps.getSnapshot().agents.filter((agent) => deps.hasAgentSession(agent.id));

  if (!runningAgents.length) {
    onProgress?.({
      detail: "No running agents need shutdown.",
      command: null
    });
    return;
  }

  onProgress?.({
    detail: `Waiting for ${runningAgents.length} agent${runningAgents.length === 1 ? "" : "s"} to shut down safely...`,
    command: "interrupt -> exit"
  });

  for (const agent of runningAgents) {
    if (!deps.hasAgentSession(agent.id)) {
      continue;
    }

    deps.appendAgentSystemMessage(agent.id, "[shutdown requested]");

    try {
      deps.writeAgentSessionInput(agent.id, "\u0003");
      await deps.delay(150);
      deps.writeAgentSessionInput(agent.id, "\u0003");
      await deps.delay(150);
      deps.writeAgentSessionInput(agent.id, "exit\r");
    } catch {
      // Fall back to force-kill below if the PTY no longer accepts input.
    }
  }

  const gracefulDeadline = Date.now() + 4_000;
  while (Date.now() < gracefulDeadline) {
    const runningAgentIds = deps.getSnapshot().agents
      .map((agent) => agent.id)
      .filter((agentId) => deps.hasAgentSession(agentId));
    if (!runningAgentIds.length) {
      onProgress?.({
        detail: "All agents shut down cleanly.",
        command: null
      });
      return;
    }
    onProgress?.({
      detail: `Still waiting for ${runningAgentIds.length} agent${runningAgentIds.length === 1 ? "" : "s"} to stop...`,
      command: "interrupt -> exit"
    });
    await deps.delay(150);
  }

  onProgress?.({
    detail: "Graceful shutdown timed out. Force stopping remaining agents...",
    command: "kill"
  });
  await deps.stopAllAgents();
}
