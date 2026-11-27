import type { ThreadSourceFilter, ThreadSort } from "./thread-workspace/list.types";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import type { WorkspaceSummary, RecentProject, TerminalSession, WorktreeRecord, ForgeBranchPullRequestStatus, WorkspaceScriptLauncher } from "@shared/appTypes";
import type { WorkspaceWorkspaceActionsMenuItemsProps } from "@/components/app/types/workspaceSidebarActionsMenu.types";
import type { WorkThreadVisibility, ThreadGrouping } from "@/components/app/types/thread-workspace/navigation.types";
import type { WorkspaceAvatarColor } from "@/components/app/types/workspaceAvatar.types";
import type { WorkspaceViewPreferences } from "./workspaceView.types";
import type { BotsHomePage } from "./routineCalendar.types";
import type { InboxView } from "./inbox.types";
import type { NavigationKeybindingCommandId } from "@shared/types/keybindings/keybindings.types";

export type WorkspaceToolId = "worktrees" | "merge-requests" | "issues" | "documents" | "library" | "tasks" | "workflows" | "terminals" | "browser";
export interface WorkspaceToolItem { id: WorkspaceToolId; label: string; icon: LucideIcon; }
/**
 * Threads lists conversations; Bots lists the bots you can talk to; Inbox lists what needs you and what is new; Apps lists the apps agents built;
 * Mobile shows the phone app page over the sidebar and center. Mobile is never restored on launch.
 */
export type SidebarMode = "threads" | "bots" | "inbox" | "apps" | "mobile";
export interface SidebarPreferences {
  sidebarMode: SidebarMode;
  /** The app shown in the center in Apps mode; null shows the Apps home. */
  activeAppId: string | null;
  /** Which Bots home page shows in the center when no thread is open. */
  botsHome: BotsHomePage;
  /** Which inbox view shows in the center when no thread is open. */
  inboxView: InboxView;
  pinnedWorkspaceIds: string[];
  toolPins: Record<string, WorkspaceToolId[]>;
  threadGrouping: ThreadGrouping;
  workThreads: WorkThreadVisibility;
  threadSourceFilter: ThreadSourceFilter;
  threadSort: ThreadSort;
  workspaceAvatarColors: Record<string, WorkspaceAvatarColor>;
  workspaceViews: Record<string, WorkspaceViewPreferences>;
}
export interface SidebarModeHomeProps { mode: SidebarMode; botsHome: BotsHomePage; }
export interface WorkspaceToolRoute { projectId: string; tool: WorkspaceToolId; }
export interface WorkspaceToolRequest extends WorkspaceToolRoute { revision: number; }
export interface WorkspaceNavigationValue {
  route: WorkspaceToolRoute | null;
  openedTools: readonly WorkspaceToolRoute[];
  openTool(projectId: string, tool: WorkspaceToolId): void;
  closeTool(): void;
  returnToThread(): void;
  /** Switches the rail view; every view but Threads also opens its home. */
  selectSidebarMode(mode: SidebarMode): void;
  preferences: SidebarPreferences;
  setPreferences: Dispatch<SetStateAction<SidebarPreferences>>;
  preferenceError: string | null;
}
/** What a navigation shortcut opens: a rail view, or a tool in the active workspace. */
export type NavigationShortcutTarget =
  | { kind: "sidebar-mode"; mode: SidebarMode }
  | { kind: "workspace-tool"; tool: WorkspaceToolId };
export type NavigationShortcutTargets = Readonly<Record<NavigationKeybindingCommandId, NavigationShortcutTarget>>;
export interface WorkspaceNavigationProviderProps { children: ReactNode; }
export interface WorkspaceToolProps { workspace: WorkspaceSummary; }
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
  "workspace" | "focusedProjectId" | "terminalShells" | "preferredShellId" | "terminalQuickLaunchDefaults" | "runnableGlobalTerminalPresets" | "onItemSelected" | "onFocusWorkspace" | "onLaunchWorkspaceTerminal" | "onOpenCreateTerminal" | "onOpenWorkspaceTerminalPresets"> & {
  /** Extra items shown after the new-terminal actions, such as a script launcher. */
  children?: ReactNode;
};
export interface WorkspaceTerminalTabProps { terminal: TerminalSession; selected: boolean; }

export interface WorkspaceWorktreeRowProps extends WorkspaceToolProps {
  worktree: WorktreeRecord;
  focused: boolean;
  removing: boolean;
  preferredShellId: string | null;
  pullRequestStatus: ForgeBranchPullRequestStatus | null;
}

export interface WorkspacePinState { pinned: boolean; togglePinned: () => void; }

export interface RemoveWorkspaceDialogProps { workspace: WorkspaceSummary; onConfirm: () => void; onClose: () => void; }

export interface WorkspaceManageMenuItemsProps extends WorkspaceToolProps { onItemSelected?: () => void; }

/** Dialogs the workspace actions menu opens after it closes. */
export type WorkspaceActionsDialog = "remove-workspace" | "new-worktree" | null;

export interface WorkspaceScriptMenuItemsProps extends WorkspaceToolProps { scripts: WorkspaceScriptLauncher[]; onItemSelected?: () => void; }

/** The tools a workspace offers and which of them sit in its sidebar rail. */
export interface WorkspaceToolPinsState {
  available: WorkspaceToolId[];
  pins: WorkspaceToolId[];
  togglePin(tool: WorkspaceToolId): void;
}
