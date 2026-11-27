import type { ProjectSummary, WorkspaceScriptLauncher, WorkspaceSetupScript, WorkspaceSummary } from "@shared/appTypes";

export type WorkspaceSetupScriptsSectionProps = {
  scripts: WorkspaceSetupScript[];
  onChange: (scripts: WorkspaceSetupScript[]) => void;
};

export type WorkspaceSetupScriptRowProps = {
  script: WorkspaceSetupScript;
  onChange: (script: WorkspaceSetupScript) => void;
  onRemove: () => void;
};

export type UseWorkspaceSetupScriptsDraftArgs = {
  open: boolean;
  project: ProjectSummary | null;
};

export type UseWorkspaceSetupScriptsDraftResult = {
  scripts: WorkspaceSetupScript[];
  setScripts: (scripts: WorkspaceSetupScript[]) => void;
  /** Saves when the draft changed; resolves false and sets `saveError` when saving failed. */
  save: () => Promise<boolean>;
  saveError: string | null;
};

export type WorkspaceSetupScriptMenuItemsProps = {
  workspace: WorkspaceSummary;
  onItemSelected?: () => void;
};

/** Package scripts and workspace setup scripts, both runnable from a workspace's script menus. */
export type WorkspaceRunnableScripts = {
  packageScripts: WorkspaceScriptLauncher[];
  setupScripts: WorkspaceSetupScript[];
};
