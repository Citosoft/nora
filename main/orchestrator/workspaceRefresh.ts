import type { ChangeEntry, CommitHistoryEntry, WorkspaceSummary } from "@shared/appTypes";
import type { WorkspaceRefreshHelperDeps, WorkspaceRefreshHelpers } from "../types/orchestratorWorkspaceRefresh.types";

export function createWorkspaceRefreshHelpers(deps: WorkspaceRefreshHelperDeps): WorkspaceRefreshHelpers {
  async function refreshProjectState() {
    const state = deps.getSnapshot();
    if (!state.project) {
      const activeRemoteMounts = await deps.readActiveRemoteMounts();
      deps.updateState((current) => ({
        ...current,
        activeRemoteMounts
      }));
      await deps.refreshWorkspaceSummaries("refreshProjectState:no-project");
      return deps.getSnapshot();
    }

    const changesRoot = deps.getActiveChangesRoot(state);
    const isDirectSshProject = state.project.location?.kind === "ssh";
    const projectTarget = deps.getProjectTarget(state.project);
    const changesRootTarget = { path: changesRoot, location: state.project.location };
    const currentBranch = await deps.readCurrentBranch(projectTarget).catch(() => state.project?.baseBranch || "main");
    const commitHistoryCommand = await deps.getGitProgressCommand(changesRootTarget, ["log", "--date=iso", "--decorate", "--max-count=40"]);
    const branchListingCommand = await deps.getGitProgressCommand(projectTarget, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
    const worktreeStatusCommand = await deps.getGitProgressCommand(projectTarget, ["status", "--short"]);
    const selectedChangesCommand = await deps.getGitProgressCommand(changesRootTarget, ["status", "--short"]);

    deps.reportWorkspaceLoadingProgress(state.project.id, "Refreshing workspace scripts...", "read package.json");
    const projectScriptsPromise = isDirectSshProject
      ? Promise.resolve(state.projectScripts)
      : deps.detectWorkspaceScripts(projectTarget);
    deps.reportWorkspaceLoadingProgress(state.project.id, "Refreshing workspace tooling...", "check lockfiles and package.json");
    const defaultWorktreePrepareCommandPromise = isDirectSshProject
      ? state.defaultWorktreePrepareCommand
      : deps.detectDefaultWorktreePrepareCommand(projectTarget);
    deps.reportWorkspaceLoadingProgress(state.project.id, "Refreshing workspace instructions...", "check AGENTS.md");
    const workspaceInstructionFilePromise = deps.detectWorkspaceInstructionFile(projectTarget);
    deps.reportWorkspaceLoadingProgress(state.project.id, "Reading commit history...", commitHistoryCommand);
    const commitHistoryPromise = deps.readCommitHistory(changesRootTarget).catch(() => [] as CommitHistoryEntry[]);
    const activeRemoteMountsPromise = deps.readActiveRemoteMounts();
    deps.reportWorkspaceLoadingProgress(state.project.id, "Reading local branches...", branchListingCommand);
    const projectBranchesPromise = isDirectSshProject
      ? Promise.resolve(state.projectBranches.length ? state.projectBranches : [state.project?.baseBranch || "main"])
      : deps.readProjectBranches(projectTarget).catch(() => [state.project?.baseBranch || "main"]);

    const worktreeChangeEntriesPromise = Promise.all(
      state.worktrees.map(async (worktree) => {
        const worktreeTarget = deps.getWorktreeTarget(state.project!, worktree);
        const changes = await deps.readGitChanges(worktreeTarget).catch(() => [] as ChangeEntry[]);
        const branch = await deps.readCurrentBranch(worktreeTarget).catch(() => worktree.branch);
        const scripts = isDirectSshProject ? (worktree.scripts || []) : await deps.detectWorkspaceScripts(worktreeTarget);
        return {
          worktreeId: worktree.id,
          worktreePath: worktreeTarget.path,
          branch,
          changes,
          scripts
        };
      })
    );

    const [
      projectScripts,
      defaultWorktreePrepareCommand,
      workspaceInstructionFile,
      commitHistory,
      activeRemoteMounts,
      projectBranches,
      worktreeChangeEntries
    ] = await Promise.all([
      projectScriptsPromise,
      defaultWorktreePrepareCommandPromise,
      workspaceInstructionFilePromise,
      commitHistoryPromise,
      activeRemoteMountsPromise,
      projectBranchesPromise,
      worktreeChangeEntriesPromise
    ]);

    const cachedChangesByPath = new Map<string, ChangeEntry[]>();
    for (const entry of worktreeChangeEntries) {
      cachedChangesByPath.set(deps.normalizeLocalPath(entry.worktreePath), entry.changes);
    }
    let refreshWarning: string | null = null;
    const changeSummaryByWorktree = new Map(
      worktreeChangeEntries.map((entry) => [entry.worktreeId, deps.summarizeChanges(entry.changes)])
    );
    const branchByWorktree = new Map(
      worktreeChangeEntries.map((entry) => [entry.worktreeId, entry.branch])
    );
    const scriptsByWorktree = new Map(
      worktreeChangeEntries.map((entry) => [entry.worktreeId, entry.scripts])
    );
    deps.reportWorkspaceLoadingProgress(state.project.id, "Refreshing worktree changes...", worktreeStatusCommand);
    const rootWorktree = state.worktrees.find((worktree) => worktree.path === state.project?.rootPath) ?? null;
    const rootBranch =
      currentBranch ||
      (rootWorktree ? branchByWorktree.get(rootWorktree.id) : null) ||
      state.project?.baseBranch ||
      "main";
    deps.reportWorkspaceLoadingProgress(state.project.id, "Refreshing selected workspace changes...", selectedChangesCommand);
    const normalizedChangesRoot = deps.normalizeLocalPath(changesRoot);
    const workingTreeChanges =
      worktreeChangeEntries.find((entry) =>
        state.worktrees.find((worktree) => worktree.id === entry.worktreeId)?.path === changesRoot
      )?.changes ??
      cachedChangesByPath.get(normalizedChangesRoot) ??
      await deps.readGitChanges(changesRootTarget).catch((error: unknown) => {
        if (deps.isExecTimeoutError(error)) {
          refreshWarning = deps.describeGitTimeout("Refreshing git status");
          return [] as ChangeEntry[];
        }
        throw error;
      });
    deps.reportWorkspaceLoadingProgress(state.project.id, "Applying workspace change snapshot...", "summarize git status results");
    let selectedCommit = state.selectedCommitHash
      ? (commitHistory.find((entry) => entry.hash === state.selectedCommitHash) || null)
      : null;
    if (!selectedCommit && state.selectedCommitHash) {
      deps.reportWorkspaceLoadingProgress(
        state.project.id,
        "Reading selected commit details...",
        await deps.getGitProgressCommand(changesRootTarget, ["log", "--pretty=format:%H%x09%h%x09%an%x09%aI%x09%s", "-n", "1", state.selectedCommitHash])
      );
      selectedCommit = await deps.readCommitEntry(changesRootTarget, state.selectedCommitHash).catch(() => null);
    }
    const changes = selectedCommit
      ? await (async () => {
          deps.reportWorkspaceLoadingProgress(
            state.project!.id,
            "Reading selected commit changes...",
            await deps.getGitProgressCommand(changesRootTarget, ["show", "--format=", "--name-status", "--find-renames", selectedCommit.hash])
          );
          return deps.readCommitChanges(changesRootTarget, selectedCommit.hash).catch(() => workingTreeChanges);
        })()
      : workingTreeChanges;
    const nextSelectedCommitHash = selectedCommit && changes !== workingTreeChanges ? selectedCommit.hash : null;

    deps.updateState((currentState) => ({
      ...currentState,
      project: currentState.project
        ? {
            ...currentState.project,
            baseBranch: rootBranch,
            workspaceInstructionFile,
            updatedAt: deps.nowIso()
          }
        : null,
      changesRoot,
      selectedChangePath:
        changes.find((change) => change.path === currentState.selectedChangePath)?.path ||
        changes[0]?.path ||
        null,
      selectedCommitHash: nextSelectedCommitHash,
      selectedCommit: nextSelectedCommitHash ? selectedCommit : null,
      changes,
      commitHistory,
      activeRemoteMounts,
      projectScripts,
      projectBranches,
      defaultWorktreePrepareCommand,
      worktrees: currentState.worktrees.map((worktree) => ({
        ...worktree,
        branch: branchByWorktree.get(worktree.id) ?? worktree.branch,
        scripts: scriptsByWorktree.get(worktree.id) ?? worktree.scripts ?? []
      })),
      agents: currentState.agents.map((agent) => ({
        ...agent,
        branch: branchByWorktree.get(agent.worktreeId) ?? agent.branch,
        changeSummary: changeSummaryByWorktree.get(agent.worktreeId) ?? agent.changeSummary ?? null
      })),
      terminals: currentState.terminals.map((terminal) => ({
        ...terminal,
        branch: branchByWorktree.get(terminal.worktreeId) ?? terminal.branch,
        changeSummary: changeSummaryByWorktree.get(terminal.worktreeId) ?? terminal.changeSummary ?? null
      })),
      errorMessage: refreshWarning
    }));

    deps.reportWorkspaceLoadingProgress(state.project.id, "Reconciling workspace summaries...", "read project index and session state");
    await deps.refreshWorkspaceSummaries("refreshProjectState");
    return deps.getSnapshot();
  }

  async function runRefreshWorkspaceSummaries(reason: string): Promise<void> {
    const state = deps.getSnapshot();
    const [indexedProjects, recentProjects, storedProjects] = await Promise.all([
      deps.loadIndexedProjects(),
      deps.loadRecentProjects(),
      deps.readStoredProjectFiles()
    ]);
    const projectsById = new Map(
      indexedProjects
        .filter((project) => !deps.isWorkspaceSuppressed(project))
        .map((project) => [project.id, project])
    );
    const knownRecentRootPaths = new Set(
      [...projectsById.values()].map((project) => deps.normalizeLocalPath(project.rootPath))
    );
    for (const storedProject of storedProjects) {
      if (!deps.isWorkspaceSuppressed(storedProject) && !projectsById.has(storedProject.id)) {
        projectsById.set(storedProject.id, storedProject);
        knownRecentRootPaths.add(deps.normalizeLocalPath(storedProject.rootPath));
      }
    }
    for (const recentProject of recentProjects) {
      if (deps.isSuppressedWorkspaceRoot(recentProject.rootPath)) {
        continue;
      }
      if (knownRecentRootPaths.has(deps.normalizeLocalPath(recentProject.rootPath))) {
        continue;
      }
      const recovered = await deps.getProjectMetadata({
        path: recentProject.rootPath,
        location: { kind: "local" }
      }).catch(() => null);
      if (recovered && !deps.isWorkspaceSuppressed(recovered) && !projectsById.has(recovered.id)) {
        projectsById.set(recovered.id, {
          ...deps.mergePersistedProjectSummary(recovered, indexedProjects.find((project) => project.id === recovered.id) || null),
          lastOpenedAt: recentProject.lastOpenedAt
        });
        knownRecentRootPaths.add(deps.normalizeLocalPath(recovered.rootPath));
      }
    }
    const reconciledProjects = [...projectsById.values()];
    await deps.saveAllProjects(reconciledProjects);
    const summaries: WorkspaceSummary[] = [];

    for (const project of reconciledProjects) {
      if (deps.isWorkspaceSuppressed(project)) {
        continue;
      }
      if (state.project?.id === project.id) {
        summaries.push({
          project: state.project,
          sessions: state.sessions,
          worktrees: state.worktrees,
          agents: state.agents,
          terminals: state.terminals
        });
        continue;
      }

      const persistedSessions = await deps.loadStatesForProject(project.id);
      const persistedTerminals = persistedSessions.flatMap((entry) => entry.terminals);
      const liveTerminals = deps.getLiveTerminalSnapshots().filter((terminal) => terminal.projectId === project.id);
      const mergedTerminals = liveTerminals.length
        ? [
            ...persistedTerminals.map((terminal) => liveTerminals.find((live) => live.id === terminal.id) || terminal),
            ...liveTerminals.filter((terminal) =>
              !persistedTerminals.some((candidate) => candidate.id === terminal.id)
            )
          ]
        : persistedTerminals;
      summaries.push({
        project,
        sessions: persistedSessions.map((entry) => entry.session),
        worktrees: persistedSessions.flatMap((entry) => entry.worktrees),
        agents: persistedSessions.flatMap((entry) => entry.agents),
        terminals: mergedTerminals
      });
    }

    deps.setState({
      workspaces: summaries
    });
    void reason;
  }

  return {
    refreshProjectState,
    runRefreshWorkspaceSummaries
  };
}
