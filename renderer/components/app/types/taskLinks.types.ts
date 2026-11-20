import type { WorkspaceTaskSummary } from "@shared/appTypes";

export interface TaskLinkOpenerDeps {
  listTasks(projectId: string): Promise<WorkspaceTaskSummary[]>;
  openTaskEditor(projectId: string, path: string): Promise<void>;
}
