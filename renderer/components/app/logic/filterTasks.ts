import type { WorkspaceTaskSummary } from "@shared/appTypes";
import type { TaskStatusFilter } from "@/components/app/types/taskCenter.types";

export function filterTasks(
  tasks: WorkspaceTaskSummary[],
  query: string,
  status: TaskStatusFilter
): WorkspaceTaskSummary[] {
  const search = query.trim().toLocaleLowerCase();
  return tasks.filter((task) => {
    const matchesStatus = status === "all" || task.completed === (status === "completed");
    return matchesStatus && (!search || `${task.title}\n${task.path}`.toLocaleLowerCase().includes(search));
  });
}
