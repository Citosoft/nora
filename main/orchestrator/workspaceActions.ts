import type {
  AppState,
  ProjectSummary,
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
import { createTaskDraft, deriveTaskTitle } from "@shared/taskDraft";
import type { WorkspaceImageFileContent } from "@shared/types/workspaceFile.types";
import fs from "node:fs/promises";
import { getProjectFile } from "../noraPaths";
import type { WorkspaceTarget } from "../types/internal.types";

export type WorkspaceActionsDependencies = {
  resolveProjectSummaryById: (projectId: string) => Promise<ProjectSummary>;
  resolveWorkspaceFileTarget: (project: ProjectSummary, rootPath?: string) => WorkspaceTarget;
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  getSnapshot: () => AppState;
  setState: (partial: Partial<AppState>) => void;
  updateState: (updater: (state: AppState) => AppState) => void;
  refreshProjectState: () => Promise<AppState>;
  refreshWorkspaceSummaries: (reason: string) => Promise<void>;
  nowIso: () => string;
  slugify: (value: string) => string;
  maxWorkspaceGitStatusLines: number;
  readWorkspaceTextFile: (target: WorkspaceTarget, projectId: string, filePath: string) => Promise<string>;
  resolveExistingWorkspaceAbsolutePath: (target: WorkspaceTarget, projectId: string, filePath: string) => Promise<string>;
  readWorkspaceBinaryFile: (target: WorkspaceTarget, projectId: string, filePath: string) => Promise<Buffer>;
  getWorkspaceImageMimeType: (filePath: string) => string;
  listWorkspaceTrackedAndUntrackedFiles: (target: WorkspaceTarget) => Promise<string[]>;
  listWorkspaceDirectories: (target: WorkspaceTarget) => Promise<string[]>;
  listWorkspaceSpecs: (target: WorkspaceTarget, projectId: string) => Promise<WorkspaceSpecSummary[]>;
  listWorkspaceNotes: (target: WorkspaceTarget, projectId: string) => Promise<WorkspaceNoteSummary[]>;
  searchWorkspaceFiles: (target: WorkspaceTarget, query: string, caseSensitive: boolean) => Promise<WorkspaceSearchResult[]>;
  statWorkspacePath: (target: WorkspaceTarget, projectId: string, filePath: string) => Promise<WorkspacePathStatResult>;
  execGit: (target: WorkspaceTarget, args: string[], maxBuffer?: number) => Promise<{ stdout: string; stderr: string }>;
  listWorkspaceTasks: (target: WorkspaceTarget, projectId: string) => Promise<WorkspaceTaskSummary[]>;
  readWorkspaceTaskBoard: (target: WorkspaceTarget, projectId: string) => Promise<WorkspaceTaskBoard>;
  writeWorkspaceTaskBoard: (
    target: WorkspaceTarget,
    projectId: string,
    board: WorkspaceTaskBoard,
    orderingPaths?: string[]
  ) => Promise<WorkspaceTaskBoard>;
  writeWorkspaceTextFile: (target: WorkspaceTarget, projectId: string, filePath: string, content: string) => Promise<void>;
  addTaskToWorkspaceTaskBoard: (board: WorkspaceTaskBoard, taskPath: string) => WorkspaceTaskBoard;
  listWorkspaceTaskPaths: (target: WorkspaceTarget, projectId: string) => Promise<string[]>;
  readWorkspaceSplitViewCollection: (target: WorkspaceTarget, projectId: string) => Promise<WorkspaceSplitViewCollection>;
  writeWorkspaceSplitViewCollection: (
    target: WorkspaceTarget,
    projectId: string,
    collection: WorkspaceSplitViewCollection
  ) => Promise<WorkspaceSplitViewCollection>;
  saveProject: (project: ProjectSummary) => Promise<void>;
};

export function createWorkspaceActions(deps: WorkspaceActionsDependencies) {
  const readWorkspaceFile = async (payload: { projectId: string; path: string; rootPath?: string }): Promise<string> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    return deps.readWorkspaceTextFile(deps.resolveWorkspaceFileTarget(project, payload.rootPath), project.id, payload.path);
  };

  const resolveWorkspaceStatePath = async (payload: { projectId: string; path: string; rootPath?: string }): Promise<string> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    return deps.resolveExistingWorkspaceAbsolutePath(
      deps.resolveWorkspaceFileTarget(project, payload.rootPath),
      project.id,
      payload.path
    );
  };

  const readWorkspaceImageFile = async (payload: { projectId: string; path: string; rootPath?: string }): Promise<WorkspaceImageFileContent> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    const fileBuffer = await deps.readWorkspaceBinaryFile(deps.resolveWorkspaceFileTarget(project, payload.rootPath), project.id, payload.path);
    const mimeType = deps.getWorkspaceImageMimeType(payload.path);
    return {
      mimeType,
      dataUrl: `data:${mimeType};base64,${fileBuffer.toString("base64")}`
    };
  };

  const listWorkspaceFiles = async (projectId: string, rootPath?: string): Promise<string[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.listWorkspaceTrackedAndUntrackedFiles(deps.resolveWorkspaceFileTarget(project, rootPath));
  };

  const listWorkspaceDirectoriesByProject = async (projectId: string, rootPath?: string): Promise<string[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.listWorkspaceDirectories(deps.resolveWorkspaceFileTarget(project, rootPath));
  };

  const listWorkspaceSpecsByProject = async (projectId: string): Promise<WorkspaceSpecSummary[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.listWorkspaceSpecs(deps.getProjectTarget(project), project.id);
  };

  const listWorkspaceNotesByProject = async (projectId: string): Promise<WorkspaceNoteSummary[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.listWorkspaceNotes(deps.getProjectTarget(project), project.id);
  };

  const searchWorkspaceFilesByProject = async (payload: WorkspaceSearchRequest): Promise<WorkspaceSearchResult[]> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    return deps.searchWorkspaceFiles(
      deps.resolveWorkspaceFileTarget(project, payload.rootPath),
      payload.query,
      payload.caseSensitive === true
    );
  };

  const statWorkspacePathByProject = async (payload: { projectId: string; path: string; rootPath?: string }): Promise<WorkspacePathStatResult> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    return deps.statWorkspacePath(deps.resolveWorkspaceFileTarget(project, payload.rootPath), project.id, payload.path);
  };

  const getWorkspaceGitStatusSummary = async (payload: { projectId: string; rootPath?: string }): Promise<WorkspaceGitStatusSummary> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    const target = deps.resolveWorkspaceFileTarget(project, payload.rootPath);
    try {
      const { stdout: branchStdout } = await deps.execGit(target, ["rev-parse", "--abbrev-ref", "HEAD"], 64 * 1024);
      const branch = branchStdout.trim() || null;
      const { stdout: statusStdout } = await deps.execGit(target, ["status", "--short"], 1024 * 1024);
      const rawLines = statusStdout.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean);
      const truncated = rawLines.length > deps.maxWorkspaceGitStatusLines;
      const lines = rawLines.slice(0, deps.maxWorkspaceGitStatusLines);
      return { branch, lines, truncated };
    } catch {
      return { branch: null, lines: [], truncated: false };
    }
  };

  const listWorkspaceTasksByProject = async (projectId: string): Promise<WorkspaceTaskSummary[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.listWorkspaceTasks(deps.getProjectTarget(project), project.id);
  };

  const getWorkspaceTaskBoard = async (projectId: string): Promise<WorkspaceTaskBoard> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.readWorkspaceTaskBoard(deps.getProjectTarget(project), project.id);
  };

  const saveWorkspaceTaskBoard = async (projectId: string, board: WorkspaceTaskBoard): Promise<WorkspaceTaskBoard> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.writeWorkspaceTaskBoard(deps.getProjectTarget(project), project.id, board);
  };

  const createWorkspaceTask = async (projectId: string, taskDescription: string): Promise<AppState> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    const trimmedDescription = taskDescription.trim();
    if (!trimmedDescription) {
      throw new Error("Task description cannot be empty.");
    }

    const title = deriveTaskTitle(createTaskDraft(trimmedDescription), trimmedDescription);
    const slug = deps.slugify(title) || "task";
    const taskPath = `.nora/tasks/${slug}-${Date.now().toString(36)}.md`;
    const target = deps.getProjectTarget(project);

    await deps.writeWorkspaceTextFile(target, project.id, taskPath, createTaskDraft(title));
    const board = await deps.readWorkspaceTaskBoard(target, project.id);
    await deps.writeWorkspaceTaskBoard(target, project.id, deps.addTaskToWorkspaceTaskBoard(board, taskPath), [
      ...(await deps.listWorkspaceTaskPaths(target, project.id)),
      taskPath
    ]);

    if (deps.getSnapshot().project?.id === project.id) {
      deps.setState({
        selectedChangePath: taskPath,
        errorMessage: null
      });
    }

    await deps.refreshWorkspaceSummaries("createWorkspaceTask");
    return deps.getSnapshot();
  };

  const getWorkspaceSplitViews = async (projectId: string): Promise<WorkspaceSplitViewCollection> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.readWorkspaceSplitViewCollection(deps.getProjectTarget(project), project.id);
  };

  const saveWorkspaceSplitViews = async (
    projectId: string,
    collection: WorkspaceSplitViewCollection
  ): Promise<WorkspaceSplitViewCollection> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.writeWorkspaceSplitViewCollection(deps.getProjectTarget(project), project.id, collection);
  };

  const saveWorkspaceTerminalPresets = async (projectId: string, presets: TerminalPreset[]): Promise<AppState> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    const updatedProject: ProjectSummary = {
      ...project,
      workspaceTerminalPresets: presets,
      updatedAt: deps.nowIso()
    };

    await deps.saveProject(updatedProject);
    await fs.writeFile(getProjectFile(updatedProject.id), JSON.stringify(updatedProject, null, 2), "utf8");

    deps.updateState((currentState) => ({
      ...currentState,
      project: currentState.project?.id === updatedProject.id ? updatedProject : currentState.project,
      workspaces: currentState.workspaces.map((workspace) =>
        workspace.project.id === updatedProject.id
          ? {
              ...workspace,
              project: updatedProject
            }
          : workspace
      )
    }));

    return deps.refreshProjectState();
  };

  return {
    readWorkspaceFile,
    resolveWorkspaceStatePath,
    readWorkspaceImageFile,
    listWorkspaceFiles,
    listWorkspaceDirectoriesByProject,
    listWorkspaceSpecsByProject,
    listWorkspaceNotesByProject,
    searchWorkspaceFilesByProject,
    statWorkspacePathByProject,
    getWorkspaceGitStatusSummary,
    listWorkspaceTasksByProject,
    getWorkspaceTaskBoard,
    saveWorkspaceTaskBoard,
    createWorkspaceTask,
    getWorkspaceSplitViews,
    saveWorkspaceSplitViews,
    saveWorkspaceTerminalPresets
  };
}
