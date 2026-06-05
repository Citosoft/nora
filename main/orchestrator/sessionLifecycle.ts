import type { AgentSession, AppState, ProjectSummary, TerminalSession, WorktreeRecord } from "@shared/appTypes";
import fs from "node:fs/promises";
import type {
  SessionLifecycleHelperDeps,
  SessionLifecycleHelpers
} from "../types/orchestratorSessionLifecycle.types";

export function createSessionLifecycleHelpers(deps: SessionLifecycleHelperDeps): SessionLifecycleHelpers {
  function getAttachedSessionRoot(
    worktrees: WorktreeRecord[],
    session: Pick<AgentSession | TerminalSession, "worktreeId" | "workspace"> | null
  ): string | null {
    if (!session) {
      return null;
    }
    return worktrees.find((worktree) => worktree.id === session.worktreeId)?.path || session.workspace || null;
  }

  async function focusAgent(agentId: string): Promise<AppState> {
    const snapshot = deps.getSnapshot();
    const agent = snapshot.agents.find((item) => item.id === agentId);
    const nextSessions = agent
      ? snapshot.sessions.map((session) =>
          session.id === agent.sessionId
            ? {
                ...session,
                focusedWorktreeId: agent.worktreeId,
                updatedAt: deps.nowIso(),
                lastUsedAt: deps.nowIso()
              }
            : session
        )
      : snapshot.sessions;
    deps.setState({
      sessions: nextSessions,
      focusedAgentId: agentId,
      focusedTerminalId: null,
      currentSessionId: agent?.sessionId || snapshot.currentSessionId,
      errorMessage: null
    });
    return deps.refreshProjectState();
  }

  async function focusTerminal(terminalId: string): Promise<AppState> {
    const snapshot = deps.getSnapshot();
    const terminal = snapshot.terminals.find((item) => item.id === terminalId);
    const nextSessions = terminal
      ? snapshot.sessions.map((session) =>
          session.id === terminal.sessionId
            ? {
                ...session,
                focusedWorktreeId: terminal.worktreeId,
                updatedAt: deps.nowIso(),
                lastUsedAt: deps.nowIso()
              }
            : session
        )
      : snapshot.sessions;
    deps.setState({
      sessions: nextSessions,
      focusedAgentId: null,
      focusedTerminalId: terminalId,
      currentSessionId: terminal?.sessionId || snapshot.currentSessionId,
      errorMessage: null
    });
    return deps.refreshProjectState();
  }

  async function focusWorktree(worktreeId: string): Promise<AppState> {
    const state = deps.getSnapshot();
    const worktree = state.worktrees.find((item) => item.id === worktreeId);
    if (!worktree) {
      throw new Error("Workspace could not be found.");
    }

    deps.updateState((currentState) => ({
      ...currentState,
      sessions: currentState.sessions.map((session) =>
        session.id === worktree.sessionId
          ? {
              ...session,
              focusedWorktreeId: worktree.id,
              updatedAt: deps.nowIso(),
              lastUsedAt: deps.nowIso()
            }
          : session
      ),
      currentSessionId: worktree.sessionId,
      focusedAgentId: null,
      focusedTerminalId: null,
      changesRoot: worktree.path,
      errorMessage: null
    }));

    return deps.refreshProjectState();
  }

  async function restartAgent(agentId: string): Promise<AppState> {
    const state = deps.getSnapshot();
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) {
      throw new Error("Agent session could not be found.");
    }

    const runningSession = deps.getRuntimeSession(agentId);
    if (runningSession) {
      runningSession.kill();
      deps.deleteRuntimeSession(agentId);
    }

    if (state.project?.location?.kind !== "ssh") {
      try {
        await fs.access(agent.workspace);
      } catch {
        throw new Error("Agent workspace no longer exists on disk.");
      }
    }

    const tool = state.agentCatalog.find((item) => item.id === agent.toolId);
    if (state.project?.location?.kind !== "ssh" && (!tool?.detected || !tool.enabled)) {
      throw new Error(`${agent.toolLabel} is not currently installed or detected.`);
    }

    const launchCommand = deps.normalizeAgentLaunchCommand(agent.toolId, deps.buildResumeCommand(agent) || agent.command);
    const isResuming = launchCommand !== agent.command;

    await deps.resetAgentTranscript(agent);
    deps.appendAgentOutput(agentId, `\n[${isResuming ? "resuming" : "restarting"} agent]\n`);
    deps.updateAgent(agentId, {
      status: "starting",
      pid: null,
      isBusy: false,
      busyUntil: null,
      lastEventAt: deps.nowIso()
    });

    try {
      await deps.spawnAgentPty(agentId, launchCommand, {
        path: agent.workspace,
        location: state.project?.location
      }, deps.getToolEnv(agent.toolId));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      const transcript = `[launch failed] ${detail}`;
      deps.setTerminalBuffer(agentId, transcript);
      deps.updateAgent(agentId, {
        status: "error",
        pid: null,
        lastTerminalLine: "Agent launch failed",
        rawTerminalOutput: transcript,
        isBusy: false,
        busyUntil: null,
        lastEventAt: deps.nowIso()
      });
      deps.setState({
        errorMessage: `Agent launch failed: ${detail}`
      });
      return deps.refreshProjectState();
    }

    return deps.refreshProjectState();
  }

  async function restartTerminal(terminalId: string): Promise<AppState> {
    const state = deps.getSnapshot();
    const terminal = state.terminals.find((item) => item.id === terminalId);
    if (!terminal) {
      throw new Error("Terminal session could not be found.");
    }

    const runningSession = deps.getRuntimeSession(terminalId);
    if (runningSession) {
      runningSession.kill();
      deps.deleteRuntimeSession(terminalId);
    }
    deps.deleteLiveTerminalSnapshot(terminalId);

    if (state.project?.location?.kind !== "ssh") {
      try {
        await fs.access(terminal.workspace);
      } catch {
        throw new Error("Terminal workspace no longer exists on disk.");
      }
    }

    await deps.resetTerminalTranscript(terminal);
    deps.appendTerminalOutput(terminalId, "\r\n[restarting terminal]\r\n");
    deps.updateTerminal(terminalId, {
      status: "starting",
      pid: null,
      lastEventAt: deps.nowIso()
    });

    await deps.spawnTerminalPty(terminalId, terminal.command, {
      path: terminal.workspace,
      location: state.project?.location
    }, deps.resolveTerminalShell(terminal.shellId));
    return deps.refreshProjectState();
  }

  async function destroyAgent(agentId: string): Promise<AppState> {
    const state = deps.getSnapshot();
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) {
      throw new Error("Agent session could not be found.");
    }
    if (!state.project) {
      throw new Error("Choose a project before destroying an agent.");
    }

    const runningSession = deps.getRuntimeSession(agentId);
    if (runningSession) {
      runningSession.kill();
      deps.deleteRuntimeSession(agentId);
    }

    try {
      await deps.detachAgentFromWorktree(agent);
    } catch {
      // keep destroying the agent even if metadata cleanup fails
    }

    deps.deleteTerminalBuffer(agentId);
    deps.deleteTerminalActivity(agentId);
    deps.deleteContextWriteChain(agentId);

    const remainingAgents = state.agents.filter((item) => item.id !== agentId);
    const nextWorktrees = await refreshWorktreeCollectionAfterDetach(
      state.project,
      state.worktrees,
      remainingAgents,
      agent
    );
    const nextFocusedAgentId =
      state.focusedAgentId === agentId
        ? (remainingAgents[0]?.id || null)
        : state.focusedAgentId;
    const nextSessions = state.sessions.map((session) => {
      if (session.id !== agent.sessionId) {
        return session;
      }

      const hasFocusedWorktree = nextWorktrees.some((worktree) => worktree.id === session.focusedWorktreeId);
      const replacementWorktree =
        nextWorktrees.find((worktree) => worktree.sessionId === session.id) || null;

      return {
        ...session,
        focusedWorktreeId: hasFocusedWorktree ? session.focusedWorktreeId : replacementWorktree?.id || null,
        updatedAt: deps.nowIso(),
        lastUsedAt: deps.nowIso()
      };
    });

    deps.updateState((currentState) => ({
      ...currentState,
      sessions: nextSessions,
      agents: currentState.agents.filter((item) => item.id !== agentId),
      worktrees: nextWorktrees,
      focusedAgentId: nextFocusedAgentId,
      changesRoot:
        getAttachedSessionRoot(nextWorktrees, remainingAgents.find((item) => item.id === nextFocusedAgentId) || null) ||
        currentState.project?.rootPath ||
        null,
      errorMessage: null
    }));

    return deps.refreshProjectState();
  }

  async function destroyTerminal(terminalId: string): Promise<AppState> {
    const state = deps.getSnapshot();
    const terminal = state.terminals.find((item) => item.id === terminalId);
    if (!terminal) {
      throw new Error("Terminal session could not be found.");
    }
    if (!state.project) {
      throw new Error("Choose a project before destroying a terminal.");
    }

    const runningSession = deps.getRuntimeSession(terminalId);
    if (runningSession) {
      runningSession.kill();
      deps.deleteRuntimeSession(terminalId);
    }

    deps.deleteTerminalBuffer(terminalId);
    deps.deleteTerminalActivity(terminalId);

    const remainingTerminals = state.terminals.filter((item) => item.id !== terminalId);
    const nextWorktrees = await refreshWorktreeCollectionAfterTerminalDetach(
      state.project,
      state.worktrees,
      state.agents,
      remainingTerminals,
      terminal
    );
    const nextFocusedTerminalId =
      state.focusedTerminalId === terminalId
        ? (remainingTerminals.find((item) => item.sessionId === terminal.sessionId)?.id || null)
        : state.focusedTerminalId;

    deps.updateState((currentState) => ({
      ...currentState,
      terminals: currentState.terminals.filter((item) => item.id !== terminalId),
      worktrees: nextWorktrees,
      focusedTerminalId: nextFocusedTerminalId,
      changesRoot:
        getAttachedSessionRoot(nextWorktrees, remainingTerminals.find((item) => item.id === nextFocusedTerminalId) || null) ||
        getAttachedSessionRoot(nextWorktrees, currentState.agents.find((item) => item.id === currentState.focusedAgentId) || null) ||
        currentState.project?.rootPath ||
        null,
      errorMessage: null
    }));

    return deps.refreshProjectState();
  }

  async function refreshWorktreeCollectionAfterDetach(
    project: ProjectSummary,
    worktrees: WorktreeRecord[],
    remainingAgents: AgentSession[],
    removedAgent: AgentSession
  ): Promise<WorktreeRecord[]> {
    const updated = await deps.detachAgentFromWorktree(removedAgent);
    if (!updated) {
      return worktrees;
    }

    const stillAttached =
      remainingAgents.some((agent) => agent.worktreeId === updated.id) ||
      deps.getSnapshot().terminals.some((terminal) => terminal.worktreeId === updated.id);
    if (stillAttached) {
      return deps.upsertWorktree(worktrees, updated);
    }

    try {
      await deps.execGit(deps.getProjectTarget(project), ["worktree", "remove", "--force", updated.path]);
    } catch {
      return deps.upsertWorktree(worktrees, updated);
    }

    await fs.rm(deps.getWorktreeDir(updated.projectId, updated.sessionId, updated.id), {
      recursive: true,
      force: true
    });

    return worktrees.filter((item) => item.id !== updated.id);
  }

  async function refreshWorktreeCollectionAfterTerminalDetach(
    project: ProjectSummary,
    worktrees: WorktreeRecord[],
    remainingAgents: AgentSession[],
    remainingTerminals: TerminalSession[],
    removedTerminal: TerminalSession
  ): Promise<WorktreeRecord[]> {
    const updated = await deps.detachTerminalFromWorktree(removedTerminal);
    if (!updated) {
      return worktrees;
    }

    const stillAttached =
      remainingAgents.some((agent) => agent.worktreeId === updated.id) ||
      remainingTerminals.some((terminal) => terminal.worktreeId === updated.id);
    if (stillAttached) {
      return deps.upsertWorktree(worktrees, updated);
    }

    if (updated.path === project.rootPath || updated.createdFromRef === "ROOT") {
      return worktrees.filter((item) => item.id !== updated.id);
    }

    try {
      await deps.execGit(deps.getProjectTarget(project), ["worktree", "remove", "--force", updated.path]);
    } catch {
      return deps.upsertWorktree(worktrees, updated);
    }

    await fs.rm(deps.getWorktreeDir(updated.projectId, updated.sessionId, updated.id), {
      recursive: true,
      force: true
    });

    return worktrees.filter((item) => item.id !== updated.id);
  }

  async function removeWorktree(worktreeId: string): Promise<AppState> {
    const state = deps.getSnapshot();
    const worktree = state.worktrees.find((item) => item.id === worktreeId);
    if (!worktree) {
      throw new Error("Worktree could not be found.");
    }
    if (!state.project || worktree.projectId !== state.project.id) {
      throw new Error("Choose the project before removing a worktree.");
    }
    if (worktree.path === state.project.rootPath || worktree.createdFromRef === "ROOT") {
      throw new Error("The repository root worktree cannot be removed.");
    }

    const attachedAgents = state.agents.filter((agent) => agent.worktreeId === worktreeId);
    const attachedTerminals = state.terminals.filter((terminal) => terminal.worktreeId === worktreeId);
    if (attachedAgents.length || attachedTerminals.length) {
      throw new Error("Remove all agents and terminals from this worktree before deleting it.");
    }

    try {
      await deps.execGit(deps.getProjectTarget(state.project), ["worktree", "remove", "--force", worktree.path]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove git worktree.";
      throw new Error(message);
    }

    await fs.rm(deps.getWorktreeDir(worktree.projectId, worktree.sessionId, worktree.id), {
      recursive: true,
      force: true
    });

    const nextWorktrees = state.worktrees.filter((item) => item.id !== worktreeId);
    const nextSessions = state.sessions.map((session) => {
      if (session.id !== worktree.sessionId) {
        return session;
      }

      const hasFocusedWorktree = nextWorktrees.some((item) => item.id === session.focusedWorktreeId);
      const replacementWorktree = nextWorktrees.find((item) => item.sessionId === session.id) || null;

      return {
        ...session,
        focusedWorktreeId: hasFocusedWorktree ? session.focusedWorktreeId : replacementWorktree?.id || null,
        updatedAt: deps.nowIso(),
        lastUsedAt: deps.nowIso()
      };
    });
    const wasFocusedWorktree =
      state.sessions.find((session) => session.id === state.currentSessionId)?.focusedWorktreeId === worktreeId ||
      state.changesRoot === worktree.path;

    deps.updateState((currentState) => ({
      ...currentState,
      sessions: nextSessions,
      worktrees: nextWorktrees,
      changesRoot: wasFocusedWorktree ? currentState.project?.rootPath ?? null : currentState.changesRoot,
      errorMessage: null
    }));

    return deps.refreshProjectState();
  }

  return {
    focusAgent,
    focusTerminal,
    focusWorktree,
    restartAgent,
    restartTerminal,
    destroyAgent,
    destroyTerminal,
    removeWorktree,
    refreshWorktreeCollectionAfterDetach,
    refreshWorktreeCollectionAfterTerminalDetach
  };
}
