import type { WorkspaceToolProps } from "./workspaceNavigation.types";

export interface WorkspaceSurfaceProps extends WorkspaceToolProps { active: boolean; }
export interface WorkspacePortsMenuProps { projectId: string; terminalId?: string; }
export interface WorkspaceEditorProps { projectId: string; kind: "files" | "documents"; active: boolean; }
