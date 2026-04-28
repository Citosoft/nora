import { listProviderModels } from "@main/ai/providerModels";
import type { MainServices } from "@main/services/mainServices";
import type {
  AppSettings,
  AppState,
  CommitChangesPayload,
  CreateWorkspaceDirectoryPayload,
  GenerateCommitMessagePayload,
  GenerateCommitMessageResult,
  ImportBrowserImagePayload,
  ListAiModelsPayload,
  ListAiModelsResult,
  TerminalPreset,
  WorkspaceFileRequest,
  WorkspaceNoteSummary,
  WorkspaceSearchRequest,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WriteWorkspaceFilePayload
} from "@shared/appTypes";
import type { WorkspaceImageFileContent } from "@shared/types/workspaceFile.types";
import { ipcMain } from "electron";
import { generateCommitMessageFromChanges } from "@main/ai/commitMessageGenerator";

interface RegisterWorkspaceIpcDeps {
  services: MainServices;
  withSnapshot: (action: () => Promise<AppState>) => Promise<AppState>;
  compactStateForRenderer: (snapshot: AppState) => AppState;
  getAppSettings: () => AppSettings;
  importBrowserImageToWorkspace: (payload: ImportBrowserImagePayload) => Promise<AppState>;
  validateMoveWorkspaceFilePayload: (payload: { projectId: string; fromPath: string; toPath: string }) => void;
  validateWriteWorkspaceFilePayload: (payload: WriteWorkspaceFilePayload) => void;
}

