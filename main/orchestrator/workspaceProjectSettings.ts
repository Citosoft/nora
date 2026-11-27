import type { ProjectSummary } from "@shared/appTypes";
import { applyWorkspaceSetupScriptsUpdate } from "@shared/workspaceSetupScripts";
import type {
  WorkspaceProjectSettingsActions,
  WorkspaceProjectSettingsDeps
} from "../types/workspaceProjectSettings.types";

export function createWorkspaceProjectSettingsActions(deps: WorkspaceProjectSettingsDeps): WorkspaceProjectSettingsActions {
  /** Persists the project and swaps it into the live state wherever it is shown. */
  const saveProjectSettings = async (
    projectId: string,
    patch: (project: ProjectSummary) => Partial<ProjectSummary>
  ) => {
    const project = await deps.resolveProjectSummaryById(projectId);
    const updatedProject: ProjectSummary = { ...project, ...patch(project), updatedAt: deps.nowIso() };
    await deps.saveProject(updatedProject);
    deps.updateState((currentState) => ({
      ...currentState,
      project: currentState.project?.id === updatedProject.id ? updatedProject : currentState.project,
      workspaces: currentState.workspaces.map((workspace) =>
        workspace.project.id === updatedProject.id ? { ...workspace, project: updatedProject } : workspace
      )
    }));
    return deps.refreshProjectState();
  };

  return {
    saveWorkspaceTerminalPresets: (projectId, presets) =>
      saveProjectSettings(projectId, () => ({ workspaceTerminalPresets: presets })),
    saveWorkspaceSetupScripts: (projectId, update) =>
      saveProjectSettings(projectId, (project) => ({
        workspaceSetupScripts: applyWorkspaceSetupScriptsUpdate(project.workspaceSetupScripts ?? [], update, deps.createId)
      }))
  };
}
