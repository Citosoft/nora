import type { WorkspaceService } from "../types/mainServices.types";

type WorkspaceServiceDeps = WorkspaceService;

export function createWorkspaceService(deps: WorkspaceServiceDeps): WorkspaceService {
  return {
    selectProject: deps.selectProject,
    focusWorkspace: deps.focusWorkspace,
    closeProject: deps.closeProject,
    removeProject: deps.removeProject,
    openDirectSshProject: deps.openDirectSshProject,
    removeProjectsWithinMount: deps.removeProjectsWithinMount,
    refreshProjectState: deps.refreshProjectState,
    resetWorkspaces: deps.resetWorkspaces,
    readWorkspaceFile: deps.readWorkspaceFile,
    resolveWorkspaceStatePath: deps.resolveWorkspaceStatePath,
    readWorkspaceImageFile: deps.readWorkspaceImageFile,
    listWorkspaceFiles: deps.listWorkspaceFiles,
    listWorkspaceDirectories: deps.listWorkspaceDirectories,
    listWorkspaceSpecs: deps.listWorkspaceSpecs,
    listWorkspaceNotes: deps.listWorkspaceNotes,
    searchWorkspaceFiles: deps.searchWorkspaceFiles,
    statWorkspacePath: deps.statWorkspacePath,
    getWorkspaceGitStatusSummary: deps.getWorkspaceGitStatusSummary,
    listWorkspaceTasks: deps.listWorkspaceTasks,
    getWorkspaceTaskBoard: deps.getWorkspaceTaskBoard,
    saveWorkspaceTaskBoard: deps.saveWorkspaceTaskBoard,
    createWorkspaceTask: deps.createWorkspaceTask,
    getWorkspaceSplitViews: deps.getWorkspaceSplitViews,
    saveWorkspaceSplitViews: deps.saveWorkspaceSplitViews,
    saveWorkspaceTerminalPresets: deps.saveWorkspaceTerminalPresets,
    createWorkspaceDirectory: deps.createWorkspaceDirectory,
    moveWorkspaceFile: deps.moveWorkspaceFile,
    deleteWorkspaceFile: deps.deleteWorkspaceFile,
    writeWorkspaceFile: deps.writeWorkspaceFile,
    importWorkspaceBinaryFile: deps.importWorkspaceBinaryFile,
    selectChange: deps.selectChange,
    inspectCommit: deps.inspectCommit,
    clearCommitInspection: deps.clearCommitInspection,
    commitChanges: deps.commitChanges,
    pushChanges: deps.pushChanges
  };
}
