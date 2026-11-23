import type { WorkspaceTaskSummary } from "@shared/appTypes";

export interface UpcomingTask { task: WorkspaceTaskSummary; sectionTitle: string; }
export interface UpcomingTasks { tasks: UpcomingTask[]; /** Open tasks past the limit. */ more: number; }

export interface WorkspaceHomeTasksState extends UpcomingTasks {
  loading: boolean;
  error: string | null;
  open(task: UpcomingTask): void;
  /** Starts a thread working on the task; rejects with a user-meaningful message. */
  start(task: UpcomingTask): Promise<void>;
  openBoard(): void;
}

export interface WorkspaceHomeTasksProps { projectId: string; }
