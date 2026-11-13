import type { ThreadSourceFilter, ThreadSort } from "./thread-workspace/list.types";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import type { WorkspaceSummary, RecentProject, TerminalSession, WorktreeRecord, ForgeBranchPullRequestStatus } from "@shared/appTypes";
import type { WorkspaceWorkspaceActionsMenuItemsProps } from "@/components/app/types/workspaceSidebarActionsMenu.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { MemberThreadVisibility, ThreadGrouping } from "@/components/app/types/thread-workspace/navigation.types";
import type { WorkspaceAvatarColor } from "@/components/app/types/workspaceAvatar.types";
import type { WorkspaceViewPreferences } from "./workspaceView.types";

export type WorkspaceToolId = "worktrees" | "documents" | "tasks" | "workflows" | "terminals" | "browser";
export interface WorkspaceToolItem { id: WorkspaceToolId; label: string; icon: LucideIcon; }
/** Threads lists conversations; Bots lists the bots you can talk to. */
export type SidebarMode = "threads" | "bots";
export interface SidebarPreferences {
  sidebarMode: SidebarMode;
  pinnedWorkspaceIds: string[];
  toolPins: Record<string, WorkspaceToolId[]>;
  threadGrouping: ThreadGrouping;
  memberThreads: MemberThreadVisibility;
  threadSourceFilter: ThreadSourceFilter;
  threadSort: ThreadSort;
  workspaceAvatarColors: Record<string, WorkspaceAvatarColor>;
  workspaceViews: Record<string, WorkspaceViewPreferences>;
}
export interface WorkspaceToolRoute { projectId: string; tool: WorkspaceToolId; }
export interface WorkspaceToolRequest extends WorkspaceToolRoute { revision: number; }
export interface WorkspaceNavigationValue {
  route: WorkspaceToolRoute | null;
  openedTools: readonly WorkspaceToolRoute[];
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

export interface WorkspaceToolContentProps extends WorkspaceToolProps { tool: WorkspaceToolId; active: boolean; }

export type TerminalLaunchMenuProps = Pick<WorkspaceWorkspaceActionsMenuItemsProps,
  "workspace" | "focusedProjectId" | "terminalShells" | "preferredShellId" | "terminalQuickLaunchDefaults" | "runnableGlobalTerminalPresets" | "onItemSelected" | "onFocusWorkspace" | "onLaunchWorkspaceTerminal" | "onOpenCreateTerminal" | "onOpenWorkspaceTerminalPresets">;
export interface WorkspaceTerminalTabProps { terminal: TerminalSession; selected: boolean; }

export interface WorkspaceWorktreeRowProps extends WorkspaceToolProps {
  worktree: WorktreeRecord;
  focused: boolean;
  removing: boolean;
  preferredShellId: string | null;
  pullRequestStatus: ForgeBranchPullRequestStatus | null;
}
