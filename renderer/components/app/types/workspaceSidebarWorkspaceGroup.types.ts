import type { NoteListEntry, SpecListEntry, TaskListEntry } from "@/components/app/types/component.types";
import type { CreateTerminalDialogDefaults } from "@/components/app/types";
import type { AiChatTabState } from "@/components/app/types";
import type {
  AgentSession,
  CreateTerminalPayload,
  ForgeBranchPullRequestStatus,
  TerminalPreset,
  TerminalQuickLaunchDefaults,
  TerminalSession,
  WorkspaceSummary
} from "@shared/appTypes";
import type { Dispatch, MouseEvent, SetStateAction } from "react";

export type WorkspaceSidebarWorkspaceGroupProps = {
  workspace: WorkspaceSummary;
  removingWorkspaceRootSet: Set<string>;
  projectFaviconUrlByProjectId: Record<string, string | null>;
  collapsedWorkspaceIds: Record<string, boolean>;
  onCollapsedWorkspaceIdsChange: (updater: (current: Record<string, boolean>) => Record<string, boolean>) => void;
  collapsedWorkspaceWorktreeSectionIds: Record<string, boolean>;
  collapsedWorkspaceAgentSectionIds: Record<string, boolean>;
  collapsedWorkspaceTerminalSectionIds: Record<string, boolean>;
  collapsedWorkspaceAiChatSectionIds: Record<string, boolean>;
  collapsedWorkspaceNoteSectionIds: Record<string, boolean>;
  collapsedWorkspaceSpecSectionIds: Record<string, boolean>;
  collapsedWorkspaceTaskSectionIds: Record<string, boolean>;
  toggleWorkspaceWorktreeSection: (workspaceId: string) => void;
  toggleWorkspaceAgentSection: (workspaceId: string) => void;
  toggleWorkspaceTerminalSection: (workspaceId: string) => void;
  toggleWorkspaceAiChatSection: (workspaceId: string) => void;
  toggleWorkspaceNoteSection: (workspaceId: string) => void;
  toggleWorkspaceSpecSection: (workspaceId: string) => void;
  toggleWorkspaceTaskSection: (workspaceId: string) => void;
  workspaceTasks: TaskListEntry[];
  workspaceSpecs: SpecListEntry[];
  workspaceNotes: NoteListEntry[];
  aiChatTabs: AiChatTabState[];
  focusedAiChatTabId: string | null;
  focusedBrowserTabId: string | null;
  focusedForgeViewerTabId: string | null;
  activeWorkspaceContentTab: "file" | "diff" | null;
  isTaskBoardOpen: boolean;
  isSpecBrowserOpen: boolean;
  isNoteBrowserOpen: boolean;
  isCreatingTask: boolean;
  isCreatingSpec: boolean;
  isCreatingNote: boolean;
  pullRequestStatusByWorkspaceBranch: Record<string, ForgeBranchPullRequestStatus | null>;
  agentsNeedingAttention: Record<string, boolean>;
  now: number;
  focusedAgent: AgentSession | null;
  focusedTerminal: TerminalSession | null;
  preferredShellId: string | null;
  terminalQuickLaunchDefaults: TerminalQuickLaunchDefaults;
  runnableGlobalTerminalPresets: TerminalPreset[];
  activeSessionPopoverId: string | null;
  setActiveSessionPopoverId: Dispatch<SetStateAction<string | null>>;
  openSessionPopover: (sessionId: string) => void;
  scheduleSessionPopoverClose: () => void;
  openAgentSessionMenu: (workspaceId: string, agent: AgentSession, pullRequestWebUrl: string | null, event: MouseEvent<Element>) => void;
  openTerminalSessionMenu: (workspaceId: string, terminal: TerminalSession, event: MouseEvent<Element>) => void;
  openTaskMenu: (task: TaskListEntry, event: MouseEvent<HTMLButtonElement>) => void;
  openSpecMenu: (spec: SpecListEntry, event: MouseEvent<HTMLButtonElement>) => void;
  openNoteMenu: (note: NoteListEntry, event: MouseEvent<HTMLButtonElement>) => void;
  openWorkspaceMenu: (workspaceId: string, event: MouseEvent<HTMLDivElement | HTMLButtonElement>) => void;
  onFocusWorkspace: (projectId: string) => void;
  onFocusWorkspaceView: (worktreeId: string) => void;
  onFocusWorkspaceWorktree: (workspaceId: string, worktreeId: string) => void;
  onOpenWorkflowRunChangeRequest: (projectId: string, worktreeId: string) => Promise<void>;
  onOpenCreateAgentOnWorktree: (projectId: string, worktreeId: string) => void;
  onOpenCreateTerminalOnWorktree: (projectId: string, worktreeId: string) => void;
  onOpenCreateWorktree: (projectId: string) => void;
  onLaunchQuickTerminalOnWorktree: (projectId: string, worktreeId: string) => void;
  onLaunchWorktreeScript: (projectId: string, payload: CreateTerminalPayload) => void;
  onRemoveWorktree: (projectId: string, worktreeId: string, branch: string) => void;
  onOpenCreateAgent: () => void;
  onOpenCreateTerminal: (defaults: CreateTerminalDialogDefaults) => void;
  onLaunchWorkspaceTerminal: (projectId: string, payload: CreateTerminalPayload) => void;
  onLaunchWorkspaceScript: (projectId: string, defaults: CreateTerminalDialogDefaults) => void;
  onOpenWorkspaceTerminalPresets: (projectId: string) => void;
  onOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  onFocusAgent: (agentId: string) => void;
  onFocusTerminal: (terminalId: string) => void;
  onFocusWorkspaceAgent: (workspaceId: string, agentId: string) => void;
  onFocusWorkspaceTerminal: (workspaceId: string, terminalId: string) => void;
  editingTerminalSessionId: string | null;
  editingTerminalNameDraft: string;
  onEditingTerminalNameDraftChange: (nextName: string) => void;
  onSubmitTerminalRename: (sessionId: string, currentName: string) => void;
  onCancelTerminalRename: () => void;
  onOpenTask: (projectId: string, path: string) => void;
  onCreateTask: (projectId: string) => void;
  onOpenTaskBoard: () => void;
  onOpenSpec: (projectId: string, path: string) => void;
  onCreateSpec: (projectId: string) => void;
  onOpenSpecBrowser: () => void;
  onOpenNote: (projectId: string, path: string) => void;
  onCreateNote: (projectId: string) => void;
  onOpenNoteBrowser: () => void;
  onFocusWorkspaceAiChatTab: (projectId: string, tabId: string) => void;
  onOpenAiChatFromSidebar: (projectId: string) => void;
  onRemoveProject: (rootPath: string) => void;
};
