import type {
  AppState,
  ProjectSummary,
  TerminalPreset,
  WorkspaceSetupScriptsUpdate
} from "@shared/appTypes";

export type WorkspaceProjectSettingsDeps = {
  resolveProjectSummaryById: (projectId: string) => Promise<ProjectSummary>;
  saveProject: (project: ProjectSummary) => Promise<void>;
  updateState: (updater: (state: AppState) => AppState) => void;
  refreshProjectState: () => Promise<AppState>;
  nowIso: () => string;
  createId: () => string;
};

/** Per-workspace configuration stored on the project summary. */
export interface WorkspaceProjectSettingsActions {
  saveWorkspaceTerminalPresets: (projectId: string, presets: TerminalPreset[]) => Promise<AppState>;
  /**
   * Edits a workspace's setup scripts. Importers call this with `replace-imported` so a re-import
   * swaps only the scripts they wrote; the editor saves with `replace-all`.
   */
  saveWorkspaceSetupScripts: (projectId: string, update: WorkspaceSetupScriptsUpdate) => Promise<AppState>;
}
