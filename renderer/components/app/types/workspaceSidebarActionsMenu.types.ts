import type { CreateTerminalDialogDefaults } from "@/components/app/types";
import type { TerminalQuickLaunchDefaults } from "@shared/appTypes";
import type { AppState, CreateTerminalPayload, TerminalPreset, WorkspaceSummary } from "@shared/appTypes";

export type WorkspaceWorkspaceActionsMenuItemsProps = {
  workspace: WorkspaceSummary;
  focusedProjectId: string | null;
  terminalShells: AppState["terminalShells"];
  preferredShellId: string | null;
  terminalQuickLaunchDefaults: TerminalQuickLaunchDefaults;
  runnableGlobalTerminalPresets: TerminalPreset[];
  onItemSelected?: () => void;
  onOpenCreateAgent: () => void;
  onFocusWorkspace: (projectId: string) => void;
  onOpenWorkspaceBrowser: (projectId: string) => void;
  onLaunchWorkspaceTerminal: (projectId: string, payload: CreateTerminalPayload) => void;
  onOpenCreateTerminal: (defaults: CreateTerminalDialogDefaults) => void;
  onOpenWorkspaceTerminalPresets: (projectId: string) => void;
  onCreateTask: (projectId: string) => void;
  onCreateSpec: (projectId: string) => void;
  onRemoveProject: (rootPath: string) => void;
};
