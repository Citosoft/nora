import type {
  AgentContextSelection,
  AppState,
  CommitChangesPayload,
  CreateWorkspaceDirectoryPayload,
  ExternalHarnessContextRef,
  ExternalHarnessSessionSummary,
  ImportedContextBundleSummary,
  NoraDetectableContextBundleSummary,
  TerminalPreset,
  WorkspaceFileRequest,
  WorkspaceGitStatusSummary,
  WorkspaceNoteSummary,
  WorkspacePathStatResult,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary,
  WriteWorkspaceFilePayload
} from "@shared/appTypes";
import type { WorkspaceImageFileContent } from "@shared/types/workspaceFile.types";
import type { WorkspaceService } from "../../types/mainServices.types";
import {
  deleteNoraWorktreeContextBundleFile,
  importNoraWorktreeContextBundleIntoCheckout,
  listNoraWorktreeDetectableContextBundles,
  readNoraWorktreeContextBundleUtf8
} from "../noraDetectableContextBundles";
import type { WorkspaceMainServiceDeps } from "./workspaceMainService.types";

export class WorkspaceMainService implements WorkspaceService {
  constructor(private readonly d: WorkspaceMainServiceDeps) {}

  private actions = () => this.d.getWorkspaceActions();

  selectProject = (projectRoot: string): Promise<AppState> => this.d.navigation.selectProject(projectRoot);

  focusWorkspace = (projectId: string): Promise<AppState> => this.d.navigation.focusWorkspace(projectId);

  closeProject = (): Promise<AppState> => this.d.lifecycle.closeProject();

  removeProject = (projectRoot: string): Promise<AppState> => this.d.lifecycle.removeProject(projectRoot);

  openDirectSshProject = (payload: {
    host: string;
    user?: string;
    port?: number | null;
    remotePath: string;
    alias?: string;
  }): Promise<AppState> => this.d.navigation.openDirectSshProject(payload);

  removeProjectsWithinMount = (mountPoint: string, relatedMountRoots: string[] = []): Promise<void> =>
    this.d.lifecycle.removeProjectsWithinMount(mountPoint, relatedMountRoots);

  refreshProjectState = (): Promise<AppState> => this.d.refresh.refreshProjectState();

  resetWorkspaces = (): Promise<AppState> => this.d.lifecycle.resetWorkspaces();

  readWorkspaceFile = (payload: WorkspaceFileRequest): Promise<string> => this.actions().readWorkspaceFile(payload);

  resolveWorkspaceStatePath = (payload: WorkspaceFileRequest): Promise<string> =>
    this.actions().resolveWorkspaceStatePath(payload);

  readWorkspaceImageFile = (payload: WorkspaceFileRequest): Promise<WorkspaceImageFileContent> =>
    this.actions().readWorkspaceImageFile(payload);

  listWorkspaceFiles = (projectId: string, rootPath?: string): Promise<string[]> =>
    this.actions().listWorkspaceFiles(projectId, rootPath);

  listWorkspaceDirectories = (projectId: string, rootPath?: string): Promise<string[]> =>
    this.actions().listWorkspaceDirectoriesByProject(projectId, rootPath);

  listWorkspaceSpecs = (projectId: string): Promise<WorkspaceSpecSummary[]> =>
    this.actions().listWorkspaceSpecsByProject(projectId);

  listWorkspaceNotes = (projectId: string): Promise<WorkspaceNoteSummary[]> =>
    this.actions().listWorkspaceNotesByProject(projectId);

  searchWorkspaceFiles = (payload: WorkspaceSearchRequest): Promise<WorkspaceSearchResult[]> =>
    this.actions().searchWorkspaceFilesByProject(payload);

  listImportedContextBundles = (projectId: string, rootPath?: string): Promise<ImportedContextBundleSummary[]> =>
    this.actions().listImportedContextBundlesByProject(projectId, rootPath);

  listExternalHarnessContextSessions = (
    projectId: string,
    rootPath?: string
  ): Promise<ExternalHarnessSessionSummary[]> =>
    this.actions().listExternalHarnessContextSessionsByProject(projectId, rootPath);

  composeExternalHarnessContextSelections = (
    projectId: string,
    ref: ExternalHarnessContextRef
  ): Promise<AgentContextSelection[]> => this.actions().composeExternalHarnessContextSelectionsByProject(projectId, ref);

