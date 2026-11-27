import type { DragEvent, ReactNode } from "react";
import type { WorkspaceTaskBoardSection, WorkspaceTaskSummary } from "@shared/appTypes";
import type { TaskBoardPanelProps, TaskBoardWorkspaceEntry } from "./panel.types";
import type { ActiveTaskThread } from "./taskThreads.types";

export type TaskStatusFilter = "open" | "completed" | "all";

export type TaskItemProps = {
  task: WorkspaceTaskSummary;
  /** The thread working on this task right now, if any. */
  activeThread: ActiveTaskThread | null;
  onOpenThread: (conversationId: string) => void;
  selected: boolean;
  isStartingThreads: boolean;
  layout: "list" | "board";
  onToggleSelection: () => void;
  onOpen: () => void;
  onStart: () => Promise<void>;
  onToggleComplete: () => Promise<void>;
  onDelete: () => Promise<void>;
  /** Present for open tasks in a workspace that can run workflows. */
  workflowActions: TaskWorkflowActions | null;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
};

/** What a task row needs to launch one of its workspace's saved workflows on that task. */
export type TaskWorkflowActions = {
  projectId: string;
  onRun: (definitionId: string) => void;
  onOpenWorkflows: () => void;
};

export type TaskWorkflowMenuProps = { taskTitle: string; actions: TaskWorkflowActions; disabled: boolean };
export type TaskWorkflowMenuItemsProps = { actions: TaskWorkflowActions };

export type TaskSelectionBarProps = Pick<
  TaskBoardPanelProps,
  "isStartingThreads" | "onClearTaskSelection" | "onStartSelectedThreads"
> & { selectedCount: number };

export type TaskBoardColumnProps = {
  section: WorkspaceTaskBoardSection;
  count: number;
  canDelete: boolean;
  canDrop: boolean;
  onDrop: () => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
  children: ReactNode;
};

export type TaskCenterHeaderProps = Pick<
  TaskBoardPanelProps,
  "workspaces" | "viewMode" | "onViewModeChange" | "onSelectWorkspace" | "onCreateTask" | "onClose"
> & {
  activeWorkspace: TaskBoardWorkspaceEntry | null;
  openCount: number;
  completedCount: number;
  query: string;
  status: TaskStatusFilter;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: TaskStatusFilter) => void;
  onGenerate: () => void;
};
