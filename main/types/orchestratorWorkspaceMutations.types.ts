import type {
  AppState,
  CreateWorkspaceDirectoryPayload,
  ProjectSummary,
  WorkspaceFileRequest,
  WriteWorkspaceFilePayload
} from "@shared/appTypes";
import type { WorkspaceTarget } from "../types/internal.types";

export interface WorkspaceMutationDeps {
  getSnapshot: () => AppState;
  setState: (partial: Partial<AppState>) => void;
  refreshProjectState: () => Promise<AppState>;
  refreshWorkspaceSummaries: (reason: string) => Promise<void>;
  resolveProjectSummaryById: (projectId: string) => Promise<ProjectSummary>;
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  resolveWorkspaceFileTarget: (project: ProjectSummary, rootPath?: string) => WorkspaceTarget;
  moveWorkspaceFileOperation: (
    target: WorkspaceTarget,
    projectId: string,
    fromPath: string,
    toPath: string
  ) => Promise<void>;
  renameWorkspaceTaskBoardPosition: (
    target: WorkspaceTarget,
    projectId: string,
    fromPath: string,
    toPath: string
  ) => Promise<void>;
  deleteWorkspaceFileOperation: (
    target: WorkspaceTarget,
    projectId: string,
    relativePath: string
  ) => Promise<void>;
  removeWorkspaceTaskBoardPosition: (
    target: WorkspaceTarget,
    projectId: string,
    pathName: string
  ) => Promise<void>;
  writeWorkspaceTextFileOperation: (
    target: WorkspaceTarget,
    projectId: string,
    relativePath: string,
    content: string
  ) => Promise<void>;
  writeWorkspaceBinaryFileOperation: (
    target: WorkspaceTarget,
    projectId: string,
    relativePath: string,
    content: Buffer
  ) => Promise<void>;
  createWorkspaceDirectoryOperation: (
    target: WorkspaceTarget,
    projectId: string,
    relativePath: string
  ) => Promise<void>;
  discardWorkspaceChangeOperation: (
    target: WorkspaceTarget,
    relativePath: string,
    gitStatus: string
  ) => Promise<void>;
}

export interface WorkspaceMutationHelpers {
  createWorkspaceDirectory: (payload: CreateWorkspaceDirectoryPayload) => Promise<AppState>;
  moveWorkspaceFile: (payload: { projectId: string; fromPath: string; toPath: string; rootPath?: string }) => Promise<AppState>;
  deleteWorkspaceFile: (payload: WorkspaceFileRequest) => Promise<AppState>;
  writeWorkspaceFile: (payload: WriteWorkspaceFilePayload) => Promise<AppState>;
  importWorkspaceBinaryFile: (payload: { projectId: string; path: string; content: Buffer; rootPath?: string }) => Promise<AppState>;
  selectChange: (pathName: string) => AppState;
  discardChange: (pathName: string) => Promise<AppState>;
  inspectCommit: (hash: string) => Promise<AppState>;
  clearCommitInspection: () => Promise<AppState>;
}
