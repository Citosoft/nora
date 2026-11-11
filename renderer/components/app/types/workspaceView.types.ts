import type { Dispatch, SetStateAction } from "react";
import type { SidebarPreferences, WorkspaceNavigationValue, WorkspaceToolId } from "./workspaceNavigation.types";

export interface WorkspaceViewPreferences {
  activeTool: WorkspaceToolId | null;
  terminalId: string | null;
  browserTabId: string | null;
  filePath: string | null;
  documentPath: string | null;
  documentKind: "notes" | "specs";
  changesTab: "changes" | "worktrees";
  reviewMode: "file" | "all";
}

export interface WorkspaceViewStoreInput {
  preferences: SidebarPreferences;
  setPreferences: Dispatch<SetStateAction<SidebarPreferences>>;
}

export type WorkspaceToolNavigation = Pick<WorkspaceNavigationValue, "route" | "openedTools" | "openTool" | "closeTool" | "returnToThread">;
