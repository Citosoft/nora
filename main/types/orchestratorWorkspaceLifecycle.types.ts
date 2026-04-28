import type { AppState, ProjectSummary, RecentProject } from "@shared/appTypes";
import type { WorkspaceTarget } from "../types/internal.types";

export interface WorkspaceLifecycleDeps {
  getSnapshot: () => AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
  clearRuntimeState: () => void;
  persistWorkspaceState: (state: AppState) => Promise<void>;
  stopAllAgents: () => Promise<void>;
  loadRecentProjects: () => Promise<RecentProject[]>;
  removeRecentProject: (projectRoot: string) => Promise<RecentProject[]>;
  saveRecentProjects: (projects: RecentProject[]) => Promise<unknown>;
  loadIndexedProjects: () => Promise<ProjectSummary[]>;
  removeIndexedProject: (projectId: string) => Promise<unknown>;
  saveAllProjects: (projects: ProjectSummary[]) => Promise<unknown>;
  removeProjectSessions: (projectId: string) => Promise<unknown>;
  readActiveRemoteMounts: () => Promise<AppState["activeRemoteMounts"]>;
  refreshWorkspaceSummaries: (reason: string) => Promise<void>;
  suppressWorkspace: (projectRoot: string, projectId?: string | null) => void;
  getProjectMetadata: (target: WorkspaceTarget) => Promise<ProjectSummary>;
  getProjectsDir: () => string;
  removeDirectory: (directoryPath: string) => Promise<void>;
  pathIsWithinAnyMount: (projectPath: string, mountPoints: string[]) => boolean;
  createFallbackProjectTarget: (projectRoot: string, indexedProject: ProjectSummary | null) => WorkspaceTarget;
  getManagedWorktreePaths: (projects: ProjectSummary[]) => Promise<string[]>;
  removeManyDirectories: (directoryPaths: string[]) => Promise<void>;
}

export interface WorkspaceLifecycleHelpers {
  closeProject: () => Promise<AppState>;
  removeProject: (projectRoot: string) => Promise<AppState>;
  removeProjectsWithinMount: (mountPoint: string, relatedMountRoots?: string[]) => Promise<void>;
  resetWorkspaces: () => Promise<AppState>;
}