export function registerWorkspaceIpc({
  services,
  withSnapshot,
  compactStateForRenderer,
  getAppSettings,
  importBrowserImageToWorkspace,
  validateMoveWorkspaceFilePayload,
  validateWriteWorkspaceFilePayload
}: RegisterWorkspaceIpcDeps): void {
  ipcMain.handle("app:get-snapshot", () => compactStateForRenderer(services.snapshot.getSnapshot()));
  ipcMain.handle("app:get-agent-terminal-buffer", (_event, agentId: string) =>
    services.snapshot.getAgentTerminalBuffer(agentId)
  );
  ipcMain.handle("app:get-terminal-buffer", (_event, sessionId: string) =>
    services.snapshot.getTerminalBuffer(sessionId)
  );
  ipcMain.handle("app:get-local-terminal-state", () =>
    services.snapshot.getLocalTerminalState()
  );
  ipcMain.handle("app:get-agent-context-preview", (_event, agentId: string) =>
    services.snapshot.getAgentContextPreview(agentId)
  );
  ipcMain.handle("app:read-workspace-file", (_event, payload: WorkspaceFileRequest) =>
    services.workspace.readWorkspaceFile(payload)
  );
  ipcMain.handle("app:resolve-workspace-state-path", (_event, payload: WorkspaceFileRequest) =>
    services.workspace.resolveWorkspaceStatePath(payload)
  );
  ipcMain.handle("app:read-workspace-image-file", (_event, payload: WorkspaceFileRequest): Promise<WorkspaceImageFileContent> =>
    services.workspace.readWorkspaceImageFile(payload)
  );
  ipcMain.handle("app:list-workspace-files", (_event, projectId: string, rootPath?: string) =>
    services.workspace.listWorkspaceFiles(projectId, rootPath)
  );
  ipcMain.handle("app:list-workspace-directories", (_event, projectId: string, rootPath?: string) =>
    services.workspace.listWorkspaceDirectories(projectId, rootPath)
  );
  ipcMain.handle("app:list-workspace-specs", (_event, projectId: string): Promise<WorkspaceSpecSummary[]> =>
    services.workspace.listWorkspaceSpecs(projectId)
  );
  ipcMain.handle("app:list-workspace-notes", (_event, projectId: string): Promise<WorkspaceNoteSummary[]> =>
    services.workspace.listWorkspaceNotes(projectId)
  );
  ipcMain.handle("app:search-workspace-files", (_event, payload: WorkspaceSearchRequest) =>
    services.workspace.searchWorkspaceFiles(payload)
  );
  ipcMain.handle("app:stat-workspace-path", (_event, payload: WorkspaceFileRequest) =>
    services.workspace.statWorkspacePath(payload)
  );
  ipcMain.handle(
    "app:get-workspace-git-status-summary",
    (_event, payload: { projectId: string; rootPath?: string }) => services.workspace.getWorkspaceGitStatusSummary(payload)
  );
  ipcMain.handle("app:list-workspace-tasks", (_event, projectId: string) =>
    services.workspace.listWorkspaceTasks(projectId)
  );
  ipcMain.handle("app:get-workspace-task-board", (_event, projectId: string): Promise<WorkspaceTaskBoard> =>
    services.workspace.getWorkspaceTaskBoard(projectId)
  );
  ipcMain.handle("app:get-workspace-split-views", (_event, projectId: string): Promise<WorkspaceSplitViewCollection> =>
    services.workspace.getWorkspaceSplitViews(projectId)
  );
  ipcMain.handle(
    "app:save-workspace-task-board",
    (_event, projectId: string, board: WorkspaceTaskBoard): Promise<WorkspaceTaskBoard> =>
      services.workspace.saveWorkspaceTaskBoard(projectId, board)
  );
  ipcMain.handle(
    "app:save-workspace-split-views",
    (_event, projectId: string, collection: WorkspaceSplitViewCollection): Promise<WorkspaceSplitViewCollection> =>
      services.workspace.saveWorkspaceSplitViews(projectId, collection)
  );
  ipcMain.handle(
    "app:save-workspace-terminal-presets",
    (_event, projectId: string, presets: TerminalPreset[]): Promise<AppState> =>
      services.workspace.saveWorkspaceTerminalPresets(projectId, presets)
  );
  ipcMain.handle("app:move-workspace-file", (_event, payload: { projectId: string; fromPath: string; toPath: string }) =>
    withSnapshot(() => {
      validateMoveWorkspaceFilePayload(payload);
      return services.workspace.moveWorkspaceFile(payload);
    })
  );
  ipcMain.handle("app:create-workspace-directory", (_event, payload: CreateWorkspaceDirectoryPayload) =>
    withSnapshot(() => services.workspace.createWorkspaceDirectory(payload))
  );
  ipcMain.handle("app:delete-workspace-file", (_event, payload: WorkspaceFileRequest) =>
    withSnapshot(() => services.workspace.deleteWorkspaceFile(payload))
  );
  ipcMain.handle("app:write-workspace-file", (_event, payload: WriteWorkspaceFilePayload) =>
    withSnapshot(() => {
      validateWriteWorkspaceFilePayload(payload);
      return services.workspace.writeWorkspaceFile(payload);
    })
  );
  ipcMain.handle("app:import-browser-image-to-workspace", (_event, payload: ImportBrowserImagePayload) =>
    withSnapshot(() => importBrowserImageToWorkspace(payload))
  );
  ipcMain.handle("app:select-project", (_event, projectRoot: string) =>
    withSnapshot(() => services.workspace.selectProject(projectRoot))
  );
  ipcMain.handle("app:focus-workspace", (_event, projectId: string) =>
    withSnapshot(() => services.workspace.focusWorkspace(projectId))
  );
  ipcMain.handle("app:remove-project", (_event, projectRoot: string) =>
    withSnapshot(() => services.workspace.removeProject(projectRoot))
  );
  ipcMain.handle("app:close-project", () => withSnapshot(() => services.workspace.closeProject()));
  ipcMain.handle("app:refresh", () => withSnapshot(() => services.workspace.refreshProjectState()));
  ipcMain.handle("app:reset-workspaces", () => withSnapshot(() => services.workspace.resetWorkspaces()));
  ipcMain.handle("app:commit-changes", (_event, payload: CommitChangesPayload) =>
    withSnapshot(() => services.workspace.commitChanges(payload))
  );
  ipcMain.handle("app:generate-commit-message", async (_event, payload?: GenerateCommitMessagePayload): Promise<GenerateCommitMessageResult> => {
    const snapshot = services.snapshot.getSnapshot();
    if (!snapshot.project) {
      throw new Error("Choose a project before generating a commit message.");
    }

    const selectedPathsRaw = Array.isArray(payload?.paths)
      ? payload.paths.map((pathName) => pathName.trim()).filter((pathName, index, all) => !!pathName && all.indexOf(pathName) === index)
      : null;
    if (Array.isArray(payload?.paths) && (selectedPathsRaw?.length ?? 0) === 0) {
      throw new Error("Select at least one file to generate a commit message.");
    }

    const selectedPathSet = selectedPathsRaw ? new Set(selectedPathsRaw) : null;
    const selectedChanges = selectedPathSet
      ? snapshot.changes.filter((change) => selectedPathSet.has(change.path))
      : snapshot.changes;

    if (selectedChanges.length === 0) {
      throw new Error("No selected changes are available to generate a commit message.");
    }

    if (selectedPathSet && selectedChanges.length !== selectedPathSet.size) {
      throw new Error("Some selected files are no longer available in the working tree.");
    }

    return generateCommitMessageFromChanges(getAppSettings(), selectedChanges);
  });
  ipcMain.handle("app:list-ai-models", (_event, payload: ListAiModelsPayload): Promise<ListAiModelsResult> =>
    listProviderModels(payload.provider, payload.apiKey)
  );
  ipcMain.handle("app:push-changes", () => withSnapshot(() => services.workspace.pushChanges()));
  ipcMain.handle("app:select-change", (_event, pathName: string) =>
    withSnapshot(() => Promise.resolve(services.workspace.selectChange(pathName)))
  );
  ipcMain.handle("app:inspect-commit", (_event, hash: string) =>
    withSnapshot(() => services.workspace.inspectCommit(hash))
  );
  ipcMain.handle("app:clear-commit-inspection", () =>
    withSnapshot(() => services.workspace.clearCommitInspection())
  );
}
