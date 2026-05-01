import type { WorkspaceBridge, WorkspaceLoadingProgressPayload } from "@shared/ipc/types/workspaceGateway.types";

import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createWorkspaceBridge(): WorkspaceBridge {
  return {
    chooseProject: () => invokeIpc("app:choose-project"),
    chooseProjectAtPath: (defaultPath, title) => invokeIpc("app:choose-project-at-path", defaultPath, title),
    openSshProject: (payload) => invokeIpc("app:open-ssh-project", payload),
    mountRemoteProject: (payload) => invokeIpc("app:mount-remote-project", payload),
    connectRemoteProject: (mountPoint, host) => invokeIpc("app:connect-remote-project", mountPoint, host),
    unmountRemoteProject: (mountPoint) => invokeIpc("app:unmount-remote-project", mountPoint),
    selectProject: (projectRoot) => invokeIpc("app:select-project", projectRoot),
    focusWorkspace: (projectId) => invokeIpc("app:focus-workspace", projectId),
    closeProject: () => invokeIpc("app:close-project"),
    removeProject: (projectRoot) => invokeIpc("app:remove-project", projectRoot),
    refresh: () => invokeIpc("app:refresh"),
    resetWorkspaces: () => invokeIpc("app:reset-workspaces"),
    listWorkspaceFiles: (projectId, rootPath) => invokeIpc("app:list-workspace-files", projectId, rootPath),
    listWorkspaceDirectories: (projectId, rootPath) => invokeIpc("app:list-workspace-directories", projectId, rootPath),
    listWorkspaceTasks: (projectId) => invokeIpc("app:list-workspace-tasks", projectId),
    listWorkspaceSpecs: (projectId) => invokeIpc("app:list-workspace-specs", projectId),
    listWorkspaceNotes: (projectId) => invokeIpc("app:list-workspace-notes", projectId),
    resolveWorkspaceStatePath: (payload) => invokeIpc("app:resolve-workspace-state-path", payload),
    getWorkspaceTaskBoard: (projectId) => invokeIpc("app:get-workspace-task-board", projectId),
    saveWorkspaceTaskBoard: (projectId, board) => invokeIpc("app:save-workspace-task-board", projectId, board),
    getWorkspaceSplitViews: (projectId) => invokeIpc("app:get-workspace-split-views", projectId),
    saveWorkspaceSplitViews: (projectId, collection) => invokeIpc("app:save-workspace-split-views", projectId, collection),
    saveWorkspaceTerminalPresets: (projectId, presets) => invokeIpc("app:save-workspace-terminal-presets", projectId, presets),
    readWorkspaceFile: (payload) => invokeIpc("app:read-workspace-file", payload),
    readWorkspaceImageFile: (payload) => invokeIpc("app:read-workspace-image-file", payload),
    writeWorkspaceFile: (payload) => invokeIpc("app:write-workspace-file", payload),
    createWorkspaceDirectory: (payload) => invokeIpc("app:create-workspace-directory", payload),
    importBrowserImageToWorkspace: (payload) => invokeIpc("app:import-browser-image-to-workspace", payload),
    moveWorkspaceFile: (payload) => invokeIpc("app:move-workspace-file", payload),
    deleteWorkspaceFile: (payload) => invokeIpc("app:delete-workspace-file", payload),
    searchWorkspaceFiles: (payload) => invokeIpc("app:search-workspace-files", payload),
    listImportedContextBundles: (projectId, rootPath) =>
      invokeIpc("app:list-imported-context-bundles", projectId, rootPath),
    listNoraDetectableContextBundles: (projectId, sessionId, worktreeId) =>
      invokeIpc("app:list-nora-detectable-context-bundles", projectId, sessionId, worktreeId),
    importNoraDetectableContextBundle: (payload) =>
      invokeIpc("app:import-nora-detectable-context-bundle", payload),
    readNoraDetectableContextBundle: (payload) =>
      invokeIpc("app:read-nora-detectable-context-bundle", payload),
    deleteNoraDetectableContextBundle: (payload) =>
      invokeIpc("app:delete-nora-detectable-context-bundle", payload),
    statWorkspacePath: (payload) => invokeIpc("app:stat-workspace-path", payload),
    getWorkspaceGitStatusSummary: (payload) => invokeIpc("app:get-workspace-git-status-summary", payload),
    selectChange: (pathName) => invokeIpc("app:select-change", pathName),
    inspectCommit: (hash) => invokeIpc("app:inspect-commit", hash),
    clearCommitInspection: () => invokeIpc("app:clear-commit-inspection"),
    commitChanges: (payload) => invokeIpc("app:commit-changes", payload),
    generateCommitMessage: (payload) => invokeIpc("app:generate-commit-message", payload),
    pushChanges: () => invokeIpc("app:push-changes"),
    onWorkspaceLoadingProgress: (listener) =>
      subscribeToIpcEvent<WorkspaceLoadingProgressPayload>("workspace:loading-progress", listener)
  };
}
