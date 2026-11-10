import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import type { WorkspaceSummary, RecentProject } from "@shared/appTypes";
import type { RoleSelection } from "@shared/types/personalization/roles.types";

export type WorkspaceToolId = "files" | "changes" | "documents" | "tasks" | "development" | "workflows" | "terminals" | "browser";
export interface WorkspaceToolItem { id: WorkspaceToolId; label: string; icon: LucideIcon; }
export interface SidebarPreferences { pinnedWorkspaceIds: string[]; toolPins: Record<string, WorkspaceToolId[]>; }
export interface WorkspaceToolRoute { projectId: string; tool: WorkspaceToolId; focusRevision: number; }
export interface WorkspaceNavigationValue {
  route: WorkspaceToolRoute | null;
  openTool(projectId: string, tool: WorkspaceToolId): void;
  closeTool(): void;
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
