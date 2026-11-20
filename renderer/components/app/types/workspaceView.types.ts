import type { Dispatch, SetStateAction } from "react";
import type { LibraryGrouping } from "./library.types";
import type { SidebarPreferences, WorkspaceNavigationValue, WorkspaceToolId } from "./workspaceNavigation.types";

export interface WorkspaceViewPreferences {
  activeTool: WorkspaceToolId | null;
  terminalId: string | null;
  browserTabId: string | null;
  documentPath: string | null;
  documentKind: "notes" | "specs";
  libraryGrouping: LibraryGrouping;
}

export interface WorkspaceViewStoreInput {
  preferences: SidebarPreferences;
  setPreferences: Dispatch<SetStateAction<SidebarPreferences>>;
}

export type WorkspaceToolNavigation = Pick<WorkspaceNavigationValue, "route" | "openedTools" | "openTool" | "closeTool" | "returnToThread">;
