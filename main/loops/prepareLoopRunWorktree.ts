import type { CreateAgentPayload } from "@shared/appTypes";
import type {
  PrepareLoopRunWorktreeDeps,
  PrepareLoopRunWorktreeInput,
  PreparedLoopRunWorktree
} from "@main/types/prepareLoopRunWorktree.types";

function buildWorktreePayload(input: PrepareLoopRunWorktreeInput): CreateAgentPayload {
  return {
    toolId: input.writerToolId,
    name: input.writerName,
    task: "Workflow run workspace",
    commandOverride: "",
    mode: "write",
    target: input.payload.target,
    branchCheckout: input.payload.branchCheckout ?? null,
    worktreeBranch: input.payload.worktreeBranch ?? null,
    prepareWorktree: input.payload.prepareWorktree ?? false,
    prepareCommand: input.payload.prepareCommand ?? "",
    launchSource: "loop"
  };
}

export async function prepareLoopRunWorktree(
  deps: PrepareLoopRunWorktreeDeps,
  input: PrepareLoopRunWorktreeInput
): Promise<PreparedLoopRunWorktree> {
  const state = deps.getSnapshot();
  const project = state.project;
  if (!project || project.id !== input.payload.projectId) {
    throw new Error("Choose a project before starting a workflow run.");
  }

  const payload = buildWorktreePayload(input);
  const { session, worktree, createdWorktree } = await deps.resolveWorktreeForSpawn(
    project,
    payload,
    input.writerName,
    async (pendingSession, pendingWorktree) => {
      await input.onProgress?.(`Creating worktree ${pendingWorktree.branch}…`);
      deps.updateState((currentState) => {
        const nextSessions = deps.upsertSession(currentState.sessions, {
          ...pendingSession,
          focusedWorktreeId: pendingWorktree.id,
          updatedAt: deps.nowIso(),
          lastUsedAt: deps.nowIso()
        });
        const nextWorktrees = deps.upsertWorktree(currentState.worktrees, pendingWorktree);
        return {
          ...currentState,
          currentSessionId: pendingSession.id,
          sessions: nextSessions,
          worktrees: nextWorktrees,
          workspaces: deps.upsertWorkspaceSummary(currentState.workspaces, {
            project,
            sessions: nextSessions,
            worktrees: nextWorktrees,
            agents: currentState.agents,
            terminals: currentState.terminals
          }),
          errorMessage: null
        };
      });
    }
  );

  let activeWorktree = worktree;
  deps.updateState((currentState) => {
    const nextSessions = deps.upsertSession(currentState.sessions, {
      ...session,
      focusedWorktreeId: activeWorktree.id,
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso()
    });
    const nextWorktrees = deps.upsertWorktree(currentState.worktrees, activeWorktree);
    return {
      ...currentState,
      currentSessionId: session.id,
      sessions: nextSessions,
      worktrees: nextWorktrees,
      workspaces: deps.upsertWorkspaceSummary(currentState.workspaces, {
        project,
        sessions: nextSessions,
        worktrees: nextWorktrees,
        agents: currentState.agents,
        terminals: currentState.terminals
      }),
      errorMessage: null
    };
  });

  const branchCheckout = payload.branchCheckout?.branchName.trim()
    ? {
        ...payload.branchCheckout,
        branchName: payload.branchCheckout.branchName.trim()
      }
    : null;

  if (branchCheckout) {
    await input.onProgress?.(
      branchCheckout.mode === "new" ? `Creating branch ${branchCheckout.branchName}…` : `Checking out ${branchCheckout.branchName}…`
    );
    await deps.checkoutBranchForLaunch(deps.getWorktreeTarget(project, activeWorktree), branchCheckout);
    activeWorktree = {
      ...activeWorktree,
      branch: branchCheckout.branchName,
      updatedAt: deps.nowIso(),
      lastUsedAt: deps.nowIso()
    };
    deps.updateState((currentState) => ({
      ...currentState,
      worktrees: currentState.worktrees.map((entry) => (entry.id === activeWorktree.id ? activeWorktree : entry))
    }));
  }

  const prepareCommand = (payload.prepareCommand || "").trim();
  if (createdWorktree && payload.prepareWorktree && prepareCommand) {
    await input.onProgress?.("Preparing worktree…");
    await deps.prepareWorktree(deps.getWorktreeTarget(project, activeWorktree), prepareCommand);
  }

  await deps.persistWorkspaceState(deps.getSnapshot());

  return {
    sessionId: session.id,
    worktreeId: activeWorktree.id,
    worktreePath: activeWorktree.path
  };
}
