import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type {
  UseWorkspaceContentControllerResult,
  UseWorkspaceFileMutationsResult,
  UseWorkspaceResourcesResult
} from "@/components/app/types/appHooks.types";
import type { UseAppRootSessionSurfaceLayoutResult } from "@/components/app/types/useAppRootSessionSurfaceLayout.types";
import type { UseAppRootSignedInSecondaryWiringResult } from "@/components/app/types/useAppRootSignedInSecondaryWiring.types";
import type { UseAppRootWorkspaceMainSurfaceResult } from "@/components/app/types/useAppRootWorkspaceMainSurface.types";
import type { UseAppRootWorkspaceSessionActionsResult } from "@/components/app/types/useAppRootWorkspaceSessionActions.types";
import type { AppSettings, AppState, InstalledIde, WorkspaceTaskBoard } from "@shared/appTypes";
import type { ChangeEntry } from "@shared/appTypes";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type AppRootWorkspaceSessionContextValue = {
  resources: UseWorkspaceResourcesResult & {
    workspaceTaskBoards: Record<string, { board: WorkspaceTaskBoard; isLoading: boolean; errorMessage: string | null }>;
    updateWorkspaceTaskBoard: (
      projectId: string,
      updater: (currentBoard: WorkspaceTaskBoard) => WorkspaceTaskBoard
    ) => Promise<WorkspaceTaskBoard>;
    workspaceSplitViews: import("@/components/app/types").WorkspaceSplitViewsState;
    saveWorkspaceSplitViews: (
      projectId: string,
      collection: import("@shared/appTypes").WorkspaceSplitViewCollection
    ) => Promise<import("@shared/appTypes").WorkspaceSplitViewCollection>;
  };
  sessionActions: UseAppRootWorkspaceSessionActionsResult;
  layout: UseAppRootSessionSurfaceLayoutResult & {
    selectedChange: ChangeEntry | null;
    isRemoteMountedWorkspace: boolean;
  };
  content: UseWorkspaceContentControllerResult;
  fileMutations: UseWorkspaceFileMutationsResult;
  derived: UseAppRootSignedInSecondaryWiringResult;
  mainSurface: UseAppRootWorkspaceMainSurfaceResult;
};

export type AppRootWorkspaceSessionProviderProps = {
  appSettings: AppSettings;
  storedWorkspaceContentState: import("@/components/app/types").StoredWorkspaceContentState;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  safelyAndRefresh: (action: () => Promise<AppState>, statusMessage?: string) => Promise<AppState | null>;
  runWithStatus: (message: string, action: () => Promise<AppState>) => Promise<AppState | null>;
  updateSnapshotState: (next: AppState) => void;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  captureError: (error: unknown) => void;
  openAiChat: (projectId: string) => void;
  uiCommands: AppUiCommands;
  normalizeSnapshot: (snapshot: AppState) => AppState;
  windowPlatform: import("@/components/app/types").WindowUiState["platform"];
  setDefaultTerminalShellId: Dispatch<SetStateAction<string | null>>;
  installedIdes: InstalledIde[];
  defaultIdeId: string | null;
  statusBar: import("@/components/app/types/component.types").StatusBarContextValue;
  trackAgentCreation: (
    payload: import("@shared/appTypes").CreateAgentPayload,
    source: "task-panel" | "task-reference" | "task-planner" | "dialog"
  ) => void;
  children: ReactNode;
};
