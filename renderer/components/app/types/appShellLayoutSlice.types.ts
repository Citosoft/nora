import type { WorkspaceLoadingState } from "@/components/app/types";
import type { WorkspaceRuntimeValue } from "@/components/app/types/workspaceRuntime.types";
import type { LocalTerminalState } from "@shared/appTypes";
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from "react";

/** Layout and dock state for the signed-in workspace shell (narrow surface for `AppSignedInWorkspaceView`). */
export type AppShellLayoutSlice = {
  workspaceRuntimeValue: WorkspaceRuntimeValue | null;
  workspaceSidebarWidth: number;
  changesSidebarWidth: number;
  hasActiveWorkspace: boolean;
  isWorkspaceSidebarCollapsed: boolean;
  isChangesSidebarCollapsed: boolean;
  startSidebarResize: (side: "left" | "right", event: ReactPointerEvent<HTMLDivElement>) => void;
  localTerminalState: LocalTerminalState | null;
  localTerminalDockHeight: number;
  isLocalTerminalDockCollapsed: boolean;
  isCreatingLocalTerminal: boolean;
  localTerminalDockFocusVersion: number;
  setLocalTerminalDockHeight: Dispatch<SetStateAction<number>>;
  setIsLocalTerminalDockCollapsed: Dispatch<SetStateAction<boolean>>;
  workspaceLoading: WorkspaceLoadingState | null;
  isAddingWorkspace: boolean;
  appClosingState: { detail: string; command: string | null } | null;
  dismissWorkspaceLoading: () => void;
};
