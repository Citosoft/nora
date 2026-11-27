import type {
  AppState,
  ExternalHarnessContextRef,
  ProjectSummary,
  ProjectVersionControl,
  WorkspaceGitStatusSummary,
  SetWorkspaceUpstreamPayload,
  SelectChangesCheckoutPayload,
  WorkspaceNoteSummary,
  WorkspacePathStatResult,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary
} from "@shared/appTypes";
import { selectChangesCheckout } from "./changesCheckout";
import { createWorkspaceProjectSettingsActions } from "./workspaceProjectSettings";
import { randomUUID } from "node:crypto";
import { assertGitProject, isGitProject } from "@shared/projectVersionControl";
import { createTaskDraft, deriveTaskTitle } from "@shared/taskDraft";
import { resolveWorkspaceFileViewKind } from "@shared/workspaceFileViewKind";
import type { WorkspaceImageFileContent } from "@shared/types/workspaceFile.types";
import { pickWorkspaceLogoPaths } from "../helpers/workspaceLogo";
import type { WorkspaceTarget } from "../types/internal.types";
import {
  listRemoteTrackingBranches,
  resolveGitTrackingBranch,
  setGitTrackingBranch
} from "../helpers/gitTrackingBranch";

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
  resolveLocalWorkspaceFilePath: (target: WorkspaceTarget, projectId: string, filePath: string) => Promise<string>;
  getWorkspaceImageMimeType: (filePath: string) => string;
  listWorkspaceFilePaths: (target: WorkspaceTarget, versionControl: ProjectVersionControl) => Promise<string[]>;
  listWorkspaceDirectories: (target: WorkspaceTarget, versionControl: ProjectVersionControl) => Promise<string[]>;
  listWorkspaceSpecs: (target: WorkspaceTarget, projectId: string) => Promise<WorkspaceSpecSummary[]>;
  listWorkspaceNotes: (target: WorkspaceTarget, projectId: string) => Promise<WorkspaceNoteSummary[]>;
  searchWorkspaceFiles: (
    target: WorkspaceTarget,
    query: string,
    caseSensitive: boolean,
    versionControl: ProjectVersionControl
  ) => Promise<WorkspaceSearchResult[]>;
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
  archiveExternalHarnessThread: (projectId: string, ref: ExternalHarnessContextRef, archivedAt: string) => Promise<void>;
  saveProject: (project: ProjectSummary) => Promise<void>;
};

/** Logos are shown at avatar size; anything larger is artwork, not an icon, and not worth sending over IPC. */
const MAX_WORKSPACE_LOGO_BYTES = 512 * 1024;

