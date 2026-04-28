import type {
  WorkspaceFileTreeState,
  WorkspaceNotesState,
  WorkspaceSpecsState,
  WorkspaceTasksState
} from "@/components/app/types";
import type { WorkspaceRuntimeValue } from "@/components/app/types/workspaceRuntime.types";
import type { WorkspaceQuickSearchSource } from "@/components/app/types/titlebarWorkspaceSearch.types";
import type { AgentSession, AppState, InstalledIde, TerminalSession, WorktreeRecord } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

import type { useWorkspaceAggregates } from "@/components/app/hooks/useWorkspaceAggregates";

export type UseAppRootSignedInSecondaryWiringArgs = {
  uiStateDestroyAgentId: string | null;
  focusedAgent: AgentSession | null;
  focusedTerminal: TerminalSession | null;
  isRemoteMountedWorkspace: boolean;
  workspaceTasks: WorkspaceTasksState;
  workspaceSpecs: WorkspaceSpecsState;
  workspaceNotes: WorkspaceNotesState;
  workspaceFileTreePaths: string[];
  windowPlatform: import("@/components/app/types").WindowUiState["platform"];
  setDefaultTerminalShellId: Dispatch<SetStateAction<string | null>>;
  installedIdes: InstalledIde[];
  defaultIdeId: string | null;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  captureError: (error: unknown) => void;
  normalizeSnapshot: (snapshot: AppState) => AppState;
  workspaceFileTree: WorkspaceFileTreeState;
};

export type WorkspaceAggregatesResult = ReturnType<typeof useWorkspaceAggregates>;

export type UseAppRootSignedInSecondaryWiringResult = {
  activeWorktree: WorktreeRecord | null;
  activeBranch: string;
  parentRepoBranch: string;
  agentPendingDestroy: AgentSession | null;
  fileChangeCounts: Record<string, { additions: number; deletions: number }>;
  canOpenProjectInIde: boolean;
  preferredIde: InstalledIde | null;
  allWorkspaceTasks: WorkspaceAggregatesResult["allWorkspaceTasks"];
  allWorkspaceSpecs: WorkspaceAggregatesResult["allWorkspaceSpecs"];
  allWorkspaceNotes: WorkspaceAggregatesResult["allWorkspaceNotes"];
  workspaceQuickSearchSource: WorkspaceQuickSearchSource;
  workspaceQuickSearchOpenShortcutLabel: string;
  handleDefaultTerminalShellChange: (shellId: string | null) => void;
  workspaceRuntimeValue: WorkspaceRuntimeValue | null;
};