  listNoraDetectableContextBundles = (
    projectId: string,
    sessionId: string,
    worktreeId: string
  ): Promise<NoraDetectableContextBundleSummary[]> =>
    listNoraWorktreeDetectableContextBundles(projectId, sessionId, worktreeId);

  importNoraDetectableContextBundle = (payload: {
    projectId: string;
    sessionId: string;
    worktreeId: string;
    bundleId: string;
    workspaceRoot: string;
  }): Promise<string | null> => importNoraWorktreeContextBundleIntoCheckout(payload);

  readNoraDetectableContextBundle = (payload: {
    projectId: string;
    sessionId: string;
    worktreeId: string;
    bundleId: string;
  }): Promise<string | null> => readNoraWorktreeContextBundleUtf8(payload);

  deleteNoraDetectableContextBundle = (payload: {
    projectId: string;
    sessionId: string;
    worktreeId: string;
    bundleId: string;
  }): Promise<boolean> => deleteNoraWorktreeContextBundleFile(payload);

  statWorkspacePath = (payload: WorkspaceFileRequest): Promise<WorkspacePathStatResult> =>
    this.actions().statWorkspacePathByProject(payload);

  getWorkspaceGitStatusSummary = (payload: {
    projectId: string;
    rootPath?: string;
  }): Promise<WorkspaceGitStatusSummary> => this.actions().getWorkspaceGitStatusSummary(payload);

  listWorkspaceTasks = (projectId: string): Promise<WorkspaceTaskSummary[]> =>
    this.actions().listWorkspaceTasksByProject(projectId);

  getWorkspaceTaskBoard = (projectId: string): Promise<WorkspaceTaskBoard> =>
    this.actions().getWorkspaceTaskBoard(projectId);

  saveWorkspaceTaskBoard = (projectId: string, board: WorkspaceTaskBoard): Promise<WorkspaceTaskBoard> =>
    this.actions().saveWorkspaceTaskBoard(projectId, board);

  createWorkspaceTask = (projectId: string, taskDescription: string): Promise<AppState> =>
    this.actions().createWorkspaceTask(projectId, taskDescription);

  getWorkspaceSplitViews = (projectId: string): Promise<WorkspaceSplitViewCollection> =>
    this.actions().getWorkspaceSplitViews(projectId);

  saveWorkspaceSplitViews = (
    projectId: string,
    collection: WorkspaceSplitViewCollection
  ): Promise<WorkspaceSplitViewCollection> => this.actions().saveWorkspaceSplitViews(projectId, collection);

  saveWorkspaceTerminalPresets = (projectId: string, presets: TerminalPreset[]): Promise<AppState> =>
    this.actions().saveWorkspaceTerminalPresets(projectId, presets);

  createWorkspaceDirectory = (payload: CreateWorkspaceDirectoryPayload): Promise<AppState> =>
    this.d.mutations.createWorkspaceDirectory(payload);

  moveWorkspaceFile = (payload: {
    projectId: string;
    fromPath: string;
    toPath: string;
    rootPath?: string;
  }): Promise<AppState> => this.d.mutations.moveWorkspaceFile(payload);

  deleteWorkspaceFile = (payload: WorkspaceFileRequest): Promise<AppState> =>
    this.d.mutations.deleteWorkspaceFile(payload);

  writeWorkspaceFile = (payload: WriteWorkspaceFilePayload): Promise<AppState> =>
    this.d.mutations.writeWorkspaceFile(payload);

  importWorkspaceBinaryFile = (payload: {
    projectId: string;
    path: string;
    content: Buffer;
    rootPath?: string;
  }): Promise<AppState> => this.d.mutations.importWorkspaceBinaryFile(payload);

  selectChange = (pathName: string): AppState => this.d.mutations.selectChange(pathName);

  discardChange = (pathName: string): Promise<AppState> => this.d.mutations.discardChange(pathName);

  inspectCommit = (hash: string): Promise<AppState> => this.d.mutations.inspectCommit(hash);

  clearCommitInspection = (): Promise<AppState> => this.d.mutations.clearCommitInspection();

  commitChanges = (payload: CommitChangesPayload): Promise<AppState> => this.d.commitChanges(payload);

  pullChanges = (): Promise<AppState> => this.d.pullChanges();

  pushChanges = (): Promise<AppState> => this.d.pushChanges();
}