const EMPTY_WORKSPACE_GIT_STATUS_SUMMARY: WorkspaceGitStatusSummary = {
  branch: null,
  upstreamBranch: null,
  hasConfiguredUpstream: false,
  remoteBranches: [],
  aheadCount: 0,
  behindCount: 0,
  lines: [],
  truncated: false
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

  /** The project's own logo for its avatar, or null when none is found; never throws. */
  const readWorkspaceLogo = async (projectId: string): Promise<WorkspaceImageFileContent | null> => {
    try {
      const project = await deps.resolveProjectSummaryById(projectId);
      const target = deps.getProjectTarget(project);
      for (const path of pickWorkspaceLogoPaths(await deps.listWorkspaceFilePaths(target, project.versionControl))) {
        try {
          const fileBuffer = await deps.readWorkspaceBinaryFile(target, project.id, path);
          if (!fileBuffer.length || fileBuffer.length > MAX_WORKSPACE_LOGO_BYTES) continue;
          const mimeType = deps.getWorkspaceImageMimeType(path);
          return { mimeType, dataUrl: `data:${mimeType};base64,${fileBuffer.toString("base64")}` };
        } catch { continue; }
      }
    } catch { /* An unavailable or remote-disconnected workspace simply keeps its initials. */ }
    return null;
  };

  const resolveWorkspaceFileForExternalOpen = async (payload: { projectId: string; path: string; rootPath?: string }): Promise<string> => {
    // Only document formats Nora cannot render may be handed to the OS, so this can never launch scripts or apps.
    if (resolveWorkspaceFileViewKind(payload.path) !== "external") {
      throw new Error(`Nora only opens document files such as PDFs in the default app, not ${payload.path}.`);
    }
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    return deps.resolveLocalWorkspaceFilePath(deps.resolveWorkspaceFileTarget(project, payload.rootPath), project.id, payload.path);
  };

  const listWorkspaceFiles = async (projectId: string, rootPath?: string): Promise<string[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.listWorkspaceFilePaths(deps.resolveWorkspaceFileTarget(project, rootPath), project.versionControl);
  };

  const listWorkspaceDirectoriesByProject = async (projectId: string, rootPath?: string): Promise<string[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.listWorkspaceDirectories(deps.resolveWorkspaceFileTarget(project, rootPath), project.versionControl);
  };

  const archiveExternalHarnessThreadByProject = async (
    projectId: string,
    ref: ExternalHarnessContextRef
  ): Promise<void> => {
    await deps.resolveProjectSummaryById(projectId);
    await deps.archiveExternalHarnessThread(projectId, ref, deps.nowIso());
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
      payload.caseSensitive === true,
      project.versionControl
    );
  };

  const statWorkspacePathByProject = async (payload: { projectId: string; path: string; rootPath?: string }): Promise<WorkspacePathStatResult> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    return deps.statWorkspacePath(deps.resolveWorkspaceFileTarget(project, payload.rootPath), project.id, payload.path);
  };

  const getWorkspaceGitStatusSummary = async (payload: { projectId: string; rootPath?: string }): Promise<WorkspaceGitStatusSummary> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    if (!isGitProject(project)) {
      return EMPTY_WORKSPACE_GIT_STATUS_SUMMARY;
    }
    const target = deps.resolveWorkspaceFileTarget(project, payload.rootPath);
    try {
      const { stdout: branchStdout } = await deps.execGit(target, ["rev-parse", "--abbrev-ref", "HEAD"], 64 * 1024);
      const branch = branchStdout.trim() || null;
      let upstreamBranch: string | null = null;
      let hasConfiguredUpstream = false;
      let aheadCount = 0;
      let behindCount = 0;
      try {
        const trackingBranch = branch
          ? await resolveGitTrackingBranch(target, deps.execGit, branch)
          : null;
        upstreamBranch = trackingBranch?.ref ?? null;
        hasConfiguredUpstream = trackingBranch?.configured ?? false;
        if (trackingBranch) {
          const { stdout: countsStdout } = await deps.execGit(
            target,
            ["rev-list", "--left-right", "--count", `${trackingBranch.ref}...HEAD`],
            64 * 1024
          );
          const [behindRaw = "0", aheadRaw = "0"] = countsStdout.trim().split(/\s+/);
          behindCount = Number.parseInt(behindRaw, 10);
          aheadCount = Number.parseInt(aheadRaw, 10);
          if (!Number.isFinite(behindCount)) {
            behindCount = 0;
          }
          if (!Number.isFinite(aheadCount)) {
            aheadCount = 0;
          }
        }
      } catch {
        upstreamBranch = null;
        aheadCount = 0;
        behindCount = 0;
      }
      const { stdout: statusStdout } = await deps.execGit(target, ["status", "--short"], 1024 * 1024);
      const remoteBranches = await listRemoteTrackingBranches(target, deps.execGit).catch(() => []);
      const rawLines = statusStdout.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean);
      const truncated = rawLines.length > deps.maxWorkspaceGitStatusLines;
      const lines = rawLines.slice(0, deps.maxWorkspaceGitStatusLines);
      return { branch, upstreamBranch, hasConfiguredUpstream, remoteBranches, aheadCount, behindCount, lines, truncated };
    } catch {
      return EMPTY_WORKSPACE_GIT_STATUS_SUMMARY;
    }
  };

  const checkoutWorkspaceBranch = async (payload: {
    projectId: string;
    branch: string;
    rootPath?: string;
  }): Promise<AppState> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    assertGitProject(project);
    const target = deps.resolveWorkspaceFileTarget(project, payload.rootPath);
    const branch = payload.branch.trim();
    if (!branch) {
      throw new Error("Choose a branch to check out.");
    }

    await deps.execGit(target, ["checkout", branch], 64 * 1024);
    return deps.refreshProjectState();
  };

  const selectChangesCheckoutForProject = async (payload: SelectChangesCheckoutPayload): Promise<AppState> => {
    if (deps.getSnapshot().project?.id !== payload.projectId) {
      throw new Error("Open this project before choosing which checkout to review.");
    }
    deps.updateState((currentState) => selectChangesCheckout(currentState, payload.path));
    return deps.refreshProjectState();
  };

  const setWorkspaceUpstream = async (payload: SetWorkspaceUpstreamPayload): Promise<WorkspaceGitStatusSummary> => {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    assertGitProject(project);
    const target = deps.resolveWorkspaceFileTarget(project, payload.rootPath);
    const remoteBranch = payload.remoteBranch.trim();
    const { stdout } = await deps.execGit(target, ["rev-parse", "--abbrev-ref", "HEAD"], 64 * 1024);
    const branch = stdout.trim();
    if (!branch || branch === "HEAD") {
      throw new Error("Check out a local branch before setting an upstream.");
    }

    await setGitTrackingBranch(target, deps.execGit, branch, remoteBranch);
    return getWorkspaceGitStatusSummary(payload);
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

  /** Writes a task file under `.nora/tasks` and places it on the board; returns its workspace-relative path. */
  const writeWorkspaceTask = async (project: Awaited<ReturnType<typeof deps.resolveProjectSummaryById>>, title: string, content: string): Promise<string> => {
    const slug = deps.slugify(title) || "task";
    const taskPath = `.nora/tasks/${slug}-${Date.now().toString(36)}.md`;
    const target = deps.getProjectTarget(project);
    await deps.writeWorkspaceTextFile(target, project.id, taskPath, content);
    const board = await deps.readWorkspaceTaskBoard(target, project.id);
    await deps.writeWorkspaceTaskBoard(target, project.id, deps.addTaskToWorkspaceTaskBoard(board, taskPath), [
      ...(await deps.listWorkspaceTaskPaths(target, project.id)),
      taskPath
    ]);
    return taskPath;
  };

  const createWorkspaceTaskFile = async (projectId: string, title: string, content: string): Promise<string> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    if (!title.trim()) throw new Error("Task title cannot be empty.");
    const taskPath = await writeWorkspaceTask(project, title.trim(), content);
    await deps.refreshWorkspaceSummaries("createWorkspaceTaskFile");
    return taskPath;
  };

  const createWorkspaceTask = async (projectId: string, taskDescription: string): Promise<AppState> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    const trimmedDescription = taskDescription.trim();
    if (!trimmedDescription) {
      throw new Error("Task description cannot be empty.");
    }

    const title = deriveTaskTitle(createTaskDraft(trimmedDescription), trimmedDescription);
    const taskPath = await writeWorkspaceTask(project, title, createTaskDraft(title));

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

  const projectSettings = createWorkspaceProjectSettingsActions({ ...deps, createId: randomUUID });

  return {
    readWorkspaceFile,
    resolveWorkspaceStatePath,
    readWorkspaceImageFile,
    readWorkspaceLogo,
    resolveWorkspaceFileForExternalOpen,
    listWorkspaceFiles,
    archiveExternalHarnessThreadByProject,
    listWorkspaceDirectoriesByProject,
    listWorkspaceSpecsByProject,
    listWorkspaceNotesByProject,
    searchWorkspaceFilesByProject,
    statWorkspacePathByProject,
    getWorkspaceGitStatusSummary,
    checkoutWorkspaceBranch,
    selectChangesCheckout: selectChangesCheckoutForProject,
    setWorkspaceUpstream,
    listWorkspaceTasksByProject,
    getWorkspaceTaskBoard,
    saveWorkspaceTaskBoard,
    createWorkspaceTask,
    createWorkspaceTaskFile,
    getWorkspaceSplitViews,
    saveWorkspaceSplitViews,
    ...projectSettings
  };
}
