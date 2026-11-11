import type { Dispatch, ReactNode, SetStateAction, PointerEventHandler } from "react";
import type { LucideIcon } from "lucide-react";
import type { WorkspaceSummary, RecentProject, TerminalSession, WorktreeRecord, ForgeBranchPullRequestStatus } from "@shared/appTypes";
import type { ChangesPanelSectionProps } from "@/components/app/types/changesPanel.types";
import type { WorkspaceWorkspaceActionsMenuItemsProps } from "@/components/app/types/workspaceSidebarActionsMenu.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";

export type WorkspaceToolId = "files" | "changes" | "documents" | "tasks" | "development" | "workflows" | "terminals" | "browser";
export interface WorkspaceToolItem { id: WorkspaceToolId; label: string; icon: LucideIcon; }
export interface SidebarPreferences { pinnedWorkspaceIds: string[]; toolPins: Record<string, WorkspaceToolId[]>; }
export interface WorkspaceToolRoute { projectId: string; tool: WorkspaceToolId; focusRevision: number; }
export interface WorkspaceNavigationValue {
  route: WorkspaceToolRoute | null;
  openTool(projectId: string, tool: WorkspaceToolId): void;
  closeTool(): void;
  returnToThread(): void;
  preferences: SidebarPreferences;
  setPreferences: Dispatch<SetStateAction<SidebarPreferences>>;
  preferenceError: string | null;
}
export interface WorkspaceNavigationProviderProps { children: ReactNode; }
export interface WorkspaceToolProps { workspace: WorkspaceSummary; }
export interface WorkspaceShortcutsProps extends WorkspaceToolProps { role: RoleSelection | null; collapsed: boolean; }
export interface WorkspaceSwitcherProps {
  workspaces: WorkspaceSummary[];
  activeId: string | null;
  collapsed: boolean;
  recentWorkspaces: RecentProject[];
  onSelect(projectId: string): void;
  onOpenRecent(rootPath: string, name: string): void;
  onAdd(): void;
}

export interface WorkspaceToolHeaderProps { title: string; workspaceName: string; }
export interface WorkspaceToolContentProps extends WorkspaceToolProps { tool: WorkspaceToolId; }

export type TerminalLaunchMenuProps = Pick<WorkspaceWorkspaceActionsMenuItemsProps,
  "workspace" | "focusedProjectId" | "terminalShells" | "preferredShellId" | "terminalQuickLaunchDefaults" | "runnableGlobalTerminalPresets" | "onItemSelected" | "onFocusWorkspace" | "onLaunchWorkspaceTerminal" | "onOpenCreateTerminal" | "onOpenWorkspaceTerminalPresets">;
export interface WorkspaceTerminalRowProps { terminal: TerminalSession; onSelect(terminalId: string): void; }

export interface WorkspaceChangesSurfaceProps {
  panel: ChangesPanelSectionProps;
  collapsed: boolean;
  swapped: boolean;
  onStartResize: PointerEventHandler<HTMLDivElement>;
}

export interface WorkspaceWorktreeRowProps extends WorkspaceToolProps {
  worktree: WorktreeRecord;
  focused: boolean;
  removing: boolean;
  preferredShellId: string | null;
  pullRequestStatus: ForgeBranchPullRequestStatus | null;
}
