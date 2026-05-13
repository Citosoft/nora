import type { NoteListEntry, SpecListEntry, TaskListEntry } from "@/components/app/types/component.types";
import type { WorkspaceSidebarAgentContextMenuState } from "@/components/app/types/workspaceSidebarAgentContextMenu.types";
import type { WorkspaceSidebarTerminalContextMenuState } from "@/components/app/types/workspaceSidebarTerminalContextMenu.types";
import type { CreateTerminalDialogDefaults } from "@/components/app/types";
import type {
  AppState,
  CreateTerminalPayload,
  TerminalPreset,
  TerminalQuickLaunchDefaults,
  WorkspaceSummary
} from "@shared/appTypes";

export type WorkspaceSidebarContextMenusProps = {
  workspaceGroups: WorkspaceSummary[];
  focusedProjectId: string | null;
  terminalShells: AppState["terminalShells"];
  preferredShellId: string | null;
  terminalQuickLaunchDefaults: TerminalQuickLaunchDefaults;
  runnableGlobalTerminalPresets: TerminalPreset[];
  activeTaskMenu: { task: TaskListEntry; top: number; left: number } | null;
  activeSpecMenu: { spec: SpecListEntry; top: number; left: number } | null;
  activeNoteMenu: { note: NoteListEntry; top: number; left: number } | null;
  activeWorkspaceMenu: { workspaceId: string; top: number; left: number } | null;
  activeAgentMenu: WorkspaceSidebarAgentContextMenuState | null;
  activeTerminalMenu: WorkspaceSidebarTerminalContextMenuState | null;
  setActiveTaskMenu: (value: { task: TaskListEntry; top: number; left: number } | null) => void;
  setActiveSpecMenu: (value: { spec: SpecListEntry; top: number; left: number } | null) => void;
  setActiveNoteMenu: (value: { note: NoteListEntry; top: number; left: number } | null) => void;
  setActiveWorkspaceMenu: (value: { workspaceId: string; top: number; left: number } | null) => void;
  setActiveAgentMenu: (value: WorkspaceSidebarAgentContextMenuState | null) => void;
  setActiveTerminalMenu: (value: WorkspaceSidebarTerminalContextMenuState | null) => void;
  onToggleTaskComplete: (projectId: string, path: string, nextPath: string) => void | Promise<void>;
  onDeleteTask: (projectId: string, path: string) => void | Promise<void>;
  onGenerateTasksFromSpec: (projectId: string, path: string) => void;
  onDeleteSpec: (projectId: string, path: string) => void | Promise<void>;
  onDeleteNote: (projectId: string, path: string) => void | Promise<void>;
  onOpenCreateAgent: () => void;
  onFocusWorkspace: (projectId: string) => void;
  onOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  onLaunchWorkspaceTerminal: (projectId: string, payload: CreateTerminalPayload) => void;
  onOpenCreateTerminal: (defaults: CreateTerminalDialogDefaults) => void;
  onOpenWorkspaceTerminalPresets: (projectId: string) => void;
  onCreateTask: (projectId: string) => void;
  onCreateSpec: (projectId: string) => void;
  onRemoveProject: (rootPath: string) => void;
  onFocusAgent: (agentId: string) => void;
  onFocusWorkspaceAgent: (workspaceId: string, agentId: string) => void | Promise<AppState | null>;
  onRestartAgent: (agentId: string) => void | Promise<AppState | null>;
  onDestroyAgentRequest: (agentId: string) => void;
  onBeginTerminalRename: (sessionId: string, currentName: string) => void;
  onDestroyTerminal: (sessionId: string) => void | Promise<AppState | null>;
};
