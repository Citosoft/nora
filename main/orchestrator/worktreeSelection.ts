import type {
  CreateAgentPayload,
  CreateTerminalPayload,
  ProjectSummary,
  SessionRecord,
  WorktreeRecord
} from "@shared/appTypes";
import type {
  WorktreeSelectionDeps,
  WorktreeSelectionHelpers
} from "../types/orchestratorWorktreeSelection.types";

export function createWorktreeSelectionHelpers(deps: WorktreeSelectionDeps): WorktreeSelectionHelpers {
  async function resolveWorktreeForSpawn(
    project: ProjectSummary,
    payload: CreateAgentPayload,
    agentName: string,
    onCreatingWorktree?: (session: SessionRecord, worktree: WorktreeRecord) => Promise<void>
  ): Promise<{ session: SessionRecord; worktree: WorktreeRecord; createdWorktree: boolean }> {
    const state = deps.getSnapshot();
    const existingSessions = state.sessions.filter((session) => session.projectId === project.id);
    const target = payload.target;
    let session =
      (target.kind === "session-default" && target.sessionId
        ? existingSessions.find((item) => item.id === target.sessionId)
        : existingSessions.find((item) => item.id === state.currentSessionId)) ||
      existingSessions[0] ||
      (await deps.createInitialSessionState(project)).session;

    let createdWorktree = false;
    let worktree: WorktreeRecord | undefined;

    if (target.kind === "existing") {
      worktree = state.worktrees.find((item) => item.id === target.worktreeId && item.projectId === project.id);
      if (!worktree) {
        throw new Error("Selected worktree could not be found.");
      }
      const existingWorktree = worktree;
      if (deps.isWindowsUncPath(existingWorktree.path)) {
        throw new Error("Agents cannot launch directly from a mounted UNC workspace on Windows. Choose a new worktree instead.");
      }
      session = existingSessions.find((item) => item.id === existingWorktree.sessionId) || session;
      if (payload.mode === "write" && existingWorktree.writerAgentId) {
        throw new Error("That worktree already has an active writer.");
      }
    } else if (target.kind === "session-default") {
      const preferredId = session.focusedWorktreeId;
      const candidate = state.worktrees.find((item) => item.id === preferredId) ||
        state.worktrees.find((item) => item.sessionId === session.id);
      if (
        candidate &&
        !deps.isWindowsUncPath(candidate.path) &&
        (payload.mode === "read" || !candidate.writerAgentId)
      ) {
        worktree = candidate;
      }
    } else if (target.kind === "root") {
      worktree = await deps.getOrCreateRootWorktree(project, session, state.worktrees);
    }

    if (!worktree) {
      const pendingWorktree = deps.planManagedWorktree(project, session, agentName, payload.worktreeBranch);
      if (onCreatingWorktree) {
        await onCreatingWorktree(session, pendingWorktree);
      }
      worktree = await deps.createWorktree(project, session, agentName, pendingWorktree);
      createdWorktree = true;
    }

    session = {
      ...session,
      focusedWorktreeId: worktree.id,
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso()
    };

    return { session, worktree, createdWorktree };
  }

  async function resolveWorktreeForTerminal(
    project: ProjectSummary,
    target: CreateTerminalPayload["target"]
  ): Promise<{ session: SessionRecord; worktree: WorktreeRecord }> {
    const state = deps.getSnapshot();
    const existingSessions = state.sessions.filter((session) => session.projectId === project.id);
    let session =
      ((target.kind === "session-default" || target.kind === "root") && target.sessionId
        ? existingSessions.find((item) => item.id === target.sessionId)
        : existingSessions.find((item) => item.id === state.currentSessionId)) ||
      existingSessions[0] ||
      (await deps.createInitialSessionState(project)).session;

    let worktree: WorktreeRecord | undefined;

    if (target.kind === "existing") {
      const existingWorktree = state.worktrees.find((item) => item.id === target.worktreeId && item.projectId === project.id);
      if (!existingWorktree) {
        throw new Error("Selected worktree could not be found.");
      }
      worktree = existingWorktree;
      session = existingSessions.find((item) => item.id === existingWorktree.sessionId) || session;
    } else if (target.kind === "root") {
      worktree = await deps.getOrCreateRootWorktree(project, session, state.worktrees);
    } else if (target.kind === "session-default") {
      const preferredId = session.focusedWorktreeId;
      worktree =
        state.worktrees.find((item) => item.id === preferredId) ||
        state.worktrees.find((item) => item.sessionId === session.id);
    }

    if (!worktree) {
      worktree = await deps.getOrCreateRootWorktree(project, session, state.worktrees);
    }

    if (!worktree) {
      throw new Error("Unable to resolve worktree for terminal.");
    }

    session = {
      ...session,
      focusedWorktreeId: worktree.id,
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso()
    };

    return { session, worktree };
  }

  return {
    resolveWorktreeForSpawn,
    resolveWorktreeForTerminal
  };
}
