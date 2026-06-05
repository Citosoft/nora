import type { WorkspaceTarget } from "@main/types/internal.types";
import { isLocalAgentDetectionInFlight, peekLocalAgentCatalogDetections } from "@main/agentDetectionCache";
import { createUndetectedLocalAgentDetections } from "@main/orchestrator/environmentDetection";
import type {
  AppState,
  AgentSession,
  ProjectSummary,
  TerminalSession,
  WorktreeRecord,
  WorkspaceSummary
} from "@shared/appTypes";
import type { OpenProjectOptions, ProjectOpenHelperDeps, ProjectOpenHelpers } from "../types/orchestratorProjectOpen.types";

function mergeRecoveredTerminals(
  projectId: string,
  recoveredTerminals: TerminalSession[],
  existingWorkspaceSummary: WorkspaceSummary | null,
  liveTerminalSnapshots: TerminalSession[]
): TerminalSession[] {
  const liveById = new Map(
    liveTerminalSnapshots
      .filter((terminal) => terminal.projectId === projectId)
      .map((terminal) => [terminal.id, terminal])
  );
  if (!existingWorkspaceSummary && !liveById.size) {
    return recoveredTerminals;
  }
  return [
    ...recoveredTerminals.map((terminal) => liveById.get(terminal.id) || terminal),
    ...[...(existingWorkspaceSummary?.terminals || []), ...liveById.values()].filter((terminal, index, all) =>
      !recoveredTerminals.some((candidate) => candidate.id === terminal.id) &&
      all.findIndex((candidate) => candidate.id === terminal.id) === index
    )
  ];
}

function getAttachedWorktreePath(worktrees: Array<{ id: string; path: string }>, worktreeId: string): string | null {
  return worktrees.find((worktree) => worktree.id === worktreeId)?.path || null;
}

export function normalizeRecoveredTerminals(
  terminals: TerminalSession[],
  worktrees: Array<{ id: string; path: string }>
): TerminalSession[] {
  return terminals.map((terminal) => {
    const worktreePath = getAttachedWorktreePath(worktrees, terminal.worktreeId);
    if (!worktreePath) {
      return terminal;
    }

    return {
      ...terminal,
      workspace: worktreePath,
      currentWorkingDirectory: terminal.currentWorkingDirectory || terminal.workspace || worktreePath
    };
  });
}

function getRecoveredSessionChangesRoot({
  project,
  focusedAgentMode,
  agents,
  terminals,
  worktrees
}: {
  project: ProjectSummary;
  focusedAgentMode: OpenProjectOptions["focusedAgentMode"];
  agents: AgentSession[];
  terminals: TerminalSession[];
  worktrees: WorktreeRecord[];
}): string {
  if (focusedAgentMode === "first-agent") {
    const firstAgent = agents[0] ?? null;
    if (firstAgent) {
      return getAttachedWorktreePath(worktrees, firstAgent.worktreeId) || firstAgent.workspace || project.rootPath;
    }
  }

  const firstTerminal = terminals[0] ?? null;
  if (firstTerminal) {
    return getAttachedWorktreePath(worktrees, firstTerminal.worktreeId) || project.rootPath;
  }

  return project.rootPath;
}

