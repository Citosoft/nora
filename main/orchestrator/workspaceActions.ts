import type {
  AgentContextSelection,
  AppState,
  ExternalHarnessContextRef,
  ExternalHarnessSessionSummary,
  ImportedContextBundleSummary,
  ProjectSummary,
  ProjectVersionControl,
  TerminalPreset,
  WorkspaceGitStatusSummary,
  SetWorkspaceUpstreamPayload,
  WorkspaceNoteSummary,
  WorkspacePathStatResult,
  WorkspaceSearchRequest,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary
} from "@shared/appTypes";
import { assertGitProject, isGitProject } from "@shared/projectVersionControl";
import { createTaskDraft, deriveTaskTitle } from "@shared/taskDraft";
import { resolveWorkspaceFileViewKind } from "@shared/workspaceFileViewKind";
import type { WorkspaceImageFileContent } from "@shared/types/workspaceFile.types";
import fs from "node:fs/promises";
import { getProjectFile } from "../noraPaths";
import type { WorkspaceTarget } from "../types/internal.types";
import {
  listRemoteTrackingBranches,
  resolveGitTrackingBranch,
  setGitTrackingBranch
} from "../helpers/gitTrackingBranch";
import {
  composeExternalHarnessContextSelections,
  listExternalHarnessContextSessions,
  resolveWorktreeIdForWorkspacePath
} from "./harness-context/listExternalHarnessContextSessions";

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
  listImportedContextBundles: (target: WorkspaceTarget, projectId: string) => Promise<ImportedContextBundleSummary[]>;
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
  listArchivedExternalHarnessThreadKeys: (projectId: string) => Promise<Set<string>>;
  archiveExternalHarnessThread: (projectId: string, ref: ExternalHarnessContextRef, archivedAt: string) => Promise<void>;
  saveProject: (project: ProjectSummary) => Promise<void>;
};

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

  const listImportedContextBundlesByProject = async (
    projectId: string,
    rootPath?: string
  ): Promise<ImportedContextBundleSummary[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.listImportedContextBundles(deps.resolveWorkspaceFileTarget(project, rootPath), project.id);
  };

  const listExternalHarnessContextSessionsByProject = async (
    projectId: string,
    rootPath?: string
  ): Promise<ExternalHarnessSessionSummary[]> => {
    const project = await deps.resolveProjectSummaryById(projectId);
    const target = deps.resolveWorkspaceFileTarget(project, rootPath);
    const snapshot = deps.getSnapshot();
    const worktreeId =
      resolveWorktreeIdForWorkspacePath(snapshot, project.id, target.path) ??
      snapshot.worktrees.find((worktree) => worktree.projectId === project.id)?.id ??
      "";
    return listExternalHarnessContextSessions({
      workspaceAbsolutePath: target.path,
      projectId: project.id,
      worktreeId,
      agents: snapshot.agents,
      agentCatalog: snapshot.agentCatalog,
      archivedThreadKeys: await deps.listArchivedExternalHarnessThreadKeys(project.id),
      isRemoteWorkspace: target.location?.kind === "ssh"
    });
  };

  const archiveExternalHarnessThreadByProject = async (
    projectId: string,
    ref: ExternalHarnessContextRef
  ): Promise<void> => {
    await deps.resolveProjectSummaryById(projectId);
    await deps.archiveExternalHarnessThread(projectId, ref, deps.nowIso());
  };

  const composeExternalHarnessContextSelectionsByProject = async (
    projectId: string,
    ref: ExternalHarnessContextRef
  ): Promise<AgentContextSelection[]> => {
    const snapshot = deps.getSnapshot();
    const worktreeId =
      resolveWorktreeIdForWorkspacePath(snapshot, projectId, ref.workspacePath) ??
      snapshot.worktrees.find((worktree) => worktree.projectId === projectId)?.id ??
      "";
    return composeExternalHarnessContextSelections({ ref, projectId, worktreeId });
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
    resolveWorkspaceFileForExternalOpen,
    listWorkspaceFiles,
    listImportedContextBundlesByProject,
    listExternalHarnessContextSessionsByProject,
    archiveExternalHarnessThreadByProject,
    composeExternalHarnessContextSelectionsByProject,
    listWorkspaceDirectoriesByProject,
    listWorkspaceSpecsByProject,
    listWorkspaceNotesByProject,
    searchWorkspaceFilesByProject,
    statWorkspacePathByProject,
    getWorkspaceGitStatusSummary,
    checkoutWorkspaceBranch,
    setWorkspaceUpstream,
    listWorkspaceTasksByProject,
    getWorkspaceTaskBoard,
    saveWorkspaceTaskBoard,
    createWorkspaceTask,
    getWorkspaceSplitViews,
    saveWorkspaceSplitViews,
    saveWorkspaceTerminalPresets
  };
}
