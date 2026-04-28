import type { WorkspaceTarget } from "../types/internal.types";
import type {
  WorkspaceNavigationDeps,
  WorkspaceNavigationHelpers
} from "../types/orchestratorWorkspaceNavigation.types";

export function createWorkspaceNavigationHelpers(deps: WorkspaceNavigationDeps): WorkspaceNavigationHelpers {
  async function resolveProjectTarget(projectRoot: string): Promise<WorkspaceTarget> {
    const currentProject = deps.getSnapshot().project;
    if (currentProject?.rootPath === projectRoot) {
      return deps.getProjectTarget(currentProject);
    }

    const summaryProject = deps.getSnapshot().workspaces.find((workspace) => workspace.project.rootPath === projectRoot)?.project;
    if (summaryProject) {
      return deps.getProjectTarget(summaryProject);
    }

    const indexedProjects = await deps.loadIndexedProjects();
    const indexedProject = indexedProjects.find((project) => project.rootPath === projectRoot) || null;
    if (indexedProject) {
      return deps.getProjectTarget(indexedProject);
    }

    const target: WorkspaceTarget = {
      path: projectRoot,
      location: { kind: "local" }
    };
    return target;
  }

  async function resolveProjectSummaryById(projectId: string) {
    const currentProject = deps.getSnapshot().project;
    if (currentProject?.id === projectId) {
      return currentProject;
    }

    const summaryProject = deps.getSnapshot().workspaces.find((workspace) => workspace.project.id === projectId)?.project;
    if (summaryProject) {
      return summaryProject;
    }

    const indexedProjects = await deps.loadIndexedProjects();
    const indexedProject = indexedProjects.find((project) => project.id === projectId) || null;
    if (indexedProject) {
      return indexedProject;
    }

    throw new Error("Workspace could not be found.");
  }

  async function resolveProjectTargetById(projectId: string) {
    return deps.getProjectTarget(await resolveProjectSummaryById(projectId));
  }

  async function selectProject(projectRoot: string) {
    return deps.openProject(await resolveProjectTarget(projectRoot), {
      focusedAgentMode: "first-agent"
    });
  }

  async function focusWorkspace(projectId: string) {
    const state = deps.getSnapshot();
    if (state.project?.id === projectId) {
      deps.updateState((currentState) => ({
        ...currentState,
        screen: "workspace",
        errorMessage: null
      }));
      return deps.refreshProjectState();
    }

    return deps.openProject(await resolveProjectTargetById(projectId), {
      focusedAgentMode: "none"
    });
  }

  async function openDirectSshProject(payload: {
    host: string;
    user?: string;
    port?: number | null;
    remotePath: string;
    alias?: string;
  }) {
    const resolved = await deps.resolveRemotePayload({
      ...payload,
      connectionMode: "ssh"
    });
    const user = (resolved.user || "").trim();
    if (!user) {
      throw new Error("A remote SSH user is required for direct SSH workspaces.");
    }

    return deps.openProject(
      {
        path: resolved.remotePath.trim() || ".",
        location: {
          kind: "ssh",
          host: resolved.host.trim(),
          user,
          port: resolved.port ?? null,
          remotePath: resolved.remotePath.trim() || ".",
          alias: payload.alias || null
        }
      },
      {
        focusedAgentMode: "none"
      }
    );
  }

  return {
    selectProject,
    focusWorkspace,
    openDirectSshProject,
    resolveProjectTarget,
    resolveProjectTargetById,
    resolveProjectSummaryById
  };
}
