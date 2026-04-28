import type { AppState, ProjectSummary } from "@shared/appTypes";
import type { WorkspaceTarget } from "../types/internal.types";

export interface WorkspaceNavigationDeps {
  getSnapshot: () => AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
  refreshProjectState: () => Promise<AppState>;
  openProject: (
    projectTarget: WorkspaceTarget,
    options: { focusedAgentMode: "first-agent" | "none" }
  ) => Promise<AppState>;
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  loadIndexedProjects: () => Promise<ProjectSummary[]>;
  resolveRemotePayload: (payload: {
    host: string;
    user?: string;
    port?: number | null;
    remotePath: string;
    alias?: string;
    connectionMode: "ssh";
  }) => Promise<{ host: string; user?: string; port?: number | null; remotePath: string }>;
}

export interface WorkspaceNavigationHelpers {
  selectProject: (projectRoot: string) => Promise<AppState>;
  focusWorkspace: (projectId: string) => Promise<AppState>;
  openDirectSshProject: (payload: {
    host: string;
    user?: string;
    port?: number | null;
    remotePath: string;
    alias?: string;
  }) => Promise<AppState>;
  resolveProjectTarget: (projectRoot: string) => Promise<WorkspaceTarget>;
  resolveProjectTargetById: (projectId: string) => Promise<WorkspaceTarget>;
  resolveProjectSummaryById: (projectId: string) => Promise<ProjectSummary>;
}
