import type { DragEvent, ReactNode } from "react";
import type { WorkspaceTaskBoardSection, WorkspaceTaskSummary } from "@shared/appTypes";
import type { TaskBoardPanelProps, TaskBoardWorkspaceEntry } from "./panel.types";

export type TaskStatusFilter = "open" | "completed" | "all";

export type TaskItemProps = {
  task: WorkspaceTaskSummary;
  assignmentCount: number;
  selected: boolean;
  selectionDisabled: boolean;
  layout: "list" | "board";
  onToggleSelection: () => void;
  onOpen: () => void;
  onToggleComplete: () => Promise<void>;
  onDelete: () => Promise<void>;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
};

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
