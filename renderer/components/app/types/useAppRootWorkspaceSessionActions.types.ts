import type { UiState } from "@/components/app/types";
import type { UseFileEditorStateResult } from "@/components/app/types/component.types";
import type { AppState, CreateTerminalPayload, ProjectSummary } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type UseAppRootWorkspaceSessionActionsArgs = {
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  runWithStatus: (message: string, action: () => Promise<AppState>) => Promise<AppState | null>;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  setUiState: Dispatch<SetStateAction<UiState>>;
  onOpenEditor: () => void;
  reloadWorkspaceNotesForProject: (projectId: string) => Promise<void>;
  reloadWorkspaceSpecsForProject: (projectId: string) => Promise<void>;
};

export type UseAppRootWorkspaceSessionActionsResult = UseFileEditorStateResult & {
  createTerminalWithStatus: (payload: CreateTerminalPayload) => Promise<AppState | null>;
  launchTerminalInWorkspace: (projectId: string, payload: CreateTerminalPayload) => Promise<void>;
  saveWorkspaceTerminalPresets: (
    projectId: string,
    presets: NonNullable<ProjectSummary["workspaceTerminalPresets"]>
  ) => Promise<void>;
};
