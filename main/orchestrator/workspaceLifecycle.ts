import type { AppState } from "@shared/appTypes";
import type {
  WorkspaceLifecycleDeps,
  WorkspaceLifecycleHelpers
} from "../types/orchestratorWorkspaceLifecycle.types";

function clearActiveWorkspaceState(state: AppState): AppState {
  return {
    ...state,
    screen: "project-selector",
    workspaces: [],
    project: null,
    currentSessionId: null,
    sessions: [],
    worktrees: [],
    agents: [],
    terminals: [],
    focusedAgentId: null,
    focusedTerminalId: null,
    selectedChangePath: null,
    selectedCommitHash: null,
    selectedCommit: null,
    changesRoot: null,
    changes: [],
    commitHistory: [],
    projectScripts: [],
    projectBranches: [],
    defaultWorktreePrepareCommand: null,
    errorMessage: null
  };
}

export function createWorkspaceLifecycleHelpers(deps: WorkspaceLifecycleDeps): WorkspaceLifecycleHelpers {
  async function closeProject(): Promise<AppState> {
    await deps.persistWorkspaceState(deps.getSnapshot());
    await deps.stopAllAgents();

    const recentProjects = await deps.loadRecentProjects();
    const activeRemoteMounts = await deps.readActiveRemoteMounts();

    deps.updateState((state) => ({
      ...clearActiveWorkspaceState(state),
      recentProjects,
      activeRemoteMounts
    }));

    await deps.refreshWorkspaceSummaries("closeProject");
    return deps.getSnapshot();
  }

  async function removeProject(projectRoot: string): Promise<AppState> {
    const current = deps.getSnapshot();
    deps.suppressWorkspace(projectRoot);
    const indexedProjects = await deps.loadIndexedProjects();
    const indexedProject = indexedProjects.find((item) => item.rootPath === projectRoot) || null;
    const recentProjectsBeforeRemoval = await deps.loadRecentProjects();
    const recentProject = recentProjectsBeforeRemoval.find((item) => item.rootPath === projectRoot) || null;
    const fallbackProjectTarget = deps.createFallbackProjectTarget(projectRoot, indexedProject);
    const project = current.project?.rootPath === projectRoot
      ? current.project
      : indexedProject || (await deps.getProjectMetadata(fallbackProjectTarget).catch(() => null));

    if (project) {
      deps.suppressWorkspace(project.rootPath, project.id);
    }

    if (!project) {
      if (!recentProject) {
        throw new Error("Workspace could not be found.");
      }

      const recentProjects = await deps.removeRecentProject(projectRoot);
      const activeRemoteMounts = await deps.readActiveRemoteMounts();
      deps.updateState((state) => ({
        ...state,
        recentProjects,
        activeRemoteMounts,
        workspaces: state.workspaces.filter((workspace) => workspace.project.rootPath !== projectRoot)
      }));
      await deps.refreshWorkspaceSummaries("removeProject:missing-project");
      return deps.getSnapshot();
    }

    if (current.project?.id === project.id) {
      await deps.persistWorkspaceState(current);
      await deps.stopAllAgents();
      deps.updateState((state) => clearActiveWorkspaceState(state));
    }

    await deps.removeIndexedProject(project.id);
    await deps.removeProjectSessions(project.id);
    const recentProjects = await deps.removeRecentProject(project.rootPath);
    const activeRemoteMounts = await deps.readActiveRemoteMounts();

    deps.updateState((state) => ({
      ...state,
      recentProjects,
      activeRemoteMounts,
      workspaces: state.workspaces.filter((workspace) => workspace.project.id !== project.id)
    }));

    await deps.refreshWorkspaceSummaries("removeProject");
    return deps.getSnapshot();
  }

  async function removeProjectsWithinMount(mountPoint: string, relatedMountRoots: string[] = []): Promise<void> {
    const mountMatchers = [mountPoint, ...relatedMountRoots].filter(Boolean);
    const indexedProjects = await deps.loadIndexedProjects();
    const projectsToRemove = indexedProjects.filter((project) => deps.pathIsWithinAnyMount(project.rootPath, mountMatchers));
    if (!projectsToRemove.length) {
      return;
    }

    for (const project of projectsToRemove) {
      deps.suppressWorkspace(project.rootPath, project.id);
    }

    const current = deps.getSnapshot();
    const currentProjectWithinMount = current.project
      ? deps.pathIsWithinAnyMount(current.project.rootPath, mountMatchers)
      : false;

    if (currentProjectWithinMount) {
      await deps.persistWorkspaceState(current);
      await deps.stopAllAgents();
      deps.updateState((state) => clearActiveWorkspaceState(state));
    }

    for (const project of projectsToRemove) {
      await deps.removeIndexedProject(project.id);
      await deps.removeProjectSessions(project.id);
    }

    const recentProjects = await deps.loadRecentProjects();
    const nextRecentProjects = recentProjects.filter((project) => !deps.pathIsWithinAnyMount(project.rootPath, mountMatchers));
    await deps.saveRecentProjects(nextRecentProjects);

    deps.updateState((state) => ({
      ...state,
      recentProjects: nextRecentProjects,
      workspaces: state.workspaces.filter((workspace) => !deps.pathIsWithinAnyMount(workspace.project.rootPath, mountMatchers))
    }));

    await deps.refreshWorkspaceSummaries("removeProjectsWithinMount");
  }

  async function resetWorkspaces(): Promise<AppState> {
    for (const workspace of deps.getSnapshot().workspaces) {
      deps.suppressWorkspace(workspace.project.rootPath, workspace.project.id);
    }
    deps.clearRuntimeState();

    const indexedProjects = await deps.loadIndexedProjects();
    const managedWorktreePaths = await deps.getManagedWorktreePaths(indexedProjects);
    await deps.removeManyDirectories(managedWorktreePaths);

    for (const project of indexedProjects) {
      await deps.removeProjectSessions(project.id);
    }

    await deps.saveAllProjects([]);
    await deps.saveRecentProjects([]);
    await deps.removeDirectory(deps.getProjectsDir());

    const activeRemoteMounts = await deps.readActiveRemoteMounts();
    deps.updateState((state) => ({
      ...clearActiveWorkspaceState(state),
      workspaces: [],
      recentProjects: [],
      activeRemoteMounts
    }));

    await deps.refreshWorkspaceSummaries("resetWorkspaces");
    return deps.getSnapshot();
  }

  return {
    closeProject,
    removeProject,
    removeProjectsWithinMount,
    resetWorkspaces
  };
}
