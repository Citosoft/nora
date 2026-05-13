import type { AppState } from "@shared/appTypes";
import type {
  WorkspaceMutationDeps,
  WorkspaceMutationHelpers
} from "../types/orchestratorWorkspaceMutations.types";

export function createWorkspaceMutationHelpers(deps: WorkspaceMutationDeps): WorkspaceMutationHelpers {
  async function createWorkspaceDirectory(payload: { projectId: string; path: string; rootPath?: string }): Promise<AppState> {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    const target = deps.resolveWorkspaceFileTarget(project, payload.rootPath);
    await deps.createWorkspaceDirectoryOperation(target, project.id, payload.path);

    if (deps.getSnapshot().project?.id === project.id) {
      deps.setState({ errorMessage: null });
      return deps.refreshProjectState();
    }

    await deps.refreshWorkspaceSummaries("createWorkspaceDirectory");
    return deps.getSnapshot();
  }

  async function moveWorkspaceFile(payload: { projectId: string; fromPath: string; toPath: string; rootPath?: string }): Promise<AppState> {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    const target = deps.resolveWorkspaceFileTarget(project, payload.rootPath);
    await deps.moveWorkspaceFileOperation(target, project.id, payload.fromPath, payload.toPath);
    await deps.renameWorkspaceTaskBoardPosition(target, project.id, payload.fromPath, payload.toPath);

    if (deps.getSnapshot().project?.id === project.id) {
      if (deps.getSnapshot().selectedChangePath === payload.fromPath) {
        deps.setState({
          selectedChangePath: payload.toPath,
          errorMessage: null
        });
      }
      return deps.refreshProjectState();
    }

    await deps.refreshWorkspaceSummaries("moveWorkspaceFile");
    return deps.getSnapshot();
  }

  async function deleteWorkspaceFile(payload: { projectId: string; path: string; rootPath?: string }): Promise<AppState> {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    const target = deps.resolveWorkspaceFileTarget(project, payload.rootPath);
    await deps.deleteWorkspaceFileOperation(target, project.id, payload.path);
    await deps.removeWorkspaceTaskBoardPosition(target, project.id, payload.path);

    if (deps.getSnapshot().project?.id === project.id) {
      if (deps.getSnapshot().selectedChangePath === payload.path) {
        deps.setState({
          selectedChangePath: null,
          errorMessage: null
        });
      }
      return deps.refreshProjectState();
    }

    await deps.refreshWorkspaceSummaries("deleteWorkspaceFile");
    return deps.getSnapshot();
  }

  async function writeWorkspaceFile(payload: { projectId: string; path: string; content: string; rootPath?: string }): Promise<AppState> {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    await deps.writeWorkspaceTextFileOperation(deps.resolveWorkspaceFileTarget(project, payload.rootPath), project.id, payload.path, payload.content);

    if (deps.getSnapshot().project?.id === project.id) {
      deps.setState({
        selectedChangePath: payload.path,
        errorMessage: null
      });
      return deps.refreshProjectState();
    }

    await deps.refreshWorkspaceSummaries("writeWorkspaceFile");
    return deps.getSnapshot();
  }

  async function importWorkspaceBinaryFile(payload: { projectId: string; path: string; content: Buffer; rootPath?: string }): Promise<AppState> {
    const project = await deps.resolveProjectSummaryById(payload.projectId);
    await deps.writeWorkspaceBinaryFileOperation(
      deps.resolveWorkspaceFileTarget(project, payload.rootPath),
      project.id,
      payload.path,
      payload.content
    );

    if (deps.getSnapshot().project?.id === project.id) {
      deps.setState({
        selectedChangePath: payload.path,
        errorMessage: null
      });
      return deps.refreshProjectState();
    }

    await deps.refreshWorkspaceSummaries("importWorkspaceBinaryFile");
    return deps.getSnapshot();
  }

  function selectChange(pathName: string): AppState {
    deps.setState({
      selectedChangePath: pathName,
      errorMessage: null
    });
    return deps.getSnapshot();
  }

  async function discardChange(pathName: string): Promise<AppState> {
    const snapshot = deps.getSnapshot();
    const currentProject = snapshot.project;
    if (!currentProject) {
      throw new Error("Choose a project before discarding file changes.");
    }

    const change = snapshot.changes.find((entry) => entry.path === pathName);
    if (!change) {
      throw new Error(`No pending git change was found for ${pathName}.`);
    }

    const project = await deps.resolveProjectSummaryById(currentProject.id);
    const target = deps.resolveWorkspaceFileTarget(project, snapshot.changesRoot || project.rootPath);
    await deps.discardWorkspaceChangeOperation(target, pathName, change.status);

    deps.setState({
      selectedChangePath: snapshot.selectedChangePath === pathName ? null : snapshot.selectedChangePath,
      errorMessage: null
    });
    return deps.refreshProjectState();
  }

  async function inspectCommit(hash: string): Promise<AppState> {
    deps.setState({
      selectedCommitHash: hash,
      selectedCommit: null,
      selectedChangePath: null,
      errorMessage: null
    });
    return deps.refreshProjectState();
  }

  async function clearCommitInspection(): Promise<AppState> {
    deps.setState({
      selectedCommitHash: null,
      selectedCommit: null,
      selectedChangePath: null,
      errorMessage: null
    });
    return deps.refreshProjectState();
  }

  return {
    createWorkspaceDirectory,
    moveWorkspaceFile,
    deleteWorkspaceFile,
    writeWorkspaceFile,
    importWorkspaceBinaryFile,
    selectChange,
    discardChange,
    inspectCommit,
    clearCommitInspection
  };
}