export function createProjectOpenHelpers(deps: ProjectOpenHelperDeps): ProjectOpenHelpers {
  async function openProject(projectTarget: WorkspaceTarget, options: OpenProjectOptions): Promise<AppState> {
    const initialState = deps.getSnapshot();
    const progressProjectId =
      initialState.workspaces.find((workspace) =>
        workspace.project.rootPath === projectTarget.path &&
        deps.sameWorkspaceLocation(workspace.project.location, projectTarget.location)
      )?.project.id || initialState.project?.id || projectTarget.path;
    const indexedProjects = await deps.loadIndexedProjects();
    const cachedProject =
      (initialState.project &&
      initialState.project.rootPath === projectTarget.path &&
      deps.sameWorkspaceLocation(initialState.project.location, projectTarget.location)
        ? initialState.project
        : null) ||
      initialState.workspaces.find((workspace) =>
        workspace.project.rootPath === projectTarget.path &&
        deps.sameWorkspaceLocation(workspace.project.location, projectTarget.location)
      )?.project ||
      indexedProjects.find((project) =>
        project.rootPath === projectTarget.path &&
        deps.sameWorkspaceLocation(project.location, projectTarget.location)
      ) ||
      null;
    const canReuseSshProject = projectTarget.location?.kind === "ssh" && !!cachedProject;
    const baseProject = canReuseSshProject
      ? cachedProject
      : await (async () => {
          deps.reportWorkspaceLoadingProgress(
            progressProjectId,
            projectTarget.location?.kind === "ssh"
              ? "Connecting to the saved SSH workspace..."
              : "Opening workspace...",
            await deps.getGitProgressCommand(projectTarget, ["rev-parse", "--show-toplevel"])
          );
          return deps.getProjectMetadata(projectTarget, (detail, command) => {
            deps.reportWorkspaceLoadingProgress(progressProjectId, detail, command);
          });
        })();
    const mergedBaseProject = deps.mergePersistedProjectSummary(baseProject, cachedProject);

    await deps.persistWorkspaceState(initialState);
    await deps.stopAllAgents();

    const remoteAgentCatalog = projectTarget.location?.kind === "ssh"
      ? cachedProject?.remoteAgentCatalog || await deps.detectRemoteAgentCatalog(projectTarget)
      : null;
    const project: ProjectSummary = {
      ...mergedBaseProject,
      remoteAgentCatalog,
      lastOpenedAt: deps.nowIso(),
      updatedAt: deps.nowIso()
    };
    deps.unsuppressWorkspace(project.rootPath, project.id);
    const recentProjects = await deps.recordRecentProject(project);
    await deps.saveProject(project);

    deps.reportWorkspaceLoadingProgress(
      project.id,
      "Loading saved sessions and worktrees...",
      "read ~/.nora/state/sessions.json"
    );

    const persistedSessions = await deps.loadStatesForProject(project.id);
    const ensuredSessions = persistedSessions.length
      ? persistedSessions
      : [await deps.createInitialSessionState(project)];
    const currentSnapshot = deps.getSnapshot();
    const existingWorkspaceSummary = currentSnapshot.workspaces.find((workspace) => workspace.project.id === project.id) || null;
    const recoveredAgents = await deps.getRestorableAgents(
      ensuredSessions.flatMap((sessionState) => sessionState.agents)
    );
    const recoveredTerminals = await deps.getRestorableTerminals(
      ensuredSessions.flatMap((sessionState) => sessionState.terminals)
    );
    const mergedRecoveredTerminals = mergeRecoveredTerminals(
      project.id,
      recoveredTerminals,
      existingWorkspaceSummary,
      deps.getLiveTerminalSnapshots()
    );

    const projectTargetForMetadata = deps.getProjectTarget(project);
    const activeRemoteMounts = await deps.readActiveRemoteMounts();
    const projectScripts = project.location?.kind === "ssh"
      ? cachedProject && deps.sameWorkspaceLocation(cachedProject.location, project.location) && cachedProject.rootPath === project.rootPath
        ? (initialState.project?.id === cachedProject.id
          ? initialState.projectScripts
          : (existingWorkspaceSummary?.worktrees.find((worktree) => worktree.path === project.rootPath)?.scripts || []))
        : []
      : null;
    const defaultWorktreePrepareCommand = project.location?.kind === "ssh"
      ? initialState.project?.id === project.id
        ? initialState.defaultWorktreePrepareCommand
        : null
      : null;
    const projectBranches = project.location?.kind === "ssh"
      ? initialState.project?.id === project.id && initialState.projectBranches.length
        ? initialState.projectBranches
        : [project.baseBranch]
      : null;
    const localMetadata = project.location?.kind === "ssh"
      ? null
      : await Promise.all([
          (deps.reportWorkspaceLoadingProgress(project.id, "Inspecting workspace scripts...", "read package.json"),
            deps.detectWorkspaceScripts(projectTargetForMetadata)),
          (deps.reportWorkspaceLoadingProgress(project.id, "Inspecting workspace tooling...", "check lockfiles and package.json"),
            deps.detectDefaultWorktreePrepareCommand(projectTargetForMetadata)),
          (deps.reportWorkspaceLoadingProgress(project.id, "Reading local branches...", "git for-each-ref --format=%(refname:short) refs/heads"),
            deps.readProjectBranches(projectTargetForMetadata).catch(() => [project.baseBranch]))
        ]);
    const worktrees = ensuredSessions.flatMap((sessionState) => sessionState.worktrees);
    const normalizedRecoveredTerminals = normalizeRecoveredTerminals(mergedRecoveredTerminals, worktrees);
    const sessions = ensuredSessions.map((sessionState) => sessionState.session);
    const currentSessionId = sessions[0]?.id || null;
    const agentDetectionPending = project.location?.kind !== "ssh" && isLocalAgentDetectionInFlight();
    const catalogDetections = project.location?.kind === "ssh"
      ? project.remoteAgentCatalog || []
      : (peekLocalAgentCatalogDetections() ?? createUndetectedLocalAgentDetections());
    const catalog = deps.buildAgentCatalog(catalogDetections, deps.getSnapshot().agentCatalog, deps.toolConfigs);
    const agentSkillCatalogs = await deps.readAgentSkillCatalogs([...catalog.map((tool) => tool.id), deps.sharedAgentSkillsToolId]);

    deps.updateState((state) => ({
      ...state,
      screen: "workspace",
      project,
      currentSessionId,
      sessions,
      worktrees,
      recentProjects,
      agents: recoveredAgents,
      terminals: normalizedRecoveredTerminals,
      focusedAgentId: options.focusedAgentMode === "first-agent" ? (recoveredAgents[0]?.id || null) : null,
      focusedTerminalId:
        options.focusedAgentMode === "first-agent"
          ? (recoveredAgents.length ? null : (normalizedRecoveredTerminals[0]?.id || null))
          : (normalizedRecoveredTerminals[0]?.id || null),
      selectedChangePath: ensuredSessions[0]?.selectedChangePath || null,
      selectedCommitHash: ensuredSessions[0]?.selectedCommitHash || null,
      selectedCommit: null,
      changesRoot:
        getRecoveredSessionChangesRoot({
          project,
          focusedAgentMode: options.focusedAgentMode,
          agents: recoveredAgents,
          terminals: normalizedRecoveredTerminals,
          worktrees
        }),
      changes: [],
      commitHistory: [],
      activeRemoteMounts,
      projectScripts: project.location?.kind === "ssh" ? (projectScripts || []) : (localMetadata?.[0] || []),
      projectBranches: project.location?.kind === "ssh" ? (projectBranches || [project.baseBranch]) : (localMetadata?.[2] || [project.baseBranch]),
      defaultWorktreePrepareCommand: project.location?.kind === "ssh" ? (defaultWorktreePrepareCommand || null) : (localMetadata?.[1] || null),
      agentCatalog: catalog,
      agentSkillCatalogs,
      errorMessage: null
    }));

    for (const agent of recoveredAgents) {
      const tool = deps.getSnapshot().agentCatalog.find((item) => item.id === agent.toolId);
      if (project.location?.kind !== "ssh" && (!tool?.detected || !tool.enabled)) {
        if (agentDetectionPending) {
          continue;
        }
        deps.updateAgent(agent.id, {
          status: "error",
          lastEventAt: deps.nowIso()
        });
        continue;
      }

      const launchCommand = deps.normalizeAgentLaunchCommand(
        agent.toolId,
        deps.buildResumeCommand(agent) || agent.command
      );
      await deps.resetAgentTranscript(agent);
      deps.updateAgent(agent.id, {
        rawTerminalOutput: "",
        lastTerminalLine: launchCommand === agent.command
          ? `Launching ${agent.toolLabel}`
          : `Resuming ${agent.toolLabel}`
      });

      void deps.spawnAgentPty(
        agent.id,
        launchCommand,
        deps.getWorktreeTarget(project, { path: agent.workspace, location: project.location }),
        deps.getToolEnv(agent.toolId)
      );
    }

    for (const terminal of normalizedRecoveredTerminals) {
      if (deps.hasRuntimeSession(terminal.id)) {
        continue;
      }
      const terminalWorktreePath = getAttachedWorktreePath(worktrees, terminal.worktreeId) || terminal.workspace;
      const terminalRestorePath = terminal.currentWorkingDirectory || terminalWorktreePath;
      await deps.resetTerminalTranscript(terminal);
      void deps.spawnTerminalPty(
        terminal.id,
        terminal.command,
        deps.getWorktreeTarget(project, { path: terminalRestorePath, location: project.location }),
        deps.resolveTerminalShell(terminal.shellId)
      );
    }

    return deps.refreshProjectState();
  }

  return { openProject };
}
