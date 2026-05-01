import type {
  AppState,
  ImportedContextBundleSummary,
  TerminalPreset,
  WorkspaceGitStatusSummary,
  WorkspaceNoteSummary,
  WorkspacePathStatResult,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary
} from "@shared/appTypes";
import type { WorkspaceImageFileContent } from "@shared/types/workspaceFile.types";
import { createWorkspaceActions } from "./workspaceActions";

export abstract class WorkspaceActionsApiBase {
  protected abstract getWorkspaceActions(): ReturnType<typeof createWorkspaceActions>;

  async readWorkspaceFile(payload: { projectId: string; path: string; rootPath?: string }): Promise<string> {
    return this.getWorkspaceActions().readWorkspaceFile(payload);
  }

  async resolveWorkspaceStatePath(payload: { projectId: string; path: string; rootPath?: string }): Promise<string> {
    return this.getWorkspaceActions().resolveWorkspaceStatePath(payload);
  }

  async readWorkspaceImageFile(payload: { projectId: string; path: string; rootPath?: string }): Promise<WorkspaceImageFileContent> {
    return this.getWorkspaceActions().readWorkspaceImageFile(payload);
  }

  async listWorkspaceFiles(projectId: string, rootPath?: string): Promise<string[]> {
    return this.getWorkspaceActions().listWorkspaceFiles(projectId, rootPath);
  }

  async listWorkspaceDirectories(projectId: string, rootPath?: string): Promise<string[]> {
    return this.getWorkspaceActions().listWorkspaceDirectoriesByProject(projectId, rootPath);
  }

  async listWorkspaceSpecs(projectId: string): Promise<WorkspaceSpecSummary[]> {
    return this.getWorkspaceActions().listWorkspaceSpecsByProject(projectId);
  }

  async listWorkspaceNotes(projectId: string): Promise<WorkspaceNoteSummary[]> {
    return this.getWorkspaceActions().listWorkspaceNotesByProject(projectId);
  }

  async searchWorkspaceFiles(payload: WorkspaceSearchRequest): Promise<WorkspaceSearchResult[]> {
    return this.getWorkspaceActions().searchWorkspaceFilesByProject(payload);
  }

  async listImportedContextBundles(projectId: string, rootPath?: string): Promise<ImportedContextBundleSummary[]> {
    return this.getWorkspaceActions().listImportedContextBundlesByProject(projectId, rootPath);
  }

  async statWorkspacePath(payload: { projectId: string; path: string; rootPath?: string }): Promise<WorkspacePathStatResult> {
    return this.getWorkspaceActions().statWorkspacePathByProject(payload);
  }

  async getWorkspaceGitStatusSummary(payload: { projectId: string; rootPath?: string }): Promise<WorkspaceGitStatusSummary> {
    return this.getWorkspaceActions().getWorkspaceGitStatusSummary(payload);
  }

  async listWorkspaceTasks(projectId: string): Promise<WorkspaceTaskSummary[]> {
    return this.getWorkspaceActions().listWorkspaceTasksByProject(projectId);
  }

  async getWorkspaceTaskBoard(projectId: string): Promise<WorkspaceTaskBoard> {
    return this.getWorkspaceActions().getWorkspaceTaskBoard(projectId);
  }

  async saveWorkspaceTaskBoard(projectId: string, board: WorkspaceTaskBoard): Promise<WorkspaceTaskBoard> {
    return this.getWorkspaceActions().saveWorkspaceTaskBoard(projectId, board);
  }

  async createWorkspaceTask(projectId: string, taskDescription: string): Promise<AppState> {
    return this.getWorkspaceActions().createWorkspaceTask(projectId, taskDescription);
  }

  async getWorkspaceSplitViews(projectId: string): Promise<WorkspaceSplitViewCollection> {
    return this.getWorkspaceActions().getWorkspaceSplitViews(projectId);
  }

  async saveWorkspaceSplitViews(
    projectId: string,
    collection: WorkspaceSplitViewCollection
  ): Promise<WorkspaceSplitViewCollection> {
    return this.getWorkspaceActions().saveWorkspaceSplitViews(projectId, collection);
  }

  async saveWorkspaceTerminalPresets(projectId: string, presets: TerminalPreset[]): Promise<AppState> {
    return this.getWorkspaceActions().saveWorkspaceTerminalPresets(projectId, presets);
  }
}
